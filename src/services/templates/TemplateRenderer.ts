import type { Template } from "../../types/template.js";

const PLACEHOLDER_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

export class TemplateRenderer {
  render(template: Template, variables: Record<string, unknown>): string {
    return template.content.replace(
      PLACEHOLDER_PATTERN,
      (match, key: string) => {
        const value = variables[key];
        return value === undefined ? match : String(value);
      },
    );
  }
}
