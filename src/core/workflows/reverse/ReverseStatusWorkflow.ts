import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../../utils/fs.js";
import { parseFrontmatter } from "../../../utils/frontmatter.js";
import type { SddConfig } from "../../../types/config.js";

export interface ReversePhaseCheck {
  phase: string;
  description: string;
  completed: boolean;
  documentCount?: number;
}

export interface ReverseProjectSummary {
  projectName: string;
  state?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface ReverseProjectStatus {
  summary: ReverseProjectSummary;
  phases: ReversePhaseCheck[];
  completed: number;
  total: number;
  percent: number;
}

export interface ReverseStatusOptions {
  projectPath: string;
  config: SddConfig;
  projectName?: string;
}

export interface ReverseStatusResult {
  success: boolean;
  project?: ReverseProjectStatus;
  projects?: ReverseProjectSummary[];
  summaryByState?: Record<string, number>;
  error?: string;
}

const PHASE_DEFS: Array<{ dir: string; description: string }> = [
  { dir: "constitution", description: "Constitución del proyecto" },
  { dir: "1-spec", description: "Especificación funcional" },
  { dir: "2-architecture", description: "Arquitectura técnica" },
  { dir: "3-integration", description: "Integración de frameworks" },
  { dir: "4-components", description: "Estructura de componentes" },
  { dir: "5-data-flow", description: "Flujo de datos" },
  { dir: "6-testing", description: "Estrategia de testing" },
  { dir: "7-documentation", description: "Documentación final" },
];

async function countMarkdownFiles(dir: string): Promise<number> {
  if (!(await fileExists(dir))) return 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .length;
}

async function readProjectSummary(
  reverseProjectPath: string,
  projectName: string,
): Promise<ReverseProjectSummary | null> {
  const metaPath = path.join(reverseProjectPath, "meta.md");
  if (!(await fileExists(metaPath))) return null;

  const meta = await fs.readFile(metaPath, "utf-8");
  const { data } = parseFrontmatter(meta);

  return {
    projectName,
    state: typeof data.state === "string" ? data.state : undefined,
    createdAt:
      typeof data.created_at === "string" ? data.created_at : undefined,
    createdBy:
      typeof data.created_by === "string" ? data.created_by : undefined,
  };
}

async function buildPhaseChecks(
  reverseProjectPath: string,
): Promise<ReversePhaseCheck[]> {
  const checks: ReversePhaseCheck[] = [];

  for (const { dir, description } of PHASE_DEFS) {
    if (dir === "constitution") {
      const completed = await fileExists(
        path.join(reverseProjectPath, "constitution.md"),
      );
      checks.push({ phase: dir, description, completed });
      continue;
    }

    const documentCount = await countMarkdownFiles(
      path.join(reverseProjectPath, dir),
    );
    checks.push({
      phase: dir,
      description,
      completed: documentCount > 0,
      documentCount,
    });
  }

  return checks;
}

export class ReverseStatusWorkflow {
  async execute(options: ReverseStatusOptions): Promise<ReverseStatusResult> {
    const { projectPath, config, projectName } = options;
    const reverseBasePath = path.join(projectPath, config.reversePath);

    if (projectName) {
      const reverseProjectPath = path.join(reverseBasePath, projectName);
      if (!(await fileExists(reverseProjectPath))) {
        return {
          success: false,
          error: `El proyecto "${projectName}" no existe`,
        };
      }

      const summary = (await readProjectSummary(
        reverseProjectPath,
        projectName,
      )) ?? {
        projectName,
      };
      const phases = await buildPhaseChecks(reverseProjectPath);
      const completed = phases.filter((phase) => phase.completed).length;
      const total = phases.length;
      const percent = Math.trunc((completed * 100) / total);

      return {
        success: true,
        project: { summary, phases, completed, total, percent },
      };
    }

    if (!(await fileExists(reverseBasePath))) {
      return { success: true, projects: [], summaryByState: {} };
    }

    const entries = await fs.readdir(reverseBasePath, { withFileTypes: true });
    const names = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    const projects: ReverseProjectSummary[] = [];
    for (const name of names) {
      const summary = await readProjectSummary(
        path.join(reverseBasePath, name),
        name,
      );
      if (summary) projects.push(summary);
    }

    const summaryByState: Record<string, number> = {};
    for (const project of projects) {
      const key = project.state ?? "unknown";
      summaryByState[key] = (summaryByState[key] ?? 0) + 1;
    }

    return { success: true, projects, summaryByState };
  }
}
