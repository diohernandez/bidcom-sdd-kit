import path from "node:path";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ApproveWorkflow } from "../../core/workflows/dev/ApproveWorkflow.js";
import { getGitActor } from "../../utils/gitActor.js";
import { loadConfig } from "../../utils/config.js";
import {
  buildContractFromState,
  contractResult,
  notInitializedContract,
} from "../contract.js";

export interface ApproveToolInput {
  featureName: string;
}

export async function runApproveTool(
  input: ApproveToolInput,
  { projectPath }: { projectPath: string },
): Promise<CallToolResult> {
  const { featureName } = input;

  let config;
  try {
    config = await loadConfig(projectPath);
  } catch {
    return notInitializedContract();
  }

  const actor = getGitActor({ cwd: projectPath });
  const result = await new ApproveWorkflow().execute({
    featureName,
    projectPath,
    config,
    actor: actor.name,
    email: actor.email,
  });

  const featurePath = path.join(projectPath, config.wipPath, featureName);
  const contract = await buildContractFromState(featurePath, featureName);

  if (!result.success) {
    return contractResult(
      {
        ...contract,
        blockers: [
          ...contract.blockers,
          {
            gate: "approve",
            check: "precondition",
            detail: result.error ?? "No se pudo aprobar el feature",
          },
        ],
      },
      true,
    );
  }

  return contractResult(contract);
}
