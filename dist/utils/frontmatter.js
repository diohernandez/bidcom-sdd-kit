import YAML from 'yaml';
export function parseFrontmatter(content) {
    if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
        return { data: {}, body: content };
    }
    const lines = content.split('\n');
    const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    if (closingIndex === -1) {
        return { data: {}, body: content };
    }
    const rawFrontmatter = lines.slice(1, closingIndex).join('\n');
    const body = lines.slice(closingIndex + 1).join('\n');
    const data = (YAML.parse(rawFrontmatter) ?? {});
    return { data, body };
}
//# sourceMappingURL=frontmatter.js.map