import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { StackPhase } from "../../../../../src/core/workflows/reverse/phases/StackPhase.js";

describe("core/workflows/reverse/phases/StackPhase", () => {
  let projectPath: string;
  let reversePath: string;
  const phase = new StackPhase();

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-stack-phase-project-"),
    );
    reversePath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-stack-phase-reverse-"),
    );
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    await fs.remove(reversePath);
  });

  it("renders the stack report with detected facts at 1-spec/spec.md", async () => {
    await fs.writeJson(path.join(projectPath, "package.json"), {
      dependencies: { next: "^15.3.8", react: "19.0.0" },
      devDependencies: { jest: "^29.0.0", tailwindcss: "^4.0.0" },
    });

    const actualResult = await phase.execute({
      projectName: "bidcom-website",
      projectPath,
      reversePath,
      analyst: "diohernandez",
      stackLanguage: "typescript",
      analysisDate: "2026-07-14",
    });

    expect(actualResult.success).toBe(true);
    const outputPath = path.join(reversePath, "1-spec", "spec.md");
    expect(actualResult.outputPath).toBe(outputPath);

    const content = await fs.readFile(outputPath, "utf-8");
    expect(content).toContain("# Stack Tecnológico: bidcom-website");
    expect(content).toContain("> **Fecha de Análisis**: 2026-07-14");
    expect(content).toContain("> **Analista**: diohernandez");
    expect(content).toContain("> **Ecosistema detectado**: node");
    expect(content).toContain(
      "Ecosistema detectado: **node**. Frameworks/librerías principales: Next.js ^15.3.8, React 19.0.0. Testing: Jest ^29.0.0. Styling: Tailwind CSS ^4.0.0.",
    );
    expect(content).toContain(
      "| Next.js | ^15.3.8 | Framework principal para SSR y navegación |",
    );
    expect(content).toContain(
      "| Jest | ^29.0.0 | Unit testing y component testing |",
    );
    expect(content).not.toMatch(/\{\{\s*\w+\s*\}\}/);
  });

  it("handles a project with no recognized manifest without throwing", async () => {
    const actualResult = await phase.execute({
      projectName: "mystery-project",
      projectPath,
      reversePath,
      analyst: "diohernandez",
      stackLanguage: "typescript",
      analysisDate: "2026-07-14",
    });

    expect(actualResult.success).toBe(true);
    const content = await fs.readFile(
      path.join(reversePath, "1-spec", "spec.md"),
      "utf-8",
    );
    expect(content).toContain("> **Ecosistema detectado**: unknown");
    expect(content).toContain(
      "No se identificaron frameworks, herramientas de testing o styling reconocidas automáticamente a partir del manifiesto",
    );
  });
});
