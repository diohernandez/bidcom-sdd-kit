import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { ArchitecturePhase } from "../../../../../src/core/workflows/reverse/phases/ArchitecturePhase.js";

describe("core/workflows/reverse/phases/ArchitecturePhase", () => {
  let projectPath: string;
  let reversePath: string;
  const phase = new ArchitecturePhase();

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-arch-phase-project-"),
    );
    reversePath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-arch-phase-reverse-"),
    );
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    await fs.remove(reversePath);
  });

  it("renders the architecture report at 2-architecture/architecture.md", async () => {
    await fs.ensureDir(path.join(projectPath, "src", "core", "interactors"));
    await fs.writeFile(
      path.join(projectPath, "src", "core", "interactors", "CreateUser.ts"),
      "export class CreateUserInteractor {}",
    );

    const actualResult = await phase.execute({
      projectName: "bidcom-website",
      projectPath,
      reversePath,
      analyst: "diohernandez",
      stackLanguage: "typescript",
      analysisDate: "2026-07-14",
    });

    expect(actualResult.success).toBe(true);
    const outputPath = path.join(
      reversePath,
      "2-architecture",
      "architecture.md",
    );
    expect(actualResult.outputPath).toBe(outputPath);

    const content = await fs.readFile(outputPath, "utf-8");
    expect(content).toContain("# Arquitectura: bidcom-website");
    expect(content).toContain(
      "> **Convención de capas detectada**: clean-architecture",
    );
    expect(content).toContain("### Interactors (src/core/interactors/)");
    expect(content).toContain("| Interactor/UseCase (clase + execute) |");
    expect(content).not.toMatch(/\{\{\s*\w+\s*\}\}/);
  });

  it("handles a project with no recognized layer convention", async () => {
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
      path.join(reversePath, "2-architecture", "architecture.md"),
      "utf-8",
    );
    expect(content).toContain("> **Convención de capas detectada**: none");
  });
});
