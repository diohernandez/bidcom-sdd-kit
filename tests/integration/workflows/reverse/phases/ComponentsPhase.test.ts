import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { ComponentsPhase } from "../../../../../src/core/workflows/reverse/phases/ComponentsPhase.js";

describe("core/workflows/reverse/phases/ComponentsPhase", () => {
  let projectPath: string;
  let reversePath: string;
  const phase = new ComponentsPhase();

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-components-phase-project-"),
    );
    reversePath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-components-phase-reverse-"),
    );
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    await fs.remove(reversePath);
  });

  it("renders the components report at 4-components/structure.md", async () => {
    await fs.ensureDir(
      path.join(projectPath, "src", "components", "ui", "Button"),
    );
    await fs.writeFile(
      path.join(projectPath, "src", "components", "ui", "Button", "Button.tsx"),
      "",
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
    const outputPath = path.join(reversePath, "4-components", "structure.md");
    expect(actualResult.outputPath).toBe(outputPath);

    const content = await fs.readFile(outputPath, "utf-8");
    expect(content).toContain("# Estructura de Componentes: bidcom-website");
    expect(content).toContain("| `Button` | Componente UI primitivo |");
    expect(content).toContain(
      "## 📖 Storybook\n\n- **Estado**: No configurado",
    );
    expect(content).not.toMatch(/\{\{\s*\w+\s*\}\}/);
  });
});
