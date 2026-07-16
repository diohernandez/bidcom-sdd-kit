import path from "node:path";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { DoneWorkflow } from "../../core/workflows/dev/DoneWorkflow.js";
import { loadConfig } from "../../utils/config.js";
import {
  buildContractFromState,
  contractResult,
  nextActionForDevPhase,
  notInitializedContract,
} from "../contract.js";

export interface DoneToolInput {
  featureName: string;
}

export async function runDoneTool(
  input: DoneToolInput,
  { projectPath }: { projectPath: string },
): Promise<CallToolResult> {
  const { featureName } = input;

  let config;
  try {
    config = await loadConfig(projectPath);
  } catch {
    return notInitializedContract();
  }

  const result = await new DoneWorkflow().execute({
    featureName,
    projectPath,
    config,
  });

  if (!result.success) {
    const featurePath = path.join(projectPath, config.wipPath, featureName);
    const contract = await buildContractFromState(featurePath, featureName);
    return contractResult(
      {
        ...contract,
        blockers: [
          ...contract.blockers,
          {
            gate: "done",
            check: "precondition",
            detail: result.error ?? "No se pudo cerrar el feature",
          },
        ],
      },
      true,
    );
  }

  return contractResult({
    state: "done",
    next_action: nextActionForDevPhase("done", featureName),
    blockers: [],
  });
}
