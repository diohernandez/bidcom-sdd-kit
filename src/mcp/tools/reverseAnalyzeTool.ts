import path from "node:path";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StackPhase } from "../../core/workflows/reverse/phases/StackPhase.js";
import { ArchitecturePhase } from "../../core/workflows/reverse/phases/ArchitecturePhase.js";
import { IntegrationPhase } from "../../core/workflows/reverse/phases/IntegrationPhase.js";
import { ComponentsPhase } from "../../core/workflows/reverse/phases/ComponentsPhase.js";
import { DataFlowPhase } from "../../core/workflows/reverse/phases/DataFlowPhase.js";
import { TestingPhase } from "../../core/workflows/reverse/phases/TestingPhase.js";
import { fileExists } from "../../utils/fs.js";
import { getGitActor } from "../../utils/gitActor.js";
import { loadConfig } from "../../utils/config.js";
import { contractResult, notInitializedContract } from "../contract.js";
import type { PhaseResult } from "../../types/workflow.js";
import type { Language } from "../../types/stack.js";

export type ReverseAnalyzePhase =
  | "stack"
  | "architecture"
  | "integration"
  | "components"
  | "data-flow"
  | "testing";

export interface ReverseAnalyzeToolInput {
  phase: ReverseAnalyzePhase;
  projectName: string;
}

interface AnalysisPhase {
  execute(options: {
    projectName: string;
    projectPath: string;
    reversePath: string;
    analyst: string;
    stackLanguage: Language;
  }): Promise<PhaseResult>;
}

const PHASE_CLASSES: Record<ReverseAnalyzePhase, new () => AnalysisPhase> = {
  stack: StackPhase,
  architecture: ArchitecturePhase,
  integration: IntegrationPhase,
  components: ComponentsPhase,
  "data-flow": DataFlowPhase,
  testing: TestingPhase,
};

export async function runReverseAnalyzeTool(
  input: ReverseAnalyzeToolInput,
  { projectPath }: { projectPath: string },
): Promise<CallToolResult> {
  const { phase, projectName } = input;

  let config;
  try {
    config = await loadConfig(projectPath);
  } catch {
    return notInitializedContract();
  }

  const PhaseClass = PHASE_CLASSES[phase];
  const reversePath = path.join(projectPath, config.reversePath, projectName);

  if (!(await fileExists(reversePath))) {
    return contractResult(
      {
        state: "unknown",
        next_action: {
          command: `sdd reverse init ${projectName}`,
          description: "Inicializar el proyecto de reverse engineering",
        },
        blockers: [
          {
            gate: "reverse",
            check: "precondition",
            detail: `El proyecto "${projectName}" no existe`,
          },
        ],
      },
      true,
    );
  }

  const analyst = getGitActor({ cwd: projectPath }).name;
  const result = await new PhaseClass().execute({
    projectName,
    projectPath,
    reversePath,
    analyst,
    stackLanguage: config.stack.language,
  });

  if (!result.success) {
    return contractResult(
      {
        state: phase,
        next_action: null,
        blockers: [
          {
            gate: "reverse",
            check: phase,
            detail: result.error ?? `No se pudo completar la fase "${phase}"`,
          },
        ],
      },
      true,
    );
  }

  return contractResult({
    state: phase,
    next_action: {
      command: `sdd reverse status --project ${projectName}`,
      description: "Ver el estado del análisis",
    },
    blockers: [],
  });
}
