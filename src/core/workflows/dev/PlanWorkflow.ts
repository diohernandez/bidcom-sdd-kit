import path from "node:path";
import fs from "fs-extra";
import { fileExists, mkdirp } from "../../../utils/fs.js";
import { TemplateLoader } from "../../../services/templates/TemplateLoader.js";
import { TemplateRenderer } from "../../../services/templates/TemplateRenderer.js";
import type { SddConfig } from "../../../types/config.js";
import type { DetectedStack } from "../../../types/stack.js";
import type { WorkflowResult } from "../../../types/workflow.js";

export interface PlanAuthor {
  name: string;
  email?: string;
}

export interface PlanOptions {
  featureName: string;
  projectPath: string;
  config: SddConfig;
  author: PlanAuthor;
}

function buildTemplateVariables(
  featureName: string,
  config: SddConfig,
  author: PlanAuthor,
): Record<string, string> {
  const stack: DetectedStack = config.stack;

  return {
    featureName,
    createdAt: new Date().toISOString(),
    createdBy: author.name,
    createdByEmail: author.email ?? "",
    language: stack.language,
    framework: stack.framework ?? "no detectado",
    styling: stack.styling?.join(", ") ?? "no detectado",
    domain: config.domain ?? "pending",
    state: "funcional",
  };
}

export class PlanWorkflow {
  constructor(
    private readonly templateLoader: TemplateLoader = new TemplateLoader(),
    private readonly templateRenderer: TemplateRenderer = new TemplateRenderer(),
  ) {}

  async execute(options: PlanOptions): Promise<WorkflowResult> {
    const { featureName, projectPath, config, author } = options;
    const featurePath = path.join(projectPath, config.wipPath, featureName);

    if (await fileExists(featurePath)) {
      return {
        success: false,
        error: `El feature "${featureName}" ya existe en ${featurePath}`,
      };
    }

    const templates = await this.templateLoader.loadForStack(config.stack);
    const variables = buildTemplateVariables(featureName, config, author);

    await mkdirp(path.join(featurePath, "1-functional"));
    await mkdirp(path.join(featurePath, "2-technical"));
    await mkdirp(path.join(featurePath, "3-tasks"));

    await fs.writeFile(
      path.join(featurePath, "1-functional", "spec.md"),
      this.templateRenderer.render(templates.functionalSpec, variables),
    );
    await fs.writeFile(
      path.join(featurePath, "2-technical", "spec.md"),
      this.templateRenderer.render(templates.technicalSpec, variables),
    );
    await fs.writeFile(
      path.join(featurePath, "3-tasks", "task-list.md"),
      this.templateRenderer.render(templates.taskList, variables),
    );
    await fs.writeFile(
      path.join(featurePath, "meta.md"),
      this.templateRenderer.render(templates.meta, variables),
    );

    return {
      success: true,
      featurePath,
      nextSteps: [
        `Editar: ${featurePath}/1-functional/spec.md`,
        `Ejecutar: sdd validate ${featureName}`,
      ],
    };
  }
}
