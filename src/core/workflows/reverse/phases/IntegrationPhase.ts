import path from "node:path";
import fs from "fs-extra";
import { TemplateLoader } from "../../../../services/templates/TemplateLoader.js";
import { TemplateRenderer } from "../../../../services/templates/TemplateRenderer.js";
import type { Language } from "../../../../types/stack.js";
import type { PhaseResult } from "../../../../types/workflow.js";
import { analyzeIntegration } from "./integrationAnalysis.js";

export interface IntegrationPhaseOptions {
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

export class IntegrationPhase {
  constructor(
    private readonly templateLoader: TemplateLoader = new TemplateLoader(),
    private readonly templateRenderer: TemplateRenderer = new TemplateRenderer(),
  ) {}

  async execute(options: IntegrationPhaseOptions): Promise<PhaseResult> {
    const { projectName, projectPath, reversePath, analyst, stackLanguage } =
      options;
    const analysisDate = options.analysisDate ?? today();

    const analysis = await analyzeIntegration(projectPath);

    const variables = {
      projectName,
      analysisDate,
      analyst,
      overview: analysis.overview,
      nextjsAnalysis: analysis.nextjsAnalysis,
      astroAnalysis: analysis.astroAnalysis,
      widgetsList: analysis.widgetsList,
      hydrationAnalysis: analysis.hydrationAnalysis,
      sharedComponentsAnalysis: analysis.sharedComponentsAnalysis,
      microfrontendAnalysis: analysis.microfrontendAnalysis,
      notes: analysis.notes.join("\n"),
    };

    const stackFolder = this.templateLoader.resolveStackFolder(stackLanguage);
    const template = await this.templateLoader.load(
      stackFolder,
      "reverse/integration",
    );
    const rendered = this.templateRenderer.render(template, variables);

    const outputPath = path.join(
      reversePath,
      "3-integration",
      "integration.md",
    );
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, rendered);

    return {
      success: true,
      outputPath,
      summary: `Frameworks detectados: ${analysis.detectedFrameworks.join(", ") || "ninguno"}`,
    };
  }
}
