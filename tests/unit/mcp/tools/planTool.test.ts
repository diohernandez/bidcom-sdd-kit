import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { InitWorkflow } from "../../../../src/core/workflows/dev/InitWorkflow.js";
import { runPlanTool } from "../../../../src/mcp/tools/planTool.js";

function parseContract(result: Awaited<ReturnType<typeof runPlanTool>>) {
  const [content] = result.content as Array<{ type: "text"; text: string }>;
  return JSON.parse(content.text);
}

describe("runPlanTool", () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "sdd-kit-mcp-plan-"));
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("returns the not-initialized contract when the project has no .sdd/config.yml", async () => {
    const result = await runPlanTool(
      { featureName: "checkout-flow" },
      { projectPath },
    );

    expect(result.isError).toBe(true);
    expect(parseContract(result).blockers[0].check).toBe("initialized");
  });

  it("creates the feature and returns the funcional-phase contract", async () => {
    await new InitWorkflow().execute({ projectPath });

    const result = await runPlanTool(
      { featureName: "checkout-flow" },
      { projectPath },
    );
    const contract = parseContract(result);

    expect(result.isError).toBe(false);
    expect(contract).toEqual({
      state: "funcional",
      next_action: {
        command: "sdd validate checkout-flow",
        description: "Validar la especificación funcional",
      },
      blockers: [],
    });
    expect(
      await fs.pathExists(
        path.join(projectPath, ".sdd", "wip", "checkout-flow", "meta.md"),
      ),
    ).toBe(true);
  });

  it("reports a blocker with the existing state when the feature already exists", async () => {
    await new InitWorkflow().execute({ projectPath });
    await runPlanTool({ featureName: "checkout-flow" }, { projectPath });

    const result = await runPlanTool(
      { featureName: "checkout-flow" },
      { projectPath },
    );
    const contract = parseContract(result);

    expect(result.isError).toBe(true);
    expect(contract.state).toBe("funcional");
    expect(contract.blockers).toEqual([
      {
        gate: "plan",
        check: "precondition",
        detail: expect.stringContaining("ya existe"),
      },
    ]);
  });
});
