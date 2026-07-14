import type { Language } from '../../types/stack.js';
import type { Template, TemplateSet } from '../../types/template.js';
export declare const DEFAULT_TEMPLATES_ROOT: string;
export declare class TemplateLoader {
    private readonly templatesRoot;
    constructor(templatesRoot?: string);
    load(stackFolder: string, templateName: string): Promise<Template>;
    loadForStack(stack: {
        language: Language;
    }): Promise<TemplateSet>;
    private resolveStackFolder;
}
