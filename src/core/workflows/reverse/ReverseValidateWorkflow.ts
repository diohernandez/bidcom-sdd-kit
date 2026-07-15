import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../../utils/fs.js";
import type { SddConfig } from "../../../types/config.js";

export type CheckSeverity = "error" | "warning";

export interface ReverseValidateCheck {
  name: string;
  passed: boolean;
  severity?: CheckSeverity;
  detail?: string;
}

export interface ReverseValidateOptions {
  projectName: string;
  projectPath: string;
  config: SddConfig;
}

export interface ReverseValidateResult {
  success: boolean;
  errors?: number;
  warnings?: number;
  checks?: ReverseValidateCheck[];
  completedPhases?: number;
  totalPhases?: number;
  completionPercent?: number;
  codeExamplesCount?: number;
  error?: string;
}

const PHASE_FILES: Array<{ dir: string; file: string; description: string }> = [
  { dir: "1-spec", file: "spec.md", description: "Especificación funcional" },
  {
    dir: "2-architecture",
    file: "architecture.md",
    description: "Arquitectura técnica",
  },
  {
    dir: "3-integration",
    file: "integration.md",
    description: "Integración de frameworks",
  },
  {
    dir: "4-components",
    file: "structure.md",
    description: "Estructura de componentes",
  },
  { dir: "5-data-flow", file: "general.md", description: "Flujo de datos" },
  {
    dir: "6-testing",
    file: "strategy.md",
    description: "Estrategia de testing",
  },
  {
    dir: "7-documentation",
    file: "README.md",
    description: "Documentación final",
  },
];

const CODE_FENCE_MARKERS = ["```typescript", "```tsx", "```javascript"];

function hasUnfilledPlaceholder(content: string): boolean {
  const withoutChecklistLines = content
    .split("\n")
    .filter((line) => !/^\s*-\s*\[[ xX]\]/.test(line))
    .join("\n");
  const withoutLinks = withoutChecklistLines.replace(
    /\[[^\]]*\]\([^)]*\)/g,
    "",
  );

  if (/\[[A-Za-z_][A-Za-z0-9_ ]*\]/.test(withoutLinks)) return true;
  if (/\b(TODO|FIXME|TBD|PENDIENTE)\b|_¿[^_]*\?_/.test(withoutLinks))
    return true;
  return false;
}

async function walkFiles(dir: string): Promise<string[]> {
  if (!(await fileExists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(entryPath)));
    } else {
      files.push(entryPath);
    }
  }
  return files;
}

async function countCodeExamples(dir: string): Promise<number> {
  const files = await walkFiles(dir);
  let count = 0;
  for (const file of files) {
    const content = await fs.readFile(file, "utf-8");
    for (const line of content.split("\n")) {
      if (CODE_FENCE_MARKERS.some((marker) => line.includes(marker)))
        count += 1;
    }
  }
  return count;
}

export class ReverseValidateWorkflow {
  async execute(
    options: ReverseValidateOptions,
  ): Promise<ReverseValidateResult> {
    const { projectName, projectPath, config } = options;
    const reversePath = path.join(projectPath, config.reversePath, projectName);

    if (!(await fileExists(reversePath))) {
      return {
        success: false,
        error: `El proyecto "${projectName}" no existe`,
      };
    }

    const checks: ReverseValidateCheck[] = [];
    let errors = 0;
    let warnings = 0;

    const constitutionPath = path.join(reversePath, "constitution.md");
    if (!(await fileExists(constitutionPath))) {
      checks.push({
        name: "Constitución",
        passed: false,
        severity: "error",
        detail: "no encontrada",
      });
      errors += 1;
    } else {
      const content = await fs.readFile(constitutionPath, "utf-8");
      if (content.includes("[PROJECT_NAME]")) {
        checks.push({
          name: "Constitución",
          passed: false,
          severity: "warning",
          detail: "tiene placeholders sin completar",
        });
        warnings += 1;
      } else {
        checks.push({ name: "Constitución", passed: true });
      }
    }

    for (const { dir, file, description } of PHASE_FILES) {
      const filePath = path.join(reversePath, dir, file);
      if (!(await fileExists(filePath))) {
        checks.push({
          name: description,
          passed: false,
          severity: "error",
          detail: "no encontrada",
        });
        errors += 1;
        continue;
      }

      const content = await fs.readFile(filePath, "utf-8");
      if (hasUnfilledPlaceholder(content)) {
        checks.push({
          name: description,
          passed: false,
          severity: "warning",
          detail: "tiene placeholders sin completar",
        });
        warnings += 1;
      } else {
        checks.push({ name: description, passed: true });
      }
    }

    const glossaryPath = path.join(
      reversePath,
      "7-documentation",
      "glossary.md",
    );
    if (!(await fileExists(glossaryPath))) {
      checks.push({
        name: "Glosario",
        passed: false,
        severity: "error",
        detail: "no encontrado",
      });
      errors += 1;
    } else {
      const content = await fs.readFile(glossaryPath, "utf-8");
      const termsCount = content
        .split("\n")
        .filter((line) => line.startsWith("###")).length;
      if (termsCount < 10) {
        checks.push({
          name: "Glosario",
          passed: false,
          severity: "warning",
          detail: `menos de 10 términos (${termsCount})`,
        });
        warnings += 1;
      } else {
        checks.push({
          name: "Glosario",
          passed: true,
          detail: `${termsCount} términos`,
        });
      }
    }

    const onboardingPath = path.join(
      reversePath,
      "7-documentation",
      "onboarding.md",
    );
    if (!(await fileExists(onboardingPath))) {
      checks.push({
        name: "Guía de onboarding",
        passed: false,
        severity: "error",
        detail: "no encontrada",
      });
      errors += 1;
    } else {
      const content = await fs.readFile(onboardingPath, "utf-8");
      const hasSteps = /Paso 1|Step 1|## 1\./.test(content);
      if (!hasSteps) {
        checks.push({
          name: "Guía de onboarding",
          passed: false,
          severity: "warning",
          detail: "puede estar incompleta",
        });
        warnings += 1;
      } else {
        checks.push({ name: "Guía de onboarding", passed: true });
      }
    }

    let codeExamplesCount = 0;
    for (const { dir } of PHASE_FILES) {
      codeExamplesCount += await countCodeExamples(path.join(reversePath, dir));
    }
    if (codeExamplesCount < 20) {
      checks.push({
        name: "Ejemplos de código",
        passed: false,
        severity: "warning",
        detail: `pocos ejemplos (${codeExamplesCount})`,
      });
      warnings += 1;
    } else {
      checks.push({
        name: "Ejemplos de código",
        passed: true,
        detail: `${codeExamplesCount} ejemplos`,
      });
    }

    const totalPhases = 7;
    const completedPhases = totalPhases - errors;
    const completionPercent = Math.trunc((completedPhases * 100) / totalPhases);

    return {
      success: errors === 0,
      errors,
      warnings,
      checks,
      completedPhases,
      totalPhases,
      completionPercent,
      codeExamplesCount,
    };
  }
}
