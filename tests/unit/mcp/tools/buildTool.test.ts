import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { InitWorkflow } from "../../../../src/core/workflows/dev/InitWorkflow.js";
import { PlanWorkflow } from "../../../../src/core/workflows/dev/PlanWorkflow.js";
import { runBuildTool } from "../../../../src/mcp/tools/buildTool.js";
import { getGitActor } from "../../../../src/utils/gitActor.js";
import { loadConfig } from "../../../../src/utils/config.js";

function parseContract(result: Awaited<ReturnType<typeof runBuildTool>>) {
  const [content] = result.content as Array<{ type: "text"; text: string }>;
  return JSON.parse(content.text);
}

async function forcePhase(
  projectPath: string,
  featureName: string,
  phase: string,
): Promise<void> {
  const metaPath = path.join(
    projectPath,
    ".sdd",
    "wip",
    featureName,
    "meta.md",
  );
  const meta = await fs.readFile(metaPath, "utf-8");
  await fs.writeFile(
    metaPath,
    meta.replace(/state: "funcional"/, `state: "${phase}"`),
  );
}

describe("runBuildTool", () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-mcp-build-"),
    );
    await new InitWorkflow().execute({ projectPath });
    const config = await loadConfig(projectPath);
    await new PlanWorkflow().execute({
      featureName: "checkout-flow",
      projectPath,
      config,
      author: getGitActor({ cwd: projectPath }),
    });
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("returns the not-initialized contract when the project has no config", async () => {
    const bareProjectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-mcp-build-bare-"),
    );
    const result = await runBuildTool(
      { featureName: "checkout-flow" },
      { projectPath: bareProjectPath },
    );
    await fs.remove(bareProjectPath);

    expect(result.isError).toBe(true);
    expect(parseContract(result).blockers[0].check).toBe("initialized");
  });

  it("blocks with the funcional next action when the feature is not in impl phase yet", async () => {
    const result = await runBuildTool(
      { featureName: "checkout-flow" },
      { projectPath },
    );
    const contract = parseContract(result);

    expect(result.isError).toBe(true);
    expect(contract.state).toBe("funcional");
    expect(contract.next_action).toEqual({
      command: "sdd validate checkout-flow",
      description: "Validar la especificación funcional",
    });
    expect(contract.blockers).toEqual([
      { gate: "build", check: "precondition", detail: expect.any(String) },
    ]);
  });

  it("succeeds once the feature reaches the impl phase", async () => {
    await forcePhase(projectPath, "checkout-flow", "impl");

    const result = await runBuildTool(
      { featureName: "checkout-flow" },
      { projectPath },
    );
    const contract = parseContract(result);

    expect(result.isError).toBe(false);
    expect(contract).toEqual({
      state: "impl",
      next_action: {
        command: "sdd build checkout-flow",
        description: "Implementar siguiendo TDD y correr sdd validate",
      },
      blockers: [],
    });
  });
});
