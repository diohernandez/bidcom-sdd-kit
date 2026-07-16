import path from "node:path";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { PlanWorkflow } from "../../core/workflows/dev/PlanWorkflow.js";
import { getGitActor } from "../../utils/gitActor.js";
import { loadConfig } from "../../utils/config.js";
import { fileExists } from "../../utils/fs.js";
import {
  buildContractFromState,
  contractResult,
  nextActionForDevPhase,
  notInitializedContract,
} from "../contract.js";

export interface PlanToolInput {
  featureName: string;
}

export async function runPlanTool(
  input: PlanToolInput,
  { projectPath }: { projectPath: string },
): Promise<CallToolResult> {
  const { featureName } = input;

  let config;
  try {
    config = await loadConfig(projectPath);
  } catch {
    return notInitializedContract();
  }

  const author = getGitActor({ cwd: projectPath });
  const result = await new PlanWorkflow().execute({
    featureName,
    projectPath,
    config,
    author,
  });

  const featurePath = path.join(projectPath, config.wipPath, featureName);

  if (!result.success) {
    const contract = await buildContractFromState(featurePath, featureName);
    return contractResult(
      {
        ...contract,
        blockers: [
          ...contract.blockers,
          {
            gate: "plan",
            check: "precondition",
            detail: result.error ?? "No se pudo crear el plan",
          },
        ],
      },
      true,
    );
  }

  if (await fileExists(featurePath)) {
    return contractResult(await buildContractFromState(featurePath, featureName));
  }

  return contractResult({
    state: "funcional",
    next_action: nextActionForDevPhase("funcional", featureName),
    blockers: [],
  });
}
