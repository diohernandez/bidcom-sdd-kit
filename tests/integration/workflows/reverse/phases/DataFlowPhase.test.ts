import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { DataFlowPhase } from "../../../../../src/core/workflows/reverse/phases/DataFlowPhase.js";

describe("core/workflows/reverse/phases/DataFlowPhase", () => {
  let projectPath: string;
  let reversePath: string;
  const phase = new DataFlowPhase();

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-dataflow-phase-project-"),
    );
    reversePath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-dataflow-phase-reverse-"),
    );
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    await fs.remove(reversePath);
  });

  it("renders the data-flow report at 5-data-flow/general.md", async () => {
    await fs.ensureDir(path.join(projectPath, "src", "core", "drivers"));
    await fs.ensureDir(path.join(projectPath, "src", "core", "interactors"));

    const actualResult = await phase.execute({
      projectName: "bidcom-website",
      projectPath,
      reversePath,
      analyst: "diohernandez",
      stackLanguage: "typescript",
      analysisDate: "2026-07-14",
    });

    expect(actualResult.success).toBe(true);
    const outputPath = path.join(reversePath, "5-data-flow", "general.md");
    expect(actualResult.outputPath).toBe(outputPath);

    const content = await fs.readFile(outputPath, "utf-8");
    expect(content).toContain("# Flujo de Datos: bidcom-website");
    expect(content).toContain(
      "consistente con un flujo de datos estilo Clean Architecture",
    );
    expect(content).toContain("┌─────────────────┐");
    expect(content).not.toMatch(/\{\{\s*\w+\s*\}\}/);
  });

  it("handles a project with no detected patterns at all", async () => {
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
      path.join(reversePath, "5-data-flow", "general.md"),
      "utf-8",
    );
    expect(content).toContain("No se detectó la convención");
  });
});
