import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { IntegrationPhase } from "../../../../../src/core/workflows/reverse/phases/IntegrationPhase.js";

describe("core/workflows/reverse/phases/IntegrationPhase", () => {
  let projectPath: string;
  let reversePath: string;
  const phase = new IntegrationPhase();

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-integration-phase-project-"),
    );
    reversePath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-integration-phase-reverse-"),
    );
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    await fs.remove(reversePath);
  });

  it("renders the integration report at 3-integration/integration.md", async () => {
    await fs.writeFile(path.join(projectPath, "next.config.js"), "");
    await fs.ensureDir(path.join(projectPath, "src", "app"));
    await fs.writeFile(
      path.join(projectPath, "src", "app", "page.tsx"),
      "export default function Home() {}",
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
      "3-integration",
      "integration.md",
    );
    expect(actualResult.outputPath).toBe(outputPath);

    const content = await fs.readFile(outputPath, "utf-8");
    expect(content).toContain("# Integración de Frameworks: bidcom-website");
    expect(content).toContain("El proyecto usa **Next.js**");
    expect(content).toContain("- **App Router**: 1 páginas");
    expect(content).not.toMatch(/\{\{\s*\w+\s*\}\}/);
  });

  it("handles a project with no Next.js or Astro configuration", async () => {
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
      path.join(reversePath, "3-integration", "integration.md"),
      "utf-8",
    );
    expect(content).toContain(
      "No se detectó configuración de Next.js ni de Astro",
    );
  });
});
