import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../../utils/fs.js";
import { parseFrontmatter } from "../../../utils/frontmatter.js";
import type { SddConfig } from "../../../types/config.js";
import type { StateData } from "../../../core/state/types.js";

export interface TaskCounts {
  total: number;
  done: number;
}

export interface FeatureSummary {
  featureName: string;
  state?: string;
  createdAt?: string;
  createdBy?: string;
  tasks?: TaskCounts;
}

export interface StatusOptions {
  projectPath: string;
  config: SddConfig;
  featureName?: string;
}

export interface StatusResult {
  success: boolean;
  feature?: FeatureSummary;
  features?: FeatureSummary[];
  summaryByState?: Record<string, number>;
  error?: string;
}

function countTasks(content: string): TaskCounts {
  const taskLines = content
    .split("\n")
    .filter((line) => /^-\s\[[ x]\]\s\*\*Tarea/.test(line));
  const done = taskLines.filter((line) =>
    /^-\s\[x\]\s\*\*Tarea/.test(line),
  ).length;
  return { total: taskLines.length, done };
}

async function readStateSummary(
  featurePath: string,
  featureName: string,
): Promise<FeatureSummary | null> {
  const statePath = path.join(featurePath, "state.json");
  if (await fileExists(statePath)) {
    const data = (await fs.readJson(statePath)) as StateData;
    const summary: FeatureSummary = {
      featureName,
      state: data.state,
      createdAt: data.created_at,
      createdBy: data.created_by,
    };
    const taskListPath = path.join(featurePath, "3-tasks", "task-list.md");
    if (await fileExists(taskListPath)) {
      summary.tasks = countTasks(await fs.readFile(taskListPath, "utf-8"));
    }
    return summary;
  }

  // Fallback a meta.md legacy (features creados antes de T11.1).
  const metaPath = path.join(featurePath, "meta.md");
  if (!(await fileExists(metaPath))) return null;

  const meta = await fs.readFile(metaPath, "utf-8");
  const { data } = parseFrontmatter(meta);

  const summary: FeatureSummary = {
    featureName,
    state: typeof data.state === "string" ? data.state : undefined,
    createdAt:
      typeof data.created_at === "string" ? data.created_at : undefined,
    createdBy:
      typeof data.created_by === "string" ? data.created_by : undefined,
  };

  const taskListPath = path.join(featurePath, "3-tasks", "task-list.md");
  if (await fileExists(taskListPath)) {
    summary.tasks = countTasks(await fs.readFile(taskListPath, "utf-8"));
  }

  return summary;
}

export class StatusWorkflow {
  async execute(options: StatusOptions): Promise<StatusResult> {
    const { projectPath, config, featureName } = options;
    const wipPath = path.join(projectPath, config.wipPath);

    if (featureName) {
      const feature = await readStateSummary(
        path.join(wipPath, featureName),
        featureName,
      );
      if (!feature) {
        return {
          success: false,
          error: `El feature "${featureName}" no existe`,
        };
      }
      return { success: true, feature };
    }

    if (!(await fileExists(wipPath))) {
      return { success: true, features: [], summaryByState: {} };
    }

    const entries = await fs.readdir(wipPath, { withFileTypes: true });
    const featureNames = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    const features: FeatureSummary[] = [];
    for (const name of featureNames) {
      const summary = await readStateSummary(path.join(wipPath, name), name);
      if (summary) features.push(summary);
    }

    const summaryByState: Record<string, number> = {};
    for (const feature of features) {
      const key = feature.state ?? "unknown";
      summaryByState[key] = (summaryByState[key] ?? 0) + 1;
    }

    return { success: true, features, summaryByState };
  }
}
