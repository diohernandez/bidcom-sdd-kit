import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../utils/fs.js";
import { createSpecStore } from "./SpecStore.js";

export interface SpecsSearchResult {
  capability: string;
  title: string;
  matches: string[];
}

export interface SpecsSearchOptions {
  projectPath: string;
  specsPath: string;
  query: string;
}

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

export async function searchSpecs(
  options: SpecsSearchOptions,
): Promise<SpecsSearchResult[]> {
  const { projectPath, specsPath, query } = options;
  const absoluteSpecsPath = path.join(projectPath, specsPath);
  if (!(await fileExists(absoluteSpecsPath))) return [];

  const store = createSpecStore(projectPath);
  const capabilities = await store.list();
  const results: SpecsSearchResult[] = [];

  for (const capability of capabilities) {
    const spec = await store.read(capability);
    if (!spec) continue;

    const matches: string[] = [];
    if (matchesQuery(spec.title, query)) matches.push(`title: ${spec.title}`);
    if (spec.tags.some((tag) => matchesQuery(tag, query))) {
      matches.push(`tags: ${spec.tags.join(", ")}`);
    }
    for (const requirement of spec.requirements) {
      if (matchesQuery(requirement.title, query)) {
        matches.push(`${requirement.id}: ${requirement.title}`);
      }
    }

    if (matches.length > 0) {
      results.push({ capability, title: spec.title, matches });
    }
  }

  return results;
}

export async function searchSpecsByFile(
  options: SpecsSearchOptions,
): Promise<SpecsSearchResult[]> {
  const { projectPath, specsPath, query } = options;
  const absoluteSpecsPath = path.join(projectPath, specsPath);
  if (!(await fileExists(absoluteSpecsPath))) return [];

  const entries = await fs.readdir(absoluteSpecsPath, {
    withFileTypes: true,
  });
  const results: SpecsSearchResult[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const specPath = path.join(absoluteSpecsPath, entry.name, "spec.md");
    if (!(await fileExists(specPath))) continue;

    const content = await fs.readFile(specPath, "utf-8");
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (lowerContent.includes(lowerQuery)) {
      const titleLine = content
        .split("\n")
        .find((line) => line.startsWith("title:"));
      const title = titleLine ? titleLine.replace("title:", "").trim() : entry.name;
      results.push({
        capability: entry.name,
        title,
        matches: [`match in ${specPath}`],
      });
    }
  }

  return results;
}
