import { TemplateLoader } from '../../../services/templates/TemplateLoader.js';
import { TemplateRenderer } from '../../../services/templates/TemplateRenderer.js';
import type { SddConfig } from '../../../types/config.js';
import type { WorkflowResult } from '../../../types/workflow.js';
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
export declare class PlanWorkflow {
    private readonly templateLoader;
    private readonly templateRenderer;
    constructor(templateLoader?: TemplateLoader, templateRenderer?: TemplateRenderer);
    execute(options: PlanOptions): Promise<WorkflowResult>;
}
