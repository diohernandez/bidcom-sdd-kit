import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../../utils/fs.js";
import { parseFrontmatter } from "../../../utils/frontmatter.js";
import type { SddConfig } from "../../../types/config.js";
import type { StateData } from "../../../core/state/types.js";

export interface BuildOptions {
  featureName: string;
  projectPath: string;
  config: SddConfig;
}

export interface BuildResult {
  success: boolean;
  phase?: string;
  error?: string;
  nextSteps?: string[];
}

function phaseGuidance(featureName: string, phase: string | undefined): string {
  if (phase === "tasks") {
    return `El feature está en estado "tasks". Necesitás aprobar el plan primero: sdd approve ${featureName}`;
  }
  if (phase === "funcional" || phase === "tecnico") {
    return `El feature aún no tiene las tareas definidas (fase actual: "${phase}"). Continuá la planificación antes de implementar.`;
  }
  return `El feature no está listo para implementación (fase actual: "${phase}"). Ejecutá: sdd plan ${featureName}`;
}

export class BuildWorkflow {
  async execute(options: BuildOptions): Promise<BuildResult> {
    const { featureName, projectPath, config } = options;
    const featurePath = path.join(projectPath, config.wipPath, featureName);
    const statePath = path.join(featurePath, "state.json");
    const metaPath = path.join(featurePath, "meta.md");

    if (!(await fileExists(statePath)) && !(await fileExists(metaPath))) {
      return {
        success: false,
        error: `El feature "${featureName}" no existe (falta ${statePath})`,
      };
    }

    let phase: string | undefined;
    if (await fileExists(statePath)) {
      const data = (await fs.readJson(statePath)) as StateData;
      phase = data.state;
    } else {
      const meta = await fs.readFile(metaPath, "utf-8");
      const { data } = parseFrontmatter(meta);
      phase = typeof data.state === "string" ? data.state : undefined;
    }

    if (phase !== "impl") {
      return {
        success: false,
        phase,
        error: phaseGuidance(featureName, phase),
      };
    }

    return {
      success: true,
      phase,
      nextSteps: [
        "Implementar siguiendo TDD: código fuente, tests unitarios, Storybook stories",
        `Ejecutar: sdd validate ${featureName}`,
      ],
    };
  }
}
