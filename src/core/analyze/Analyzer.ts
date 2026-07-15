import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../utils/fs.js";
import { parseUserStories, parseTasks, collectRequirements } from "./parsers.js";
import type { AnalyzeOptions, ConsistencyIssue, CoverageReport, Task } from "./types.js";

export async function analyzeFeature(
  options: AnalyzeOptions,
): Promise<CoverageReport> {
  const { featureName, projectPath, wipPath } = options;
  const featurePath = path.join(projectPath, wipPath, featureName);

  const functionalSpecPath = path.join(featurePath, "1-functional", "spec.md");
  const taskListPath = path.join(featurePath, "3-tasks", "task-list.md");

  const stories = (await fileExists(functionalSpecPath))
    ? parseUserStories(await fs.readFile(functionalSpecPath, "utf-8"))
    : [];

  const tasks = (await fileExists(taskListPath))
    ? parseTasks(await fs.readFile(taskListPath, "utf-8"))
    : [];

  const requirements = await collectRequirements(featurePath, options.specsPath);
  const issues: ConsistencyIssue[] = [];

  const requirementIds = new Set(requirements);
  const requirementToTasks = new Map<string, Task[]>();
  for (const task of tasks) {
    for (const requirementId of task.requirements) {
      if (!requirementIds.has(requirementId)) {
        issues.push({
          type: "task-unknown-requirement",
          id: task.id,
          detail: `La tarea "${task.title}" referencia el requirement desconocido ${requirementId}`,
        });
      }
      const list = requirementToTasks.get(requirementId) ?? [];
      list.push(task);
      requirementToTasks.set(requirementId, list);
    }
  }

  for (const requirementId of requirements) {
    const tasksForRequirement = requirementToTasks.get(requirementId) ?? [];
    if (tasksForRequirement.length === 0) {
      issues.push({
        type: "requirement-orphan",
        id: requirementId,
        detail: `El requirement ${requirementId} no tiene ninguna tarea asignada`,
      });
    }
  }

  for (const task of tasks) {
    if (task.requirements.length === 0) {
      issues.push({
        type: "task-orphan",
        id: task.id,
        detail: `La tarea "${task.title}" no declara **Requirements**`,
      });
    }
  }

  return {
    valid: issues.length === 0,
    stories,
    requirements,
    tasks,
    issues,
  };
}
