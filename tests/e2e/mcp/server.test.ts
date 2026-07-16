import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createSddMcpServer } from "../../../src/mcp/server.js";
import { InitWorkflow } from "../../../src/core/workflows/dev/InitWorkflow.js";

function parseTextContent(result: { content?: unknown }): unknown {
  const content = result.content as Array<{ type: string; text?: string }>;
  const [entry] = content;
  return JSON.parse(entry.text ?? "{}");
}

describe("sdd-kit MCP server (in-process, InMemoryTransport)", () => {
  let projectPath: string;
  let client: Client;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-mcp-server-e2e-"),
    );
    await fs.writeJson(path.join(projectPath, "package.json"), {
      dependencies: { next: "^15.0.0" },
    });
    await new InitWorkflow().execute({ projectPath });

    const server = createSddMcpServer({ projectPath });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    client = new Client({ name: "test-client", version: "1.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterEach(async () => {
    await client.close();
    await fs.remove(projectPath);
  });

  it("lists the authoritative dev/reverse tools (status reads stay resources, not tools)", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name).sort();

    expect(names).toEqual([
      "sdd_analyze",
      "sdd_approve",
      "sdd_build",
      "sdd_done",
      "sdd_plan",
      "sdd_reverse_analyze",
      "sdd_reverse_init",
      "sdd_specs_search",
      "sdd_validate",
    ]);
  });

  it("drives sdd_plan -> sdd_validate -> sdd_build over the tool protocol", async () => {
    const planResult = await client.callTool({
      name: "sdd_plan",
      arguments: { featureName: "checkout-flow" },
    });
    expect(planResult.isError).toBe(false);
    expect(parseTextContent(planResult)).toMatchObject({ state: "funcional" });

    const validateResult = await client.callTool({
      name: "sdd_validate",
      arguments: { featureName: "checkout-flow" },
    });
    expect(validateResult.isError).toBe(true);
    expect(
      (parseTextContent(validateResult) as { blockers: unknown[] }).blockers
        .length,
    ).toBeGreaterThan(0);

    const buildResult = await client.callTool({
      name: "sdd_build",
      arguments: { featureName: "checkout-flow" },
    });
    expect(buildResult.isError).toBe(true);
    expect(parseTextContent(buildResult)).toMatchObject({ state: "funcional" });
  });

  it("drives sdd_reverse_init -> sdd_reverse_analyze over the tool protocol", async () => {
    const initResult = await client.callTool({
      name: "sdd_reverse_init",
      arguments: { projectName: "legacy-app" },
    });
    expect(initResult.isError).toBe(false);

    const analyzeResult = await client.callTool({
      name: "sdd_reverse_analyze",
      arguments: { phase: "stack", projectName: "legacy-app" },
    });
    expect(analyzeResult.isError).toBe(false);
    expect(parseTextContent(analyzeResult)).toMatchObject({ state: "stack" });
  });

  it("drives sdd_plan -> sdd_analyze -> sdd_approve workflow", async () => {
    const planResult = await client.callTool({
      name: "sdd_plan",
      arguments: { featureName: "checkout-flow" },
    });
    expect(planResult.isError).toBe(false);

    const featurePath = path.join(
      projectPath,
      ".sdd",
      "wip",
      "checkout-flow",
    );
    await fs.ensureDir(path.join(featurePath, "delta"));
    await fs.writeFile(
      path.join(featurePath, "delta", "header.md"),
      [
        "---",
        "type: capability-delta",
        "capability: header",
        "change_ref: checkout-flow",
        "---",
        "",
        "## ADDED Requirements",
        "",
        "#### Requirement: R-001 — Buscador",
        "El buscador debe funcionar.",
        "",
      ].join("\n"),
    );

    const analyzeResult = await client.callTool({
      name: "sdd_analyze",
      arguments: { featureName: "checkout-flow" },
    });
    expect(analyzeResult.isError).toBe(true);
    expect(
      (parseTextContent(analyzeResult) as { blockers: unknown[] }).blockers
        .length,
    ).toBeGreaterThan(0);

    const statePath = path.join(featurePath, "state.json");
    const state = await fs.readJson(statePath);
    state.state = "tasks";
    state.last_updated = new Date().toISOString();
    await fs.writeJson(statePath, state, { spaces: 2 });

    const approveResult = await client.callTool({
      name: "sdd_approve",
      arguments: { featureName: "checkout-flow" },
    });
    expect(approveResult.isError).toBe(false);
    expect(parseTextContent(approveResult)).toMatchObject({ state: "impl" });
  });

  it("reads sdd://status with the aggregated feature list", async () => {
    await client.callTool({
      name: "sdd_plan",
      arguments: { featureName: "checkout-flow" },
    });

    const { contents } = await client.readResource({ uri: "sdd://status" });
    const parsed = JSON.parse((contents[0] as { text: string }).text);

    expect(parsed.success).toBe(true);
    expect(parsed.features).toEqual([
      expect.objectContaining({
        featureName: "checkout-flow",
        state: "funcional",
      }),
    ]);
  });

  it("reads sdd://reverse/{name} with a single reverse project status", async () => {
    await client.callTool({
      name: "sdd_reverse_init",
      arguments: { projectName: "legacy-app" },
    });

    const { contents } = await client.readResource({
      uri: "sdd://reverse/legacy-app",
    });
    const parsed = JSON.parse((contents[0] as { text: string }).text);

    expect(parsed.success).toBe(true);
    expect(parsed.project.summary).toEqual(
      expect.objectContaining({
        projectName: "legacy-app",
        state: "constitution",
      }),
    );
  });
});
