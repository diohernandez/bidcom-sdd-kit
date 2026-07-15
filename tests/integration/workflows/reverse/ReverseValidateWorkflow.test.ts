import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { ReverseValidateWorkflow } from "../../../../src/core/workflows/reverse/ReverseValidateWorkflow.js";
import type { SddConfig } from "../../../../src/types/config.js";

describe("core/workflows/reverse/ReverseValidateWorkflow", () => {
  let projectPath: string;
  let reversePath: string;
  let config: SddConfig;
  const workflow = new ReverseValidateWorkflow();

  const PHASES = [
    ["1-spec", "spec.md"],
    ["2-architecture", "architecture.md"],
    ["3-integration", "integration.md"],
    ["4-components", "structure.md"],
    ["5-data-flow", "general.md"],
    ["6-testing", "strategy.md"],
    ["7-documentation", "README.md"],
  ];

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-reverse-validate-"),
    );
    reversePath = path.join(projectPath, ".sdd", "reverse", "bidcom-website");
    config = {
      sddPath: ".sdd",
      wipPath: ".sdd/wip",
      reversePath: ".sdd/reverse",
      knowledgePath: ".sdd/knowledge",
      specsPath: "specs",
      archivePath: ".sdd/archive",
      locale: "es",
      stack: { language: "typescript", framework: "Next.js 15.3.8" },
      projectName: "my-app",
      mutation: { enforce: false, threshold: 60 },
      telemetry: { enabled: true, runsFile: ".sdd/telemetry/runs.jsonl" },
    };
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("reports the project does not exist", async () => {
    const actualResult = await workflow.execute({
      projectName: "ghost",
      projectPath,
      config,
    });

    expect(actualResult.success).toBe(false);
    expect(actualResult.error).toMatch(/ghost/);
  });

  it("reports every check as an error when nothing was generated at all", async () => {
    await fs.ensureDir(reversePath);

    const actualResult = await workflow.execute({
      projectName: "bidcom-website",
      projectPath,
      config,
    });

    expect(actualResult.success).toBe(false);
    expect(actualResult.errors).toBe(10);
    expect(actualResult.completedPhases).toBe(-3);
    expect(actualResult.completionPercent).toBe(-42);
    expect(actualResult.checks).toEqual(
      expect.arrayContaining([
        {
          name: "Constitución",
          passed: false,
          severity: "error",
          detail: "no encontrada",
        },
      ]),
    );
  });

  it("warns when the constitution still has the [PROJECT_NAME] placeholder", async () => {
    await fs.ensureDir(reversePath);
    await fs.writeFile(
      path.join(reversePath, "constitution.md"),
      "# Constitución de [PROJECT_NAME]",
    );

    const actualResult = await workflow.execute({
      projectName: "bidcom-website",
      projectPath,
      config,
    });

    expect(actualResult.checks).toEqual(
      expect.arrayContaining([
        {
          name: "Constitución",
          passed: false,
          severity: "warning",
          detail: "tiene placeholders sin completar",
        },
      ]),
    );
    expect(actualResult.warnings).toBeGreaterThanOrEqual(1);
  });

  it("passes the constitution check when it has no [PROJECT_NAME] placeholder, even with checklist/links present", async () => {
    await fs.ensureDir(reversePath);
    await fs.writeFile(
      path.join(reversePath, "constitution.md"),
      "# Constitución de bidcom-website\n\n- [x] revisado\n\nVer [detalle](https://example.com)",
    );

    const actualResult = await workflow.execute({
      projectName: "bidcom-website",
      projectPath,
      config,
    });

    expect(actualResult.checks).toContainEqual({
      name: "Constitución",
      passed: true,
    });
  });

  it("detects placeholders ignoring checklist lines and markdown links, but catching real ones", async () => {
    await fs.ensureDir(reversePath);
    await fs.writeFile(path.join(reversePath, "constitution.md"), "# ok");
    await fs.ensureDir(path.join(reversePath, "1-spec"));
    await fs.writeFile(
      path.join(reversePath, "1-spec", "spec.md"),
      "- [x] checklist item\n\nVer [link](https://example.com)\n\nAnalista: [nombre]",
    );

    const actualResult = await workflow.execute({
      projectName: "bidcom-website",
      projectPath,
      config,
    });

    expect(actualResult.checks).toEqual(
      expect.arrayContaining([
        {
          name: "Especificación funcional",
          passed: false,
          severity: "warning",
          detail: "tiene placeholders sin completar",
        },
      ]),
    );
  });

  it("detects bare-word placeholders (TODO/FIXME/TBD/PENDIENTE) and the _¿...?_ prompt style", async () => {
    await fs.ensureDir(reversePath);
    await fs.writeFile(path.join(reversePath, "constitution.md"), "# ok");
    await fs.ensureDir(path.join(reversePath, "2-architecture"));
    await fs.writeFile(
      path.join(reversePath, "2-architecture", "architecture.md"),
      "_¿Container/Presentational?_",
    );

    const actualResult = await workflow.execute({
      projectName: "bidcom-website",
      projectPath,
      config,
    });

    expect(actualResult.checks).toContainEqual({
      name: "Arquitectura técnica",
      passed: false,
      severity: "warning",
      detail: "tiene placeholders sin completar",
    });
  });

  it("validates the glossary term count threshold", async () => {
    await fs.ensureDir(reversePath);
    await fs.writeFile(path.join(reversePath, "constitution.md"), "# ok");
    await fs.ensureDir(path.join(reversePath, "7-documentation"));
    await fs.writeFile(
      path.join(reversePath, "7-documentation", "glossary.md"),
      Array.from({ length: 5 }, (_, i) => `### Term ${i}`).join("\n"),
    );

    const actualResult = await workflow.execute({
      projectName: "bidcom-website",
      projectPath,
      config,
    });

    expect(actualResult.checks).toContainEqual({
      name: "Glosario",
      passed: false,
      severity: "warning",
      detail: "menos de 10 términos (5)",
    });
  });

  it("validates the onboarding guide has a recognizable first step", async () => {
    await fs.ensureDir(reversePath);
    await fs.writeFile(path.join(reversePath, "constitution.md"), "# ok");
    await fs.ensureDir(path.join(reversePath, "7-documentation"));
    await fs.writeFile(
      path.join(reversePath, "7-documentation", "onboarding.md"),
      "## 1. Instalación\n\nPaso 1: clonar el repo",
    );

    const actualResult = await workflow.execute({
      projectName: "bidcom-website",
      projectPath,
      config,
    });

    expect(actualResult.checks).toContainEqual({
      name: "Guía de onboarding",
      passed: true,
    });
  });

  it("sums code fence examples across all 7 phase directories, not just the expected file", async () => {
    await fs.ensureDir(reversePath);
    await fs.writeFile(path.join(reversePath, "constitution.md"), "# ok");
    for (const [dir] of PHASES) {
      await fs.ensureDir(path.join(reversePath, dir));
    }
    await fs.writeFile(
      path.join(reversePath, "1-spec", "extra-notes.md"),
      Array.from({ length: 25 }, () => "```typescript").join("\n"),
    );

    const actualResult = await workflow.execute({
      projectName: "bidcom-website",
      projectPath,
      config,
    });

    expect(actualResult.codeExamplesCount).toBe(25);
    expect(actualResult.checks).toContainEqual({
      name: "Ejemplos de código",
      passed: true,
      detail: "25 ejemplos",
    });
  });

  it("succeeds cleanly with warnings only, and success stays true when there are 0 errors", async () => {
    await fs.ensureDir(reversePath);
    await fs.writeFile(path.join(reversePath, "constitution.md"), "# ok");
    for (const [dir, file] of PHASES) {
      await fs.ensureDir(path.join(reversePath, dir));
      await fs.writeFile(
        path.join(reversePath, dir, file),
        "# ok\n\n```typescript\nconst x = 1\n```",
      );
    }
    await fs.writeFile(
      path.join(reversePath, "7-documentation", "glossary.md"),
      Array.from({ length: 10 }, (_, i) => `### Term ${i}`).join("\n"),
    );
    await fs.writeFile(
      path.join(reversePath, "7-documentation", "onboarding.md"),
      "## 1. Instalación",
    );

    const actualResult = await workflow.execute({
      projectName: "bidcom-website",
      projectPath,
      config,
    });

    expect(actualResult.errors).toBe(0);
    expect(actualResult.success).toBe(true);
    expect(actualResult.completedPhases).toBe(7);
    expect(actualResult.completionPercent).toBe(100);
  });
});
