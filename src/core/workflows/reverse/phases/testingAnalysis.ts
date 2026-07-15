import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../../../utils/fs.js";

export interface TestingAnalysis {
  overview: string;
  e2eTestCount: number;
  componentTestCount: number;
  unitTestCount: number;
  jestAnalysis: string;
  rtlAnalysis: string;
  cypressAnalysis: string;
  storybookAnalysis: string;
  coverageAnalysis: string;
  mockAnalysis: string;
  testingCommandsTable: string;
}

async function walkFiles(dir: string): Promise<string[]> {
  if (!(await fileExists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(entryPath)));
    } else {
      files.push(entryPath);
    }
  }
  return files;
}

async function countByExts(dir: string, extensions: string[]): Promise<number> {
  const files = await walkFiles(dir);
  return files.filter((file) => extensions.some((ext) => file.endsWith(ext)))
    .length;
}

async function countFilesContaining(
  dir: string,
  extensions: string[],
  pattern: RegExp,
): Promise<number> {
  const files = await walkFiles(dir);
  const candidates = files.filter((file) =>
    extensions.some((ext) => file.endsWith(ext)),
  );
  let count = 0;
  for (const file of candidates) {
    const content = await fs.readFile(file, "utf-8");
    if (pattern.test(content)) count += 1;
  }
  return count;
}

async function anyFileContains(
  dir: string,
  extensions: string[],
  pattern: RegExp,
): Promise<boolean> {
  return (await countFilesContaining(dir, extensions, pattern)) > 0;
}

async function readConcatenated(paths: string[]): Promise<string> {
  let content = "";
  for (const candidate of paths) {
    if (await fileExists(candidate)) {
      content += await fs.readFile(candidate, "utf-8");
    }
  }
  return content;
}

async function hasJestConfig(projectPath: string): Promise<boolean> {
  return (
    (await fileExists(path.join(projectPath, "jest.config.js"))) ||
    (await fileExists(path.join(projectPath, "jest.config.ts")))
  );
}

async function hasCypressConfig(projectPath: string): Promise<boolean> {
  return (
    (await fileExists(path.join(projectPath, "cypress.config.js"))) ||
    (await fileExists(path.join(projectPath, "cypress.config.ts")))
  );
}

async function buildJestAnalysis(
  projectPath: string,
  srcDir: string,
): Promise<string> {
  if (!(await hasJestConfig(projectPath))) {
    return "## 🃏 Jest\n\n- **Estado**: No configurado\n";
  }

  const unitTests = await countByExts(srcDir, [".test.ts", ".test.tsx"]);
  let analysis = `## 🃏 Jest (Unit Testing)\n\n- **Configuración**: \`jest.config.js\`\n- **Unit tests**: ${unitTests} archivos\n`;

  const jestConfigContent = await readConcatenated([
    path.join(projectPath, "jest.config.js"),
    path.join(projectPath, "jest.config.ts"),
  ]);

  if (/coverage/.test(jestConfigContent)) {
    analysis += "- **Coverage**: Configurado\n";
  }
  if (/setupFilesAfterEnv|setupFiles/.test(jestConfigContent)) {
    analysis += "- **Setup files**: Configurados\n";
  }
  if (/jsdom/.test(jestConfigContent)) {
    analysis += "- **Test Environment**: jsdom (para componentes React)\n";
  }

  return analysis;
}

async function buildRtlAnalysis(
  projectPath: string,
  srcDir: string,
): Promise<string> {
  const packageJsonPath = path.join(projectPath, "package.json");
  const packageJsonContent = (await fileExists(packageJsonPath))
    ? await fs.readFile(packageJsonPath, "utf-8")
    : "";

  if (!/@testing-library\/react/.test(packageJsonContent)) {
    return "## 📚 React Testing Library\n\n- **Estado**: No detectado\n";
  }

  const rtlTests = await countFilesContaining(
    srcDir,
    [".test.tsx"],
    /from '@testing-library\/react'|from "@testing-library\/react"/,
  );
  let analysis = `## 📚 React Testing Library\n\n- **Tests con RTL**: ${rtlTests}\n`;

  if (
    await anyFileContains(
      srcDir,
      [".test.tsx"],
      /getByRole|getByText|getByLabelText/,
    )
  ) {
    analysis += "- **Queries**: getByRole, getByText, getByLabelText\n";
  }
  if (await anyFileContains(srcDir, [".test.tsx"], /userEvent|fireEvent/)) {
    analysis += "- **User interactions**: userEvent/fireEvent utilizados\n";
  }

  return analysis;
}

