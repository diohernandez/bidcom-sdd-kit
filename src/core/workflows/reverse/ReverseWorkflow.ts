import path from "node:path";
import fs from "fs-extra";
import { fileExists, mkdirp } from "../../../utils/fs.js";
import { TemplateLoader } from "../../../services/templates/TemplateLoader.js";
import { TemplateRenderer } from "../../../services/templates/TemplateRenderer.js";
import type { SddConfig } from "../../../types/config.js";

export interface ReverseAuthor {
  name: string;
  email?: string;
}

export interface ReverseOptions {
  projectName: string;
  projectPath: string;
  config: SddConfig;
  author: ReverseAuthor;
}

export interface ReverseResult {
  success: boolean;
  reversePath?: string;
  nextSteps?: string[];
  error?: string;
}

const PHASE_DIRS = [
  "1-spec",
  "2-architecture",
  "3-integration",
  "4-components",
  "5-data-flow",
  "6-testing",
  "7-documentation",
];

export class ReverseWorkflow {
  constructor(
    private readonly templateLoader: TemplateLoader = new TemplateLoader(),
    private readonly templateRenderer: TemplateRenderer = new TemplateRenderer(),
  ) {}

  async execute(options: ReverseOptions): Promise<ReverseResult> {
    const { projectName, projectPath, config, author } = options;
    const reversePath = path.join(projectPath, config.reversePath, projectName);

    if (await fileExists(reversePath)) {
      return {
        success: false,
        error: `El proyecto de reverse engineering "${projectName}" ya existe en ${reversePath}`,
      };
    }

    for (const dir of PHASE_DIRS) {
      await mkdirp(path.join(reversePath, dir));
    }

    const stackFolder = this.templateLoader.resolveStackFolder(
      config.stack.language,
    );
    const createdAt = new Date().toISOString();
    const variables = {
      projectName,
      date: createdAt,
      analyst: author.name,
      createdAt,
      createdBy: author.name,
      createdByEmail: author.email ?? "",
      status: "draft",
      state: "constitution",
    };

    const constitutionTemplate = await this.templateLoader.load(
      stackFolder,
      "reverse/constitution",
    );
    await fs.writeFile(
      path.join(reversePath, "constitution.md"),
      this.templateRenderer.render(constitutionTemplate, variables),
    );

    const metaTemplate = await this.templateLoader.load(
      stackFolder,
      "reverse/meta",
    );
    await fs.writeFile(
      path.join(reversePath, "meta.md"),
      this.templateRenderer.render(metaTemplate, variables),
    );

    return {
      success: true,
      reversePath,
      nextSteps: [
        `Revisar y personalizar la constitución: ${reversePath}/constitution.md`,
        `Analizar el stack tecnológico: sdd reverse analyze stack --project ${projectName}`,
        `Ver el estado del análisis: sdd reverse status ${projectName}`,
      ],
    };
  }
}
