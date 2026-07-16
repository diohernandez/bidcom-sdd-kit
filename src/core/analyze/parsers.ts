import fs from "fs-extra";
import { fileExists } from "../../utils/fs.js";
import { readDelta } from "../specs/DeltaMerge.js";
import type { UserStory, Task } from "./types.js";

export function parseUserStories(content: string): UserStory[] {
  const stories: UserStory[] = [];
  const lines = content.split("\n");
  let counter = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(
      /^\*\*Como\*\*\s+(.+?)\s+\*\*Quiero\*\*\s+(.+?)\s+\*\*Para\*\*\s+(.+?)$/,
    );
    if (match) {
      counter++;
      stories.push({
        id: `US-${String(counter).padStart(3, "0")}`,
        role: match[1].trim(),
        action: match[2].trim(),
        benefit: match[3].trim(),
        raw: trimmed,
      });
    }
  }

  return stories;
}

function parseTaskRequirements(line: string): string[] {
  const match = line.match(/\*\*Requirements\*\*:\s*([\s\S]*)/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^R-\d+$/.test(item));
}

export function parseTaskLine(line: string): { id: string; title: string } | undefined {
  // Table format: | T1.1 | Title | ... |
  const tableMatch = line.match(/^\|\s*([^\s|][^|]*?)\s*\|\s*([^|]+?)\s*\|/);
  if (tableMatch) {
    const id = tableMatch[1].trim();
    const title = tableMatch[2].trim();
    if (/^(ID|Tarea|Task|#)$/i.test(id)) return undefined;
    if (/^[-:]+$/.test(id)) return undefined;
    if (/^[-:]+$/.test(title)) return undefined;
    return { id, title };
  }

  // Bullet format: - [ ] **Tarea 1.1**: Title
  const bulletMatch = line.match(/^-\s*\[[ x]\]\s*\*\*Tarea\s+(\S+)\*\*\s*:\s*(.+?)$/);
  if (bulletMatch) {
    const id = bulletMatch[1].trim();
    const title = bulletMatch[2].trim();
    return { id, title };
  }

  return undefined;
}

export function parseTasks(content: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split("\n");
  let currentTask: { id?: string; title?: string; requirements: string[] } | null = null;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const parsedTask = parseTaskLine(line);
    if (parsedTask) {
      if (currentTask) {
        tasks.push({
          id: currentTask.id ?? `T-${String(tasks.length + 1).padStart(3, "0")}`,
          title: currentTask.title ?? "(sin título)",
          requirements: currentTask.requirements,
        });
      }
      currentTask = { id: parsedTask.id, title: parsedTask.title, requirements: [] };
      const nextLine = lines[index + 1];
      if (nextLine && nextLine.includes("**Requirements**")) {
        currentTask.requirements = parseTaskRequirements(nextLine);
      }
    } else if (currentTask && line.includes("**Requirements**")) {
      currentTask.requirements = parseTaskRequirements(line);
    }
  }

  if (currentTask) {
    tasks.push({
      id: currentTask.id ?? `T-${String(tasks.length + 1).padStart(3, "0")}`,
      title: currentTask.title ?? "(sin título)",
      requirements: currentTask.requirements,
    });
  }

  return tasks;
}

export async function collectRequirements(
  featurePath: string,
  _specsPath: string,
): Promise<string[]> {
  const deltaDir = `${featurePath}/delta`;
  if (!(await fileExists(deltaDir))) return [];

  const entries = await fs.readdir(deltaDir);
  const ids: string[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const capability = entry.replace(/\.md$/, "");
    const delta = await readDelta(featurePath, capability);
    if (!delta) continue;
    for (const requirement of delta.added) ids.push(requirement.id);
    for (const requirement of delta.modified) ids.push(requirement.id);
  }

  return [...new Set(ids)].sort();
}
