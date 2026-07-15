import path from "node:path";
import fs from "fs-extra";
import { TemplateLoader } from "../../../../services/templates/TemplateLoader.js";
import { TemplateRenderer } from "../../../../services/templates/TemplateRenderer.js";
import type { Language } from "../../../../types/stack.js";
import type { PhaseResult } from "../../../../types/workflow.js";
import {
  analyzeArchitecture,
  buildArchitectureOverview,
} from "./architectureAnalysis.js";
import { renderTableRows } from "./stackAnalysis.js";

export interface ArchitecturePhaseOptions {
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

export class ArchitecturePhase {
  constructor(
    private readonly templateLoader: TemplateLoader = new TemplateLoader(),
    private readonly templateRenderer: TemplateRenderer = new TemplateRenderer(),
  ) {}

  async execute(options: ArchitecturePhaseOptions): Promise<PhaseResult> {
    const { projectName, projectPath, reversePath, analyst, stackLanguage } =
      options;
    const analysisDate = options.analysisDate ?? today();

    const analysis = await analyzeArchitecture(projectPath);
    const overview = buildArchitectureOverview(analysis);

    const variables = {
      projectName,
      analysisDate,
      analyst,
      layerConvention: analysis.layerConvention,
      overview,
      directoryStructure: analysis.directoryStructure,
      layerAnalysis: analysis.layerAnalysis,
      patternsFactsTable: renderTableRows(analysis.patternsFactsRows),
      tsConfigAnalysis: analysis.tsConfigAnalysis,
      notes: analysis.notes.join("\n"),
    };

    const stackFolder = this.templateLoader.resolveStackFolder(stackLanguage);
    const template = await this.templateLoader.load(
      stackFolder,
      "reverse/architecture",
    );
    const rendered = this.templateRenderer.render(template, variables);

    const outputPath = path.join(
      reversePath,
      "2-architecture",
      "architecture.md",
    );
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, rendered);

    return {
      success: true,
      outputPath,
      summary: `Convención de capas detectada: ${analysis.layerConvention}`,
    };
  }
}
