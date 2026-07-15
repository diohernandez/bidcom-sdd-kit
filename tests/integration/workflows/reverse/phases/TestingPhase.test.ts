import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { TestingPhase } from "../../../../../src/core/workflows/reverse/phases/TestingPhase.js";

describe("core/workflows/reverse/phases/TestingPhase", () => {
  let projectPath: string;
  let reversePath: string;
  const phase = new TestingPhase();

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-testing-phase-project-"),
    );
    reversePath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-testing-phase-reverse-"),
    );
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    await fs.remove(reversePath);
  });

  it("renders the testing report at 6-testing/strategy.md", async () => {
    await fs.writeFile(path.join(projectPath, "jest.config.js"), "");
    await fs.ensureDir(path.join(projectPath, "src"));
    await fs.writeFile(path.join(projectPath, "src", "a.test.ts"), "");

    const actualResult = await phase.execute({
      projectName: "bidcom-website",
      projectPath,
      reversePath,
      analyst: "diohernandez",
      stackLanguage: "typescript",
      analysisDate: "2026-07-14",
    });

    expect(actualResult.success).toBe(true);
    const outputPath = path.join(reversePath, "6-testing", "strategy.md");
    expect(actualResult.outputPath).toBe(outputPath);

    const content = await fs.readFile(outputPath, "utf-8");
    expect(content).toContain("# Estrategia de Testing: bidcom-website");
    expect(content).toContain("Jest (~1 tests)");
    expect(content).toContain("- **Unit tests**: 1 archivos");
    expect(content).not.toMatch(/\{\{\s*\w+\s*\}\}/);
  });

  it("handles a project with no testing tools configured", async () => {
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
      path.join(reversePath, "6-testing", "strategy.md"),
      "utf-8",
    );
    expect(content).toContain(
      "No se detectó ninguna de las herramientas de testing",
    );
  });
});
