import path from "node:path";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { analyzeFeature } from "../../core/analyze/Analyzer.js";
import { loadConfig } from "../../utils/config.js";
import {
  buildContractFromState,
  contractResult,
  notInitializedContract,
} from "../contract.js";

export interface AnalyzeToolInput {
  featureName: string;
}

export async function runAnalyzeTool(
  input: AnalyzeToolInput,
  { projectPath }: { projectPath: string },
): Promise<CallToolResult> {
  const { featureName } = input;

  let config;
  try {
    config = await loadConfig(projectPath);
  } catch {
    return notInitializedContract();
  }

  const report = await analyzeFeature({
    featureName,
    projectPath,
    wipPath: config.wipPath,
    specsPath: config.specsPath,
  });

  const featurePath = path.join(projectPath, config.wipPath, featureName);
  const contract = await buildContractFromState(featurePath, featureName);

  return contractResult(
    {
      ...contract,
      blockers: [
        ...contract.blockers,
        ...report.issues.map((issue) => ({
          gate: "analyze",
          check: issue.type,
          detail: issue.detail,
        })),
      ],
    },
    !report.valid,
  );
}
