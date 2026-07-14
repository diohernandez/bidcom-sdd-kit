export interface ParsedFrontmatter {
    data: Record<string, unknown>;
    body: string;
}
export declare function parseFrontmatter(content: string): ParsedFrontmatter;
