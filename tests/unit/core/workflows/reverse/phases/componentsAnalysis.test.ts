import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { analyzeComponents } from "../../../../../../src/core/workflows/reverse/phases/componentsAnalysis.js";

describe("core/workflows/reverse/phases/componentsAnalysis", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-components-analysis-"),
    );
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("lists UI primitives and domain component groups", async () => {
    await fs.ensureDir(path.join(tempDir, "src", "components", "ui", "Button"));
    await fs.writeFile(
      path.join(tempDir, "src", "components", "ui", "Button", "Button.tsx"),
      "export const Button = () => null",
    );
    await fs.ensureDir(path.join(tempDir, "src", "components", "header"));
    await fs.writeFile(
      path.join(tempDir, "src", "components", "header", "Header.tsx"),
      "",
    );
    await fs.ensureDir(path.join(tempDir, "src", "components", "common"));

    const actualAnalysis = await analyzeComponents(tempDir);

    expect(actualAnalysis.uiComponentsList).toBe(
      "## 🎨 Componentes UI (Design System)\n\n**Total**: 1 componentes\n\n### Primitivos Disponibles\n\n| Componente | Descripción |\n|------------|-------------|\n| `Button` | Componente UI primitivo |\n",
    );
    expect(actualAnalysis.domainComponentsList).toBe(
      "## 🏗️ Componentes de Dominio\n\n**Total**: 1 grupos de componentes\n\n### Grupos por Dominio\n\n| Dominio | Descripción |\n|---------|-------------|\n| `header` | Componentes del dominio header |\n",
    );
    expect(actualAnalysis.overview).toContain(
      "El proyecto tiene **2** componentes `.tsx`",
    );
    expect(actualAnalysis.overview).toContain("Hay una subcarpeta `ui/`");
  });

  it("detects component patterns: stateful, presentational, composition, forwardRef", async () => {
    await fs.ensureDir(path.join(tempDir, "src", "components"));
    await fs.writeFile(
      path.join(tempDir, "src", "components", "Counter.tsx"),
      "export function Counter() { useState(0) }",
    );
    await fs.writeFile(
      path.join(tempDir, "src", "components", "Button.tsx"),
      "export function Button(props: ButtonProps) {}",
    );
    await fs.writeFile(
      path.join(tempDir, "src", "components", "Card.tsx"),
      "export function Card({ children }: { children: React.ReactNode }) {}",
    );
    await fs.writeFile(
      path.join(tempDir, "src", "components", "Input.tsx"),
      "export const Input = forwardRef(() => null)",
    );

    const actualAnalysis = await analyzeComponents(tempDir);

    expect(actualAnalysis.patternsAnalysis).toContain(
      "### Componentes con Estado\n\n- **Total**: 1",
    );
    expect(actualAnalysis.patternsAnalysis).toContain(
      "### Componentes Presentacionales",
    );
    expect(actualAnalysis.patternsAnalysis).toContain(
      "### Composition Pattern\n\n- **Total**: 1",
    );
    expect(actualAnalysis.patternsAnalysis).toContain("### ForwardRef Pattern");
    expect(actualAnalysis.detectedPatterns).toEqual([
      "componentes con estado",
      "Presentational",
      "Composition",
      "ForwardRef",
    ]);
  });

  it("reports storybook not configured when .storybook is absent", async () => {
    const actualAnalysis = await analyzeComponents(tempDir);
    expect(actualAnalysis.storybookAnalysis).toBe(
      "## 📖 Storybook\n\n- **Estado**: No configurado\n",
    );
  });

  it("reports storybook stories, addons and interaction testing", async () => {
    await fs.ensureDir(path.join(tempDir, ".storybook"));
    await fs.writeFile(
      path.join(tempDir, ".storybook", "main.ts"),
      "export default { addons: ['@storybook/addon-interactions', '@storybook/addon-a11y'] }",
    );
    await fs.ensureDir(path.join(tempDir, "src", "components"));
    await fs.writeFile(
      path.join(tempDir, "src", "components", "Button.stories.tsx"),
      "export const Default = { play: async () => {} }",
    );

    const actualAnalysis = await analyzeComponents(tempDir);

    expect(actualAnalysis.storybookAnalysis).toContain("- **Stories**: 1");
    expect(actualAnalysis.storybookAnalysis).toContain(
      "- **Addon interactions**: Habilitado",
    );
    expect(actualAnalysis.storybookAnalysis).toContain(
      "- **Addon accessibility**: Habilitado",
    );
    expect(actualAnalysis.storybookAnalysis).toContain(
      "- **Interaction testing**: 1 stories con play functions",
    );
  });

  it("counts component tests and interaction tests", async () => {
    await fs.ensureDir(path.join(tempDir, "src", "components"));
    await fs.writeFile(
      path.join(tempDir, "src", "components", "Button.test.tsx"),
      "userEvent.click(button)",
    );

    const actualAnalysis = await analyzeComponents(tempDir);

    expect(actualAnalysis.testingAnalysis).toContain("- **Total de tests**: 1");
    expect(actualAnalysis.testingAnalysis).toContain(
      "- **Tests de interacción**: 1",
    );
  });

  it("reports icons when src/components/icons exists", async () => {
    await fs.ensureDir(path.join(tempDir, "src", "components", "icons"));
    await fs.writeFile(
      path.join(tempDir, "src", "components", "icons", "Arrow.tsx"),
      "",
    );

    const actualAnalysis = await analyzeComponents(tempDir);

    expect(actualAnalysis.iconsAnalysis).toBe(
      "## 🎯 Iconos\n\n- **Total**: 1 iconos SVG como componentes React\n- **Ubicación**: `src/components/icons/`\n",
    );
  });

  it("handles a project with no src/components directory at all", async () => {
    const actualAnalysis = await analyzeComponents(tempDir);

    expect(actualAnalysis.uiComponentsList).toBe("");
    expect(actualAnalysis.domainComponentsList).toBe("");
    expect(actualAnalysis.iconsAnalysis).toBe("");
    expect(actualAnalysis.testingAnalysis).toContain("- **Total de tests**: 0");
    expect(actualAnalysis.overview).toBe(
      "El proyecto tiene **0** componentes `.tsx` bajo `src/components/`.",
    );
  });
});
