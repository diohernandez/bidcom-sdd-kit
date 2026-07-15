import path from "node:path";
import fs from "fs-extra";
import { TemplateLoader } from "../../../../services/templates/TemplateLoader.js";
import { TemplateRenderer } from "../../../../services/templates/TemplateRenderer.js";
import type { Language } from "../../../../types/stack.js";
import type { PhaseResult } from "../../../../types/workflow.js";
import { analyzeTesting } from "./testingAnalysis.js";

export interface TestingPhaseOptions {
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

export class TestingPhase {
  constructor(
    private readonly templateLoader: TemplateLoader = new TemplateLoader(),
    private readonly templateRenderer: TemplateRenderer = new TemplateRenderer(),
  ) {}

  async execute(options: TestingPhaseOptions): Promise<PhaseResult> {
    const { projectName, projectPath, reversePath, analyst, stackLanguage } =
      options;
    const analysisDate = options.analysisDate ?? today();

    const analysis = await analyzeTesting(projectPath);

    const variables = {
      projectName,
      analysisDate,
      analyst,
      overview: analysis.overview,
      e2eTestCount: analysis.e2eTestCount,
      componentTestCount: analysis.componentTestCount,
      unitTestCount: analysis.unitTestCount,
      jestAnalysis: analysis.jestAnalysis,
      rtlAnalysis: analysis.rtlAnalysis,
      cypressAnalysis: analysis.cypressAnalysis,
      storybookAnalysis: analysis.storybookAnalysis,
      coverageAnalysis: analysis.coverageAnalysis,
      mockAnalysis: analysis.mockAnalysis,
      testingCommandsTable: analysis.testingCommandsTable,
    };

    const stackFolder = this.templateLoader.resolveStackFolder(stackLanguage);
    const template = await this.templateLoader.load(
      stackFolder,
      "reverse/testing",
    );
    const rendered = this.templateRenderer.render(template, variables);

    const outputPath = path.join(reversePath, "6-testing", "strategy.md");
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, rendered);

    return {
      success: true,
      outputPath,
      summary: analysis.overview,
    };
  }
}
