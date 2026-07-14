const PLACEHOLDER_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;
export class TemplateRenderer {
    render(template, variables) {
        return template.content.replace(PLACEHOLDER_PATTERN, (match, key) => {
            const value = variables[key];
            return value === undefined ? match : String(value);
        });
    }
}
//# sourceMappingURL=TemplateRenderer.js.map