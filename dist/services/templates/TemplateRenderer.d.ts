import type { Template } from '../../types/template.js';
export declare class TemplateRenderer {
    render(template: Template, variables: Record<string, unknown>): string;
}
