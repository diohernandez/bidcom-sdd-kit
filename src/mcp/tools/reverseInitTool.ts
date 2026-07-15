import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ReverseWorkflow } from "../../core/workflows/reverse/ReverseWorkflow.js";
import { getGitActor } from "../../utils/gitActor.js";
import { loadConfig } from "../../utils/config.js";
import { contractResult, notInitializedContract } from "../contract.js";

export interface ReverseInitToolInput {
  projectName: string;
}

export async function runReverseInitTool(
  input: ReverseInitToolInput,
  { projectPath }: { projectPath: string },
): Promise<CallToolResult> {
  const { projectName } = input;

  let config;
  try {
    config = await loadConfig(projectPath);
  } catch {
    return notInitializedContract();
  }

  const author = getGitActor({ cwd: projectPath });
  const result = await new ReverseWorkflow().execute({
    projectName,
    projectPath,
    config,
    author,
  });

  if (!result.success) {
    return contractResult(
      {
        state: "unknown",
        next_action: null,
        blockers: [
          {
            gate: "reverse",
            check: "precondition",
            detail:
              result.error ??
              "No se pudo inicializar el proyecto de reverse engineering",
          },
        ],
      },
      true,
    );
  }

  return contractResult({
    state: "constitution",
    next_action: {
      command: `sdd reverse analyze stack --project ${projectName}`,
      description: "Analizar el stack tecnológico",
    },
    blockers: [],
  });
}
