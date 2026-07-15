import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { BuildWorkflow } from "../../core/workflows/dev/BuildWorkflow.js";
import { loadConfig } from "../../utils/config.js";
import {
  contractResult,
  nextActionForDevPhase,
  notInitializedContract,
} from "../contract.js";

export interface BuildToolInput {
  featureName: string;
}

export async function runBuildTool(
  input: BuildToolInput,
  { projectPath }: { projectPath: string },
): Promise<CallToolResult> {
  const { featureName } = input;

  let config;
  try {
    config = await loadConfig(projectPath);
  } catch {
    return notInitializedContract();
  }

  const result = await new BuildWorkflow().execute({
    featureName,
    projectPath,
    config,
  });

  if (!result.success) {
    return contractResult(
      {
        state: result.phase ?? "unknown",
        next_action: nextActionForDevPhase(result.phase, featureName),
        blockers: [
          {
            gate: "build",
            check: "precondition",
            detail:
              result.error ?? "El feature no está listo para implementación",
          },
        ],
      },
      true,
    );
  }

  return contractResult({
    state: "impl",
    next_action: nextActionForDevPhase("impl", featureName),
    blockers: [],
  });
}
