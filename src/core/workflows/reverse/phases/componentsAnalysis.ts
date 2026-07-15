import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../../../utils/fs.js";

export interface ComponentsAnalysis {
  overview: string;
  uiComponentsList: string;
  domainComponentsList: string;
  patternsAnalysis: string;
  iconsAnalysis: string;
  storybookAnalysis: string;
  testingAnalysis: string;
  detectedPatterns: string[];
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

async function listSubdirs(dir: string): Promise<string[]> {
  if (!(await fileExists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function countByExt(dir: string, ext: string): Promise<number> {
  const files = await walkFiles(dir);
  return files.filter((file) => file.endsWith(ext)).length;
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

async function buildUiComponentsList(componentsDir: string): Promise<string> {
  const uiDir = path.join(componentsDir, "ui");
  if (!(await fileExists(uiDir))) return "";

  const uiComponentsCount = await countByExt(uiDir, ".tsx");
  const subdirs = await listSubdirs(uiDir);

  let list = `## 🎨 Componentes UI (Design System)\n\n**Total**: ${uiComponentsCount} componentes\n\n### Primitivos Disponibles\n\n| Componente | Descripción |\n|------------|-------------|\n`;
  for (const name of subdirs) {
    list += `| \`${name}\` | Componente UI primitivo |\n`;
  }
  return list;
}

async function buildDomainComponentsList(
  componentsDir: string,
): Promise<string> {
  if (!(await fileExists(componentsDir))) return "";

  const excluded = new Set(["ui", "common", "icons"]);
  const subdirs = (await listSubdirs(componentsDir)).filter(
    (name) => !excluded.has(name),
  );

  let list = `## 🏗️ Componentes de Dominio\n\n**Total**: ${subdirs.length} grupos de componentes\n\n### Grupos por Dominio\n\n| Dominio | Descripción |\n|---------|-------------|\n`;
  for (const name of subdirs) {
    list += `| \`${name}\` | Componentes del dominio ${name} |\n`;
  }
  return list;
}

async function buildPatternsAnalysis(
  componentsDir: string,
): Promise<{ patternsAnalysis: string; detectedPatterns: string[] }> {
  let analysis = "## 🎯 Patrones de Componentes\n\n";
  const detected: string[] = [];

  const statefulCount = await countFilesContaining(
    componentsDir,
    [".tsx"],
    /useState|useReducer/,
  );
  if (statefulCount > 0) {
    analysis += `### Componentes con Estado\n\n- **Total**: ${statefulCount}\n- **Hooks utilizados**: useState, useReducer\n\n`;
    detected.push("componentes con estado");
  }

  if (
    await anyFileContains(
      componentsDir,
      [".tsx"],
      /export function.*Props|export const.*Props/,
    )
  ) {
    analysis +=
      "### Componentes Presentacionales\n\n- Componentes que reciben datos via props\n- No contienen lógica de negocio\n- Fáciles de testear y reutilizar\n\n";
    detected.push("Presentational");
  }

  const compositionCount = await countFilesContaining(
    componentsDir,
    [".tsx"],
    /children.*React\.ReactNode|children: React\.ReactNode/,
  );
  if (compositionCount > 0) {
    analysis += `### Composition Pattern\n\n- **Total**: ${compositionCount}\n- Uso de \`children: React.ReactNode\` para composición\n\n`;
    detected.push("Composition");
  }

  if (
    await anyFileContains(
      componentsDir,
      [".tsx"],
      /forwardRef|useImperativeHandle/,
    )
  ) {
    analysis +=
      "### ForwardRef Pattern\n\n- Para exponer refs del DOM a componentes padre\n- Útil para focus management y animaciones\n\n";
    detected.push("ForwardRef");
  }

  return { patternsAnalysis: analysis, detectedPatterns: detected };
}

async function buildStorybookAnalysis(projectPath: string): Promise<string> {
  const storybookDir = path.join(projectPath, ".storybook");
  if (!(await fileExists(storybookDir))) {
    return "## 📖 Storybook\n\n- **Estado**: No configurado\n";
  }

  const storiesCount = await countByExts(path.join(projectPath, "src"), [
    ".stories.tsx",
    ".stories.ts",
  ]);

  let analysis = `## 📖 Storybook\n\n- **Configuración**: Detectada en \`.storybook/\`\n- **Stories**: ${storiesCount}\n`;

  const mainCandidates = ["main.js", "main.ts"];
  let mainContent = "";
  for (const candidate of mainCandidates) {
    const candidatePath = path.join(storybookDir, candidate);
    if (await fileExists(candidatePath)) {
      mainContent += await fs.readFile(candidatePath, "utf-8");
    }
  }
  if (mainContent) {
    if (mainContent.includes("@storybook/addon-interactions")) {
      analysis += "- **Addon interactions**: Habilitado\n";
    }
    if (mainContent.includes("@storybook/addon-a11y")) {
      analysis += "- **Addon accessibility**: Habilitado\n";
    }
  }

  const interactionStories = await countFilesContaining(
    path.join(projectPath, "src"),
    [".stories.tsx"],
    /play.*async|play:.*async/,
  );
  if (interactionStories > 0) {
    analysis += `- **Interaction testing**: ${interactionStories} stories con play functions\n`;
  }

  return analysis;
}

async function buildTestingAnalysis(componentsDir: string): Promise<string> {
  const componentTests = await countByExts(componentsDir, [
    ".test.tsx",
    ".test.ts",
  ]);

  let analysis = `## 🧪 Testing de Componentes\n\n- **Total de tests**: ${componentTests}\n- **Framework**: Jest + React Testing Library\n`;

  const interactionTests = await countFilesContaining(
    componentsDir,
    [".test.tsx"],
    /userEvent|fireEvent/,
  );
  if (interactionTests > 0) {
    analysis += `- **Tests de interacción**: ${interactionTests}\n`;
  }

  return analysis;
}

async function buildIconsAnalysis(componentsDir: string): Promise<string> {
  const iconsDir = path.join(componentsDir, "icons");
  if (!(await fileExists(iconsDir))) return "";

  const iconsCount = await countByExt(iconsDir, ".tsx");
  return `## 🎯 Iconos\n\n- **Total**: ${iconsCount} iconos SVG como componentes React\n- **Ubicación**: \`src/components/icons/\`\n`;
}

function buildOverview(
  totalComponents: number,
  hasUiDir: boolean,
  detectedPatterns: string[],
  hasStorybook: boolean,
): string {
  let overview = `El proyecto tiene **${totalComponents}** componentes \`.tsx\` bajo \`src/components/\`.`;
  if (hasUiDir) {
    overview +=
      " Hay una subcarpeta `ui/` (posibles primitivos de design system).";
  }
  if (detectedPatterns.length > 0) {
    overview += ` Patrones con señales detectadas: ${detectedPatterns.join(", ")}.`;
  }
  if (hasStorybook) {
    overview += " Storybook está configurado.";
  }
  return overview;
}

export async function analyzeComponents(
  projectPath: string,
): Promise<ComponentsAnalysis> {
  const componentsDir = path.join(projectPath, "src", "components");

  const uiComponentsList = await buildUiComponentsList(componentsDir);
  const domainComponentsList = await buildDomainComponentsList(componentsDir);
  const { patternsAnalysis, detectedPatterns } =
    await buildPatternsAnalysis(componentsDir);
  const storybookAnalysis = await buildStorybookAnalysis(projectPath);
  const testingAnalysis = await buildTestingAnalysis(componentsDir);
  const iconsAnalysis = await buildIconsAnalysis(componentsDir);

  const totalComponents = await countByExt(componentsDir, ".tsx");
  const hasUiDir = await fileExists(path.join(componentsDir, "ui"));
  const hasStorybook = await fileExists(path.join(projectPath, ".storybook"));
  const overview = buildOverview(
    totalComponents,
    hasUiDir,
    detectedPatterns,
    hasStorybook,
  );

  return {
    overview,
    uiComponentsList,
    domainComponentsList,
    patternsAnalysis,
    iconsAnalysis,
    storybookAnalysis,
    testingAnalysis,
    detectedPatterns,
  };
}
