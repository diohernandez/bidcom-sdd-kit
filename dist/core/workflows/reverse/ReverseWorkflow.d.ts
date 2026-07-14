import { TemplateLoader } from '../../../services/templates/TemplateLoader.js';
import { TemplateRenderer } from '../../../services/templates/TemplateRenderer.js';
import type { SddConfig } from '../../../types/config.js';
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
export declare class ReverseWorkflow {
    private readonly templateLoader;
    private readonly templateRenderer;
    constructor(templateLoader?: TemplateLoader, templateRenderer?: TemplateRenderer);
    execute(options: ReverseOptions): Promise<ReverseResult>;
}
