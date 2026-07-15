import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { InitWorkflow } from "../../../../src/core/workflows/dev/InitWorkflow.js";
import { ReverseWorkflow } from "../../../../src/core/workflows/reverse/ReverseWorkflow.js";
import { runReverseAnalyzeTool } from "../../../../src/mcp/tools/reverseAnalyzeTool.js";
import { getGitActor } from "../../../../src/utils/gitActor.js";
import { loadConfig } from "../../../../src/utils/config.js";

function parseContract(
  result: Awaited<ReturnType<typeof runReverseAnalyzeTool>>,
) {
  const [content] = result.content as Array<{ type: "text"; text: string }>;
  return JSON.parse(content.text);
}

describe("runReverseAnalyzeTool", () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-mcp-reverse-analyze-"),
    );
    await fs.writeJson(path.join(projectPath, "package.json"), {
      dependencies: { next: "^15.0.0" },
    });
    await new InitWorkflow().execute({ projectPath });
    const config = await loadConfig(projectPath);
    await new ReverseWorkflow().execute({
      projectName: "legacy-app",
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
      path.join(os.tmpdir(), "sdd-kit-mcp-reverse-analyze-bare-"),
    );
    const result = await runReverseAnalyzeTool(
      { phase: "stack", projectName: "legacy-app" },
      { projectPath: bareProjectPath },
    );
    await fs.remove(bareProjectPath);

    expect(result.isError).toBe(true);
    expect(parseContract(result).blockers[0].check).toBe("initialized");
  });

  it("blocks with a precondition when the reverse project does not exist", async () => {
    const result = await runReverseAnalyzeTool(
      { phase: "stack", projectName: "missing-app" },
      { projectPath },
    );
    const contract = parseContract(result);

    expect(result.isError).toBe(true);
    expect(contract.next_action).toEqual({
      command: "sdd reverse init missing-app",
      description: "Inicializar el proyecto de reverse engineering",
    });
    expect(contract.blockers).toEqual([
      {
        gate: "reverse",
        check: "precondition",
        detail: expect.stringContaining("no existe"),
      },
    ]);
  });

  it("runs the stack phase and returns the phase contract with a status next action", async () => {
    const result = await runReverseAnalyzeTool(
      { phase: "stack", projectName: "legacy-app" },
      { projectPath },
    );
    const contract = parseContract(result);

    expect(result.isError).toBe(false);
    expect(contract).toEqual({
      state: "stack",
      next_action: {
        command: "sdd reverse status --project legacy-app",
        description: "Ver el estado del análisis",
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
          "1-spec",
          "spec.md",
        ),
      ),
    ).toBe(true);
  });
});
