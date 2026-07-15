import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { InitWorkflow } from "../../../../src/core/workflows/dev/InitWorkflow.js";
import { PlanWorkflow } from "../../../../src/core/workflows/dev/PlanWorkflow.js";
import { runValidateTool } from "../../../../src/mcp/tools/validateTool.js";
import { getGitActor } from "../../../../src/utils/gitActor.js";
import { loadConfig } from "../../../../src/utils/config.js";
import { renderMetaMd } from "../../../../src/core/state/index.js";
import type { StateData } from "../../../../src/core/state/types.js";

function parseContract(result: Awaited<ReturnType<typeof runValidateTool>>) {
  const [content] = result.content as Array<{ type: "text"; text: string }>;
  return JSON.parse(content.text);
}

async function forcePhase(
  projectPath: string,
  featureName: string,
  phase: string,
): Promise<void> {
  const featurePath = path.join(projectPath, ".sdd", "wip", featureName);
  const statePath = path.join(featurePath, "state.json");
  const data = (await fs.readJson(statePath)) as StateData;
  data.state = phase;
  data.last_updated = new Date().toISOString();
  await fs.writeJson(statePath, data, { spaces: 2 });
  await renderMetaMd(featurePath);
}

describe("runValidateTool", () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-mcp-validate-"),
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
      path.join(os.tmpdir(), "sdd-kit-mcp-validate-bare-"),
    );
    const result = await runValidateTool(
      { featureName: "checkout-flow" },
      { projectPath: bareProjectPath },
    );
    await fs.remove(bareProjectPath);

    expect(result.isError).toBe(true);
    expect(parseContract(result).blockers[0].check).toBe("initialized");
  });

  it("maps failing checks to blockers for a freshly planned (placeholder-full) feature", async () => {
    const result = await runValidateTool(
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
    expect(contract.blockers.length).toBeGreaterThan(0);
    expect(contract.blockers[0]).toEqual({
      gate: "funcional",
      check: expect.any(String),
      detail: expect.any(String),
    });
  });

  it("reports a build blocker when the implementation gate fails", async () => {
    await forcePhase(projectPath, "checkout-flow", "impl");

    const result = await runValidateTool(
      { featureName: "checkout-flow" },
      { projectPath },
    );
    const contract = parseContract(result);

    expect(result.isError).toBe(true);
    expect(contract.state).toBe("impl");
    expect(contract.blockers).toEqual([
      {
        gate: "impl",
        check: "build",
        detail: expect.stringContaining("No se detectó un script de build"),
      },
    ]);
  });
});
