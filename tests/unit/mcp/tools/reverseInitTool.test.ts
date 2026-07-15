import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { InitWorkflow } from "../../../../src/core/workflows/dev/InitWorkflow.js";
import { runReverseInitTool } from "../../../../src/mcp/tools/reverseInitTool.js";

function parseContract(result: Awaited<ReturnType<typeof runReverseInitTool>>) {
  const [content] = result.content as Array<{ type: "text"; text: string }>;
  return JSON.parse(content.text);
}

describe("runReverseInitTool", () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-mcp-reverse-init-"),
    );
    await fs.writeJson(path.join(projectPath, "package.json"), {
      dependencies: { next: "^15.0.0" },
    });
    await new InitWorkflow().execute({ projectPath });
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("returns the not-initialized contract when the project has no config", async () => {
    const bareProjectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-mcp-reverse-init-bare-"),
    );
    const result = await runReverseInitTool(
      { projectName: "legacy-app" },
      { projectPath: bareProjectPath },
    );
    await fs.remove(bareProjectPath);

    expect(result.isError).toBe(true);
    expect(parseContract(result).blockers[0].check).toBe("initialized");
  });

  it("creates the reverse project and returns the constitution-phase contract", async () => {
    const result = await runReverseInitTool(
      { projectName: "legacy-app" },
      { projectPath },
    );
    const contract = parseContract(result);

    expect(result.isError).toBe(false);
    expect(contract).toEqual({
      state: "constitution",
      next_action: {
        command: "sdd reverse analyze stack --project legacy-app",
        description: "Analizar el stack tecnológico",
      },
      blockers: [],
    });
    expect(
      await fs.pathExists(
        path.join(
          projectPath,
          ".sdd",
          "reverse",
          "legacy-app",
          "constitution.md",
        ),
      ),
    ).toBe(true);
  });

  it("reports a blocker when the reverse project already exists", async () => {
    await runReverseInitTool({ projectName: "legacy-app" }, { projectPath });

    const result = await runReverseInitTool(
      { projectName: "legacy-app" },
      { projectPath },
    );
    const contract = parseContract(result);

    expect(result.isError).toBe(true);
    expect(contract.blockers).toEqual([
      {
        gate: "reverse",
        check: "precondition",
        detail: expect.stringContaining("ya existe"),
      },
    ]);
  });
});
