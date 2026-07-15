import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ValidateWorkflow } from "../../core/workflows/dev/ValidateWorkflow.js";
import { loadConfig } from "../../utils/config.js";
import {
  contractResult,
  nextActionForDevPhase,
  notInitializedContract,
} from "../contract.js";
import type { ToolBlocker } from "../contract.js";

export interface ValidateToolInput {
  featureName: string;
}

export async function runValidateTool(
  input: ValidateToolInput,
  { projectPath }: { projectPath: string },
): Promise<CallToolResult> {
  const { featureName } = input;

  let config;
  try {
    config = await loadConfig(projectPath);
  } catch {
    return notInitializedContract();
  }

  const result = await new ValidateWorkflow().execute({
    featureName,
    projectPath,
    config,
  });

  const blockers: ToolBlocker[] = (result.checks ?? [])
    .filter((check) => !check.passed)
    .map((check) => ({
      gate: result.phase ?? "unknown",
      check: check.name,
      detail: check.detail ?? "No pasó la validación",
    }));

  if (result.error) {
    blockers.push({
      gate: result.phase ?? "unknown",
      check: "precondition",
      detail: result.error,
    });
  }

  return contractResult(
    {
      state: result.phase ?? "unknown",
      next_action: nextActionForDevPhase(result.phase, featureName),
      blockers,
    },
    !result.success,
  );
}
