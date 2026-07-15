import path from "node:path";
import fs from "fs-extra";
import { TemplateLoader } from "../../../../services/templates/TemplateLoader.js";
import { TemplateRenderer } from "../../../../services/templates/TemplateRenderer.js";
import type { Language } from "../../../../types/stack.js";
import type { PhaseResult } from "../../../../types/workflow.js";
import { analyzeDataFlow } from "./dataFlowAnalysis.js";

export interface DataFlowPhaseOptions {
  projectName: string;
  projectPath: string;
  reversePath: string;
  analyst: string;
  stackLanguage: Language;
  analysisDate?: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class DataFlowPhase {
  constructor(
    private readonly templateLoader: TemplateLoader = new TemplateLoader(),
    private readonly templateRenderer: TemplateRenderer = new TemplateRenderer(),
  ) {}

  async execute(options: DataFlowPhaseOptions): Promise<PhaseResult> {
    const { projectName, projectPath, reversePath, analyst, stackLanguage } =
      options;
    const analysisDate = options.analysisDate ?? today();

    const analysis = await analyzeDataFlow(projectPath);

    const variables = {
      projectName,
      analysisDate,
      analyst,
      overview: analysis.overview,
      apiAnalysis: analysis.apiAnalysis,
      stateAnalysis: analysis.stateAnalysis,
      errorAnalysis: analysis.errorAnalysis,
      envAnalysis: analysis.envAnalysis,
      cacheAnalysis: analysis.cacheAnalysis,
      dataflowDiagram: analysis.dataflowDiagram,
    };

    const stackFolder = this.templateLoader.resolveStackFolder(stackLanguage);
    const template = await this.templateLoader.load(
      stackFolder,
      "reverse/data-flow",
    );
    const rendered = this.templateRenderer.render(template, variables);

    const outputPath = path.join(reversePath, "5-data-flow", "general.md");
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, rendered);

    return {
      success: true,
      outputPath,
      summary: analysis.overview,
    };
  }
}