async function listRootFilesMatching(
  projectPath: string,
  pattern: RegExp,
): Promise<string[]> {
  if (!(await fileExists(projectPath))) return [];
  const entries = await fs.readdir(projectPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function buildCypressAnalysis(projectPath: string): Promise<string> {
  if (!(await hasCypressConfig(projectPath))) {
    return "## 🌲 Cypress\n\n- **Estado**: No configurado\n";
  }

  let analysis =
    "## 🌲 Cypress (E2E Testing)\n\n- **Configuración**: Detectada\n";

  const e2eDir = path.join(projectPath, "cypress", "e2e");
  if (await fileExists(e2eDir)) {
    const e2eTests = await countByExts(e2eDir, [".cy.ts", ".cy.tsx", ".cy.js"]);
    analysis += `- **E2E tests**: ${e2eTests}\n`;
  }

  const fixturesDir = path.join(projectPath, "cypress", "fixtures");
  if (await fileExists(fixturesDir)) {
    const fixturesCount = (await walkFiles(fixturesDir)).length;
    analysis += `- **Fixtures**: ${fixturesCount} archivos para mocking\n`;
  }

  const hasCustomCommands =
    (await fileExists(
      path.join(projectPath, "cypress", "support", "commands.ts"),
    )) ||
    (await fileExists(
      path.join(projectPath, "cypress", "support", "commands.js"),
    ));
  if (hasCustomCommands) {
    analysis += "- **Custom commands**: Configurados\n";
  }

  const packageJsonPath = path.join(projectPath, "package.json");
  const packageJsonContent = (await fileExists(packageJsonPath))
    ? await fs.readFile(packageJsonPath, "utf-8")
    : "";
  if (/@cypress\/code-coverage/.test(packageJsonContent)) {
    analysis += "- **Code coverage**: Habilitado para E2E\n";
  }

  const cypressConfigs = await listRootFilesMatching(
    projectPath,
    /^cypress.*\.config\..+$/,
  );
  if (cypressConfigs.length > 1) {
    analysis +=
      "\n### Configuraciones Múltiples\n\n| Archivo | Propósito |\n|---------|-----------|\n";
    for (const config of cypressConfigs) {
      const match = /^cypress\.(.+)\.config\..*$/.exec(config);
      const purpose = match ? match[1] : config;
      analysis += `| \`${config}\` | Configuración para ${purpose} |\n`;
    }
  }

  return analysis;
}

async function buildStorybookAnalysis(
  projectPath: string,
  srcDir: string,
): Promise<string> {
  if (!(await fileExists(path.join(projectPath, ".storybook")))) {
    return "## 📖 Storybook\n\n- **Estado**: No configurado\n";
  }

  const storiesCount = await countByExts(srcDir, [
    ".stories.tsx",
    ".stories.ts",
  ]);
  let analysis = `## 📖 Storybook (Visual Testing)\n\n- **Stories**: ${storiesCount}\n`;

  const interactionStories = await countFilesContaining(
    srcDir,
    [".stories.tsx"],
    /play.*async|play:.*async/,
  );
  if (interactionStories > 0) {
    analysis += `- **Interaction testing**: ${interactionStories} stories con play functions\n`;
  }

  return analysis;
}

async function buildCoverageAnalysis(projectPath: string): Promise<string> {
  let analysis = "## 📊 Cobertura de Código\n\n";

  if (!(await hasJestConfig(projectPath))) return analysis;

  const jestConfigContent = await readConcatenated([
    path.join(projectPath, "jest.config.js"),
    path.join(projectPath, "jest.config.ts"),
  ]);

  if (/coverageThreshold/.test(jestConfigContent)) {
    analysis += "- **Thresholds**: Configurados\n";
    if (/branches.*[0-9]/.test(jestConfigContent)) {
      analysis += "- **Branch coverage**: Threshold definido\n";
    }
    if (/functions.*[0-9]/.test(jestConfigContent)) {
      analysis += "- **Function coverage**: Threshold definido\n";
    }
    if (/lines.*[0-9]/.test(jestConfigContent)) {
      analysis += "- **Line coverage**: Threshold definido\n";
    }
  } else {
    analysis += "- **Thresholds**: No configurados\n";
  }

  return analysis;
}

async function buildMockAnalysis(
  projectPath: string,
  srcDir: string,
): Promise<string> {
  let analysis = "## 🎭 Mocking y Test Doubles\n\n";

  const mockUsage = await countFilesContaining(
    srcDir,
    [".test.ts", ".test.tsx"],
    /jest\.mock|jest\.fn|jest\.spyOn/,
  );
  if (mockUsage > 0) {
    analysis += `- **Jest mocks**: ${mockUsage} archivos utilizan jest.mock/jest.fn/jest.spyOn\n`;
  }

  const hasFixtures = await fileExists(
    path.join(projectPath, "cypress", "fixtures"),
  );
  if (hasFixtures) {
    analysis +=
      "- **Cypress fixtures**: Utilizados para mocking de APIs en E2E\n";
  }

  analysis +=
    "\n### Estrategia de Mocking (según lo detectado arriba)\n\n- **Unit tests**: Jest mocks para aislar unidades de código (si se detectó jest.mock/jest.fn/jest.spyOn)\n- **E2E tests**: Cypress fixtures/intercept para controlar respuestas de API (si hay `cypress/fixtures`)\n";

  if (
    (await fileExists(path.join(srcDir, "core", "interactors"))) &&
    (await fileExists(path.join(srcDir, "core", "adapters")))
  ) {
    analysis +=
      "- Se detectó `src/core/interactors/` + `src/core/adapters/`: consistente con testear interactors vía implementaciones InMemory de los adapters\n";
  }

  return analysis;
}

async function buildTestingCommandsTable(projectPath: string): Promise<string> {
  const packageJsonPath = path.join(projectPath, "package.json");
  if (!(await fileExists(packageJsonPath))) {
    return "| _(ninguno detectado)_ | No se encontraron scripts de `package.json` con nombre relacionado a test/e2e/cypress/storybook/jest |\n";
  }

  const pkg = await fs.readJson(packageJsonPath).catch(() => ({}));
  const scripts = (pkg as { scripts?: Record<string, string> }).scripts ?? {};
  const scriptNames = Object.keys(scripts).filter((name) =>
    /test|e2e|cypress|storybook|jest/.test(name),
  );

  if (scriptNames.length === 0) {
    return "| _(ninguno detectado)_ | No se encontraron scripts de `package.json` con nombre relacionado a test/e2e/cypress/storybook/jest |\n";
  }

  return scriptNames
    .map((name) => `| \`${name}\` | script de \`package.json\` |\n`)
    .join("");
}

export async function analyzeTesting(
  projectPath: string,
): Promise<TestingAnalysis> {
  const srcDir = path.join(projectPath, "src");
  const cypressDir = path.join(projectPath, "cypress");

  const jestAnalysis = await buildJestAnalysis(projectPath, srcDir);
  const rtlAnalysis = await buildRtlAnalysis(projectPath, srcDir);
  const cypressAnalysis = await buildCypressAnalysis(projectPath);
  const storybookAnalysis = await buildStorybookAnalysis(projectPath, srcDir);
  const coverageAnalysis = await buildCoverageAnalysis(projectPath);
  const mockAnalysis = await buildMockAnalysis(projectPath, srcDir);
  const testingCommandsTable = await buildTestingCommandsTable(projectPath);

  const e2eTestCount = await countByExts(cypressDir, [".cy.ts", ".cy.tsx"]);
  const componentTestCount = await countByExts(srcDir, [".test.tsx"]);
  const unitTestCount = await countByExts(srcDir, [".test.ts"]);

  const packageJsonPath = path.join(projectPath, "package.json");
  const packageJsonContent = (await fileExists(packageJsonPath))
    ? await fs.readFile(packageJsonPath, "utf-8")
    : "";

  const detectedTools: string[] = [];
  if (await hasJestConfig(projectPath)) detectedTools.push("Jest");
  if (/@testing-library\/react/.test(packageJsonContent))
    detectedTools.push("React Testing Library");
  if (await hasCypressConfig(projectPath)) detectedTools.push("Cypress");
  if (await fileExists(path.join(projectPath, ".storybook")))
    detectedTools.push("Storybook");

  const testFilePattern = [".test.ts", ".test.tsx", ".cy.ts", ".cy.tsx"];
  const totalTests =
    (await countByExts(srcDir, testFilePattern)) +
    (await countByExts(cypressDir, testFilePattern));

  const overview =
    detectedTools.length > 0
      ? `Herramientas de testing detectadas: ${detectedTools.join(", ")}. Total de archivos de test/E2E encontrados: ${totalTests}. Ver detalle de cada herramienta abajo.`
      : "No se detectó ninguna de las herramientas de testing que este script reconoce (Jest, React Testing Library, Cypress, Storybook). Revisar manualmente qué framework de testing usa el proyecto.";

  return {
    overview,
    e2eTestCount,
    componentTestCount,
    unitTestCount,
    jestAnalysis,
    rtlAnalysis,
    cypressAnalysis,
    storybookAnalysis,
    coverageAnalysis,
    mockAnalysis,
    testingCommandsTable,
  };
}
