import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { analyzeTesting } from "../../../../../../src/core/workflows/reverse/phases/testingAnalysis.js";

describe("core/workflows/reverse/phases/testingAnalysis", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-testing-analysis-"),
    );
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("reports every tool as not configured/detected when nothing exists", async () => {
    const actualAnalysis = await analyzeTesting(tempDir);

    expect(actualAnalysis.jestAnalysis).toBe(
      "## 🃏 Jest\n\n- **Estado**: No configurado\n",
    );
    expect(actualAnalysis.rtlAnalysis).toBe(
      "## 📚 React Testing Library\n\n- **Estado**: No detectado\n",
    );
    expect(actualAnalysis.cypressAnalysis).toBe(
      "## 🌲 Cypress\n\n- **Estado**: No configurado\n",
    );
    expect(actualAnalysis.storybookAnalysis).toBe(
      "## 📖 Storybook\n\n- **Estado**: No configurado\n",
    );
    expect(actualAnalysis.coverageAnalysis).toBe(
      "## 📊 Cobertura de Código\n\n",
    );
    expect(actualAnalysis.overview).toContain(
      "No se detectó ninguna de las herramientas",
    );
    expect(actualAnalysis.testingCommandsTable).toContain(
      "_(ninguno detectado)_",
    );
  });

  it("analyzes Jest configuration: unit tests, coverage, setup files, jsdom", async () => {
    await fs.writeFile(
      path.join(tempDir, "jest.config.js"),
      "module.exports = { coverage: true, setupFilesAfterEnv: ['./jest.setup.js'], testEnvironment: 'jsdom' }",
    );
    await fs.ensureDir(path.join(tempDir, "src"));
    await fs.writeFile(path.join(tempDir, "src", "a.test.ts"), "");
    await fs.writeFile(path.join(tempDir, "src", "b.test.tsx"), "");

    const actualAnalysis = await analyzeTesting(tempDir);

    expect(actualAnalysis.jestAnalysis).toContain(
      "- **Unit tests**: 2 archivos",
    );
    expect(actualAnalysis.jestAnalysis).toContain(
      "- **Coverage**: Configurado",
    );
    expect(actualAnalysis.jestAnalysis).toContain(
      "- **Setup files**: Configurados",
    );
    expect(actualAnalysis.jestAnalysis).toContain(
      "- **Test Environment**: jsdom",
    );
    expect(actualAnalysis.unitTestCount).toBe(1);
    expect(actualAnalysis.componentTestCount).toBe(1);
  });

  it("analyzes coverage thresholds separately from the jest section", async () => {
    await fs.writeFile(
      path.join(tempDir, "jest.config.ts"),
      "export default { coverageThreshold: { global: { branches: 80, functions: 80, lines: 80 } } }",
    );

    const actualAnalysis = await analyzeTesting(tempDir);

    expect(actualAnalysis.coverageAnalysis).toContain(
      "- **Thresholds**: Configurados",
    );
    expect(actualAnalysis.coverageAnalysis).toContain(
      "- **Branch coverage**: Threshold definido",
    );
    expect(actualAnalysis.coverageAnalysis).toContain(
      "- **Function coverage**: Threshold definido",
    );
    expect(actualAnalysis.coverageAnalysis).toContain(
      "- **Line coverage**: Threshold definido",
    );
  });

  it("detects React Testing Library usage, queries and interactions", async () => {
    await fs.writeJson(path.join(tempDir, "package.json"), {
      devDependencies: { "@testing-library/react": "^14.0.0" },
    });
    await fs.ensureDir(path.join(tempDir, "src"));
    await fs.writeFile(
      path.join(tempDir, "src", "Button.test.tsx"),
      "import { render, screen } from '@testing-library/react'\nscreen.getByRole('button')\nuserEvent.click(x)",
    );

    const actualAnalysis = await analyzeTesting(tempDir);

    expect(actualAnalysis.rtlAnalysis).toContain("- **Tests con RTL**: 1");
    expect(actualAnalysis.rtlAnalysis).toContain(
      "- **Queries**: getByRole, getByText, getByLabelText",
    );
    expect(actualAnalysis.rtlAnalysis).toContain(
      "- **User interactions**: userEvent/fireEvent utilizados",
    );
  });

  it("analyzes Cypress: e2e tests, fixtures, custom commands, code coverage, multiple configs", async () => {
    await fs.writeFile(path.join(tempDir, "cypress.config.ts"), "");
    await fs.writeFile(path.join(tempDir, "cypress.component.config.ts"), "");
    await fs.ensureDir(path.join(tempDir, "cypress", "e2e"));
    await fs.writeFile(path.join(tempDir, "cypress", "e2e", "home.cy.ts"), "");
    await fs.ensureDir(path.join(tempDir, "cypress", "fixtures"));
    await fs.writeFile(
      path.join(tempDir, "cypress", "fixtures", "user.json"),
      "{}",
    );
    await fs.ensureDir(path.join(tempDir, "cypress", "support"));
    await fs.writeFile(
      path.join(tempDir, "cypress", "support", "commands.ts"),
      "",
    );
    await fs.writeJson(path.join(tempDir, "package.json"), {
      devDependencies: { "@cypress/code-coverage": "^3.0.0" },
    });

    const actualAnalysis = await analyzeTesting(tempDir);

    expect(actualAnalysis.cypressAnalysis).toContain("- **E2E tests**: 1");
    expect(actualAnalysis.cypressAnalysis).toContain(
      "- **Fixtures**: 1 archivos para mocking",
    );
    expect(actualAnalysis.cypressAnalysis).toContain(
      "- **Custom commands**: Configurados",
    );
    expect(actualAnalysis.cypressAnalysis).toContain(
      "- **Code coverage**: Habilitado para E2E",
    );
    expect(actualAnalysis.cypressAnalysis).toContain(
      "### Configuraciones Múltiples",
    );
    expect(actualAnalysis.cypressAnalysis).toContain(
      "| `cypress.component.config.ts` | Configuración para component |",
    );
    expect(actualAnalysis.e2eTestCount).toBe(1);
  });

  it("analyzes Storybook stories and interaction testing", async () => {
    await fs.ensureDir(path.join(tempDir, ".storybook"));
    await fs.ensureDir(path.join(tempDir, "src"));
    await fs.writeFile(
      path.join(tempDir, "src", "Button.stories.tsx"),
      "export const Default = { play: async () => {} }",
    );

    const actualAnalysis = await analyzeTesting(tempDir);

    expect(actualAnalysis.storybookAnalysis).toContain("- **Stories**: 1");
    expect(actualAnalysis.storybookAnalysis).toContain(
      "- **Interaction testing**: 1 stories con play functions",
    );
  });

  it("analyzes mock usage and the InMemory adapters note when clean architecture exists", async () => {
    await fs.ensureDir(path.join(tempDir, "src", "core", "interactors"));
    await fs.ensureDir(path.join(tempDir, "src", "core", "adapters"));
    await fs.writeFile(
      path.join(tempDir, "src", "a.test.ts"),
      "jest.mock('./x')",
    );
    await fs.ensureDir(path.join(tempDir, "cypress", "fixtures"));

    const actualAnalysis = await analyzeTesting(tempDir);

    expect(actualAnalysis.mockAnalysis).toContain(
      "- **Jest mocks**: 1 archivos utilizan jest.mock/jest.fn/jest.spyOn",
    );
    expect(actualAnalysis.mockAnalysis).toContain(
      "- **Cypress fixtures**: Utilizados",
    );
    expect(actualAnalysis.mockAnalysis).toContain(
      "Se detectó `src/core/interactors/` + `src/core/adapters/`",
    );
  });

  it("builds the testing commands table from package.json scripts matching test-related keywords", async () => {
    await fs.writeJson(path.join(tempDir, "package.json"), {
      scripts: {
        test: "jest",
        "test:e2e": "cypress run",
        build: "tsc",
        storybook: "storybook dev",
      },
    });

    const actualAnalysis = await analyzeTesting(tempDir);

    expect(actualAnalysis.testingCommandsTable).toBe(
      "| `test` | script de `package.json` |\n| `test:e2e` | script de `package.json` |\n| `storybook` | script de `package.json` |\n",
    );
  });

  it("reports detected tools and total test count in the overview", async () => {
    await fs.writeFile(path.join(tempDir, "jest.config.js"), "");
    await fs.writeFile(path.join(tempDir, "cypress.config.ts"), "");
    await fs.ensureDir(path.join(tempDir, "src"));
    await fs.writeFile(path.join(tempDir, "src", "a.test.ts"), "");

    const actualAnalysis = await analyzeTesting(tempDir);

    expect(actualAnalysis.overview).toBe(
      "Herramientas de testing detectadas: Jest, Cypress. Total de archivos de test/E2E encontrados: 1. Ver detalle de cada herramienta abajo.",
    );
  });
});
