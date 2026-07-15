import path from "node:path";
import fs from "fs-extra";
import { TemplateLoader } from "../../../../services/templates/TemplateLoader.js";
import { TemplateRenderer } from "../../../../services/templates/TemplateRenderer.js";
import type { Language } from "../../../../types/stack.js";
import type { PhaseResult } from "../../../../types/workflow.js";
import { analyzeComponents } from "./componentsAnalysis.js";

export interface ComponentsPhaseOptions {
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

export class ComponentsPhase {
  constructor(
    private readonly templateLoader: TemplateLoader = new TemplateLoader(),
    private readonly templateRenderer: TemplateRenderer = new TemplateRenderer(),
  ) {}

  async execute(options: ComponentsPhaseOptions): Promise<PhaseResult> {
    const { projectName, projectPath, reversePath, analyst, stackLanguage } =
      options;
    const analysisDate = options.analysisDate ?? today();

    const analysis = await analyzeComponents(projectPath);

    const variables = {
      projectName,
      analysisDate,
      analyst,
      overview: analysis.overview,
      uiComponentsList: analysis.uiComponentsList,
      domainComponentsList: analysis.domainComponentsList,
      patternsAnalysis: analysis.patternsAnalysis,
      iconsAnalysis: analysis.iconsAnalysis,
      storybookAnalysis: analysis.storybookAnalysis,
      testingAnalysis: analysis.testingAnalysis,
    };

    const stackFolder = this.templateLoader.resolveStackFolder(stackLanguage);
    const template = await this.templateLoader.load(
      stackFolder,
      "reverse/components",
    );
    const rendered = this.templateRenderer.render(template, variables);

    const outputPath = path.join(reversePath, "4-components", "structure.md");
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, rendered);

    return {
      success: true,
      outputPath,
      summary: analysis.overview,
    };
  }
}
