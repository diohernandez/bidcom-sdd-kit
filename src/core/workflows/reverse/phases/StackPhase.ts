import path from "node:path";
import fs from "fs-extra";
import { TemplateLoader } from "../../../../services/templates/TemplateLoader.js";
import { TemplateRenderer } from "../../../../services/templates/TemplateRenderer.js";
import type { Language } from "../../../../types/stack.js";
import type { PhaseResult } from "../../../../types/workflow.js";
import {
  analyzeStack,
  buildStackOverview,
  renderTableRows,
} from "./stackAnalysis.js";

export interface StackPhaseOptions {
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

export class StackPhase {
  constructor(
    private readonly templateLoader: TemplateLoader = new TemplateLoader(),
    private readonly templateRenderer: TemplateRenderer = new TemplateRenderer(),
  ) {}

  async execute(options: StackPhaseOptions): Promise<PhaseResult> {
    const { projectName, projectPath, reversePath, analyst, stackLanguage } =
      options;
    const analysisDate = options.analysisDate ?? today();

    const analysis = await analyzeStack(projectPath);
    const overview = buildStackOverview(analysis);

    const variables = {
      projectName,
      analysisDate,
      analyst,
      ecosystem: analysis.ecosystem,
      overview,
      frameworksTable: renderTableRows(analysis.frameworksRows),
      testingTable: renderTableRows(analysis.testingRows),
      stylingTable: renderTableRows(analysis.stylingRows),
      buildTable: renderTableRows(analysis.buildRows),
      prodDepsLabel: analysis.prodDepsLabel,
      prodDepsTable: renderTableRows(analysis.prodDepsRows),
      devDepsLabel: analysis.devDepsLabel,
      devDepsTable: renderTableRows(analysis.devDepsRows),
      configFilesTable: renderTableRows(analysis.configFilesRows),
      notes: analysis.notes.join("\n"),
    };

    const stackFolder = this.templateLoader.resolveStackFolder(stackLanguage);
    const template = await this.templateLoader.load(
      stackFolder,
      "reverse/stack",
    );
    const rendered = this.templateRenderer.render(template, variables);

    const outputPath = path.join(reversePath, "1-spec", "spec.md");
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, rendered);

    return {
      success: true,
      outputPath,
      summary: `Ecosistema detectado: ${analysis.ecosystem}`,
    };
  }
}
