import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../../utils/fs.js";
import type { GateCheck, GateContext } from "../types.js";

interface PlaceholderCheck {
  withinHeading: string;
  substring: string;
}

function hasHeading(content: string, heading: string): boolean {
  return content.split("\n").some((line) => line.trim() === heading);
}

function extractSection(
  content: string,
  heading: string,
): string | null {
  const lines = content.split("\n");
  const startIndex = lines.findIndex((line) => line.trim() === heading);
  if (startIndex === -1) return null;

  const rest = lines.slice(startIndex + 1);
  const nextHeadingIndex = rest.findIndex((line) =>
    /^#{1,6}\s/.test(line.trim()),
  );
  const sectionLines =
    nextHeadingIndex === -1 ? rest : rest.slice(0, nextHeadingIndex);
  return sectionLines.join("\n");
}

function checkSection(
  content: string,
  heading: string,
  placeholder?: PlaceholderCheck,
): GateCheck {
  if (!hasHeading(content, heading)) {
    return {
      name: `section:${heading}`,
      passed: false,
      detail: `Falta la sección "${heading}"`,
    };
  }

  if (placeholder) {
    const section = extractSection(content, placeholder.withinHeading);
    if (section !== null && section.includes(placeholder.substring)) {
      return {
        name: `section:${heading}`,
        passed: false,
        detail: `La sección "${placeholder.withinHeading}" todavía tiene texto de placeholder`,
      };
    }
  }

  return { name: `section:${heading}`, passed: true };
}

function validateFunctionalSpec(content: string): GateCheck[] {
  return [
    checkSection(content, "## 1. Descripción del Problema", {
      withinHeading: "## 1. Descripción del Problema",
      substring: "_¿Qué problema",
    }),
    checkSection(content, "## 2. Objetivos", {
      withinHeading: "## 2. Objetivos",
      substring: "- [ ] Objetivo 1",
    }),
    checkSection(content, "## 3. Requisitos Funcionales"),
    checkSection(content, "### 3.1 Historias de Usuario", {
      withinHeading: "### 3.1 Historias de Usuario",
      substring: "**Como** [rol]",
    }),
    checkSection(content, "### 3.2 Criterios de Aceptación"),
    checkSection(content, "## 4. Casos de Uso"),
  ];
}

function validateTechnicalSpec(content: string): GateCheck[] {
  return [
    checkSection(content, "## 1. Arquitectura y Patrones de Diseño", {
      withinHeading: "### 1.1 Patrón Principal",
      substring: "_¿Container",
    }),
    checkSection(content, "## 2. Estructura de Archivos"),
    checkSection(content, "## 3. Interfaces y Tipos"),
    checkSection(content, "## 4. Gestión de Estado"),
    checkSection(content, "## 5. Estrategia de Testing"),
  ];
}

export async function runStructuralChecks(
  context: GateContext,
): Promise<GateCheck[]> {
  const checks: GateCheck[] = [];

  if (context.phase === "funcional") {
    const specPath = path.join(context.featurePath, "1-functional", "spec.md");
    if (!(await fileExists(specPath))) {
      return [
        {
          name: "functional-spec-exists",
          passed: false,
          detail: `No existe la especificación funcional (${specPath})`,
        },
      ];
    }
    const content = await fs.readFile(specPath, "utf-8");
    return validateFunctionalSpec(content);
  }

  if (context.phase === "tecnico") {
    const specPath = path.join(context.featurePath, "2-technical", "spec.md");
    if (!(await fileExists(specPath))) {
      return [
        {
          name: "technical-spec-exists",
          passed: false,
          detail: `No existe la especificación técnica (${specPath})`,
        },
      ];
    }
    const content = await fs.readFile(specPath, "utf-8");
    return validateTechnicalSpec(content);
  }

  if (context.phase === "tasks") {
    const taskListPath = path.join(
      context.featurePath,
      "3-tasks",
      "task-list.md",
    );
    if (!(await fileExists(taskListPath))) {
      return [
        {
          name: "task-list-exists",
          passed: false,
          detail: `No existe la lista de tareas (${taskListPath})`,
        },
      ];
    }
    return [{ name: "task-list-exists", passed: true }];
  }

  return checks;
}
