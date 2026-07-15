import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../../../utils/fs.js";

export type LayerConvention =
  "clean-architecture" | "hexagonal" | "mvc" | "feature-based" | "none";

export interface ArchitectureAnalysis {
  srcBase: string;
  layerConvention: LayerConvention;
  directoryStructure: string;
  layerAnalysis: string;
  patternsFactsRows: string[][];
  tsConfigAnalysis: string;
  notes: string[];
  detectedPatternNames: string[];
}

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

async function listSubdirs(dir: string): Promise<string[]> {
  if (!(await fileExists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function countFiles(dir: string): Promise<number> {
  if (!(await fileExists(dir))) return 0;
  let count = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await countFiles(entryPath);
    } else if (CODE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      count += 1;
    }
  }
  return count;
}

async function walkFiles(dir: string, extensions: string[]): Promise<string[]> {
  if (!(await fileExists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(entryPath, extensions)));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(entryPath);
    }
  }
  return files;
}

function pad(value: string, targetWidth: number): string {
  return " ".repeat(Math.max(0, targetWidth - value.length));
}

async function detectLayerConvention(
  srcBase: string,
): Promise<LayerConvention> {
  const hasAny = async (dirs: string[]): Promise<boolean> => {
    for (const dir of dirs) {
      if (await fileExists(path.join(srcBase, dir))) return true;
    }
    return false;
  };
  const hasAll = async (dirs: string[]): Promise<boolean> => {
    for (const dir of dirs) {
      if (!(await fileExists(path.join(srcBase, dir)))) return false;
    }
    return true;
  };

  if (
    await hasAny([
      "core/entities",
      "core/adapters",
      "core/interactors",
      "core/drivers",
    ])
  ) {
    return "clean-architecture";
  }
  if (
    (await hasAll(["domain", "application"])) ||
    (await hasAll(["domain", "infrastructure"]))
  ) {
    return "hexagonal";
  }
  if (
    (await fileExists(path.join(srcBase, "models"))) &&
    ((await fileExists(path.join(srcBase, "controllers"))) ||
      (await fileExists(path.join(srcBase, "views"))))
  ) {
    return "mvc";
  }
  if (
    (await fileExists(path.join(srcBase, "features"))) ||
    (await fileExists(path.join(srcBase, "modules")))
  ) {
    return "feature-based";
  }
  return "none";
}

const LAYER_GROUPS: Record<
  Exclude<LayerConvention, "clean-architecture" | "none">,
  string[]
> = {
  hexagonal: ["domain", "application", "infrastructure"],
  mvc: ["models", "controllers", "views"],
  "feature-based": ["features", "modules"],
};

async function buildCleanArchitectureSections(
  srcBaseAbsolute: string,
  srcBase: string,
): Promise<{
  directoryStructure: string;
  layerAnalysis: string;
  notes: string[];
}> {
  let directoryStructure =
    "├── core/              # Clean Architecture - Business logic\n";
  let layerAnalysis =
    "## 🏛️ Clean Architecture\n\nEl proyecto implementa Clean Architecture con las siguientes capas:\n\n";

  const sublayers: Array<{
    dir: string;
    treeLabel: string;
    purpose: string;
    isLast?: boolean;
  }> = [
    {
      dir: "entities",
      treeLabel: "entities/",
      purpose: "Modelos de dominio y objetos de valor",
    },
    {
      dir: "adapters",
      treeLabel: "adapters/",
      purpose: "Interfaces de repositorios (ports)",
    },
    {
      dir: "drivers",
      treeLabel: "drivers/",
      purpose: "Implementaciones concretas de repositorios",
    },
    {
      dir: "interactors",
      treeLabel: "interactors/",
      purpose: "Casos de uso que orquestan la lógica de negocio",
    },
    {
      dir: "exceptions",
      treeLabel: "exceptions/",
      purpose: "Excepciones de dominio",
      isLast: true,
    },
  ];

  for (const layer of sublayers) {
    const layerDir = path.join(srcBaseAbsolute, "core", layer.dir);
    if (!(await fileExists(layerDir))) continue;
    const count = await countFiles(layerDir);
    const connector = layer.isLast ? "└──" : "├──";
    const treeComment =
      layer.dir === "entities"
        ? `Domain models (${count} files)`
        : layer.dir === "adapters"
          ? `Repository interfaces (${count} files)`
          : layer.dir === "drivers"
            ? `Repository implementations (${count} files)`
            : layer.dir === "interactors"
              ? `Use cases (${count} files)`
              : `Domain exceptions (${count} files)`;
    directoryStructure += `│   ${connector} ${layer.treeLabel}${pad(layer.treeLabel, 17)}# ${treeComment}\n`;
    const title = layer.dir.charAt(0).toUpperCase() + layer.dir.slice(1);
    layerAnalysis += `### ${title} (${srcBase}/core/${layer.dir}/)\n\n- **Propósito**: ${layer.purpose}\n- **Archivos**: ${count}\n\n`;
  }

  const notes = [
    `- La regla de Clean Architecture: \`${srcBase}/core/\` no debería importar de capas externas (verificar caso a caso, este script no lo valida)`,
  ];

  return { directoryStructure, layerAnalysis, notes };
}

async function buildGroupedSections(
  srcBaseAbsolute: string,
  srcBase: string,
  convention: "hexagonal" | "mvc" | "feature-based",
): Promise<{ directoryStructure: string; layerAnalysis: string }> {
  const header =
    convention === "hexagonal"
      ? "## 🏛️ Arquitectura Hexagonal / Onion\n\n"
      : convention === "mvc"
        ? "## 🏛️ MVC\n\n"
        : "## 🏛️ Organización por Feature/Módulo\n\n";

  let directoryStructure = "";
  let layerAnalysis = header;

  for (const layer of LAYER_GROUPS[convention]) {
    const layerDir = path.join(srcBaseAbsolute, layer);
    if (!(await fileExists(layerDir))) continue;

    if (convention === "feature-based") {
      const subfolders = await listSubdirs(layerDir);
      directoryStructure += `├── ${layer}/${pad(layer, 20)}# (${subfolders.length} subcarpetas)\n`;
      layerAnalysis += `### ${layer} (${srcBase}/${layer}/)\n\n- **Subcarpetas (posibles features/módulos)**: ${subfolders.length}\n\n`;
    } else {
      const count = await countFiles(layerDir);
      directoryStructure += `├── ${layer}/${pad(layer, 20)}# (${count} files)\n`;
      layerAnalysis += `### ${layer} (${srcBase}/${layer}/)\n\n- **Archivos**: ${count}\n\n`;
    }
  }

  return { directoryStructure, layerAnalysis };
}

function skipDirsFor(convention: LayerConvention): string[] {
  if (convention === "clean-architecture") return ["core"];
  if (convention === "hexagonal")
    return ["domain", "application", "infrastructure"];
  if (convention === "mvc") return ["models", "controllers", "views"];
  if (convention === "feature-based") return ["features", "modules"];
  return [];
}

async function addPatternFact(
  label: string,
  pattern: RegExp,
  dir: string,
): Promise<{ row: string[]; detected: boolean }> {
  if (!(await fileExists(dir))) return { row: [], detected: false };

  const files = await walkFiles(dir, [".ts", ".tsx"]);
  const matches: Array<{ file: string; line: number; content: string }> = [];

  for (const file of files) {
    const content = await fs.readFile(file, "utf-8");
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push({ file, line: index + 1, content: line });
      }
    });
  }

  if (matches.length === 0) return { row: [], detected: false };

  const fileCount = new Set(matches.map((m) => m.file)).size;
  const occurrenceCount = matches.length;
  const first = matches[0];
  const example = `${first.file}:${first.line}:${first.content}`
    .replace(/\|/g, "\\|")
    .slice(0, 140);

  return {
    row: [label, String(fileCount), String(occurrenceCount), example],
    detected: true,
  };
}

const PATTERN_DEFS: Array<{ label: string; pattern: RegExp; subdir: string }> =
  [
    {
      label: "Dependency Injection (register/inject/builder)",
      pattern: /app\.register|container\.register|inject|builder/,
      subdir: "core",
    },
    {
      label: "Repository Pattern (interface/implements Repository)",
      pattern: /implements.*Repository|interface.*Repository/,
      subdir: "core",
    },
    {
      label: "Interactor/UseCase (clase + execute)",
      pattern: /class.*Interactor|class.*UseCase/,
      subdir: "core",
    },
    {
      label: "Componentes funcionales React",
      pattern: /export function|export const [A-Za-z]+ = \(/,
      subdir: "components",
    },
    {
      label: "Custom Hooks",
      pattern: /export function use[A-Z]|export const use[A-Z]/,
      subdir: "hooks",
    },
    { label: "Context API", pattern: /createContext|useContext/, subdir: "" },
    {
      label: "State machines (XState/reducer)",
      pattern: /useReducer|createMachine|useMachine/,
      subdir: "",
    },
  ];

function extractRange(
  lines: string[],
  startPattern: RegExp,
  endPattern: RegExp,
): string[] {
  const result: string[] = [];
  let inRange = false;
  for (const line of lines) {
    if (!inRange) {
      if (startPattern.test(line)) {
        inRange = true;
        result.push(line);
      }
      continue;
    }
    result.push(line);
    if (endPattern.test(line)) inRange = false;
  }
  return result;
}

async function buildTsConfigAnalysis(projectPath: string): Promise<string> {
  const tsconfigPath = path.join(projectPath, "tsconfig.json");
  if (!(await fileExists(tsconfigPath))) return "";

  const content = await fs.readFile(tsconfigPath, "utf-8");
  let analysis = "## ⚙️ Configuración de TypeScript\n\n";

  analysis += /"strict":\s*true/.test(content)
    ? "- **Strict Mode**: Habilitado\n"
    : "- **Strict Mode**: No habilitado\n";

  if (/"paths"/.test(content)) {
    analysis +=
      "- **Path Aliases**: Configurados\n\n### Aliases Disponibles\n\n| Alias | Ruta |\n|-------|------|\n";

    const lines = content.split("\n");
    const pathsBlock = extractRange(lines, /"paths"\s*:/, /^\s*}/);

    let pendingAlias: string | undefined;
    for (const line of pathsBlock) {
      const aliasMatch = /"(@[^"]+)"\s*:/.exec(line);
      if (aliasMatch) {
        const alias = aliasMatch[1];
        const inlineValueMatch = /\[\s*"([^"]*)"/.exec(line);
        if (inlineValueMatch) {
          analysis += `| \`${alias}\` | \`${inlineValueMatch[1]}\` |\n`;
        } else {
          pendingAlias = alias;
        }
        continue;
      }
      if (pendingAlias) {
        const valueMatch = /"([^"]*)"/.exec(line);
        if (valueMatch) {
          analysis += `| \`${pendingAlias}\` | \`${valueMatch[1]}\` |\n`;
          pendingAlias = undefined;
        }
      }
    }
  }

  return analysis;
}

export async function analyzeArchitecture(
  projectPath: string,
): Promise<ArchitectureAnalysis> {
  const hasSrc = await fileExists(path.join(projectPath, "src"));
  const srcBase = hasSrc ? "src" : ".";
  const srcBaseAbsolute = path.join(projectPath, srcBase);

  const layerConvention = await detectLayerConvention(srcBaseAbsolute);

  let directoryStructure = `\n### Directorio Principal: ${srcBase}/\n\n\`\`\`\n${srcBase}/\n`;
  let layerAnalysis = "";
  let notes: string[] = [];

  if (layerConvention === "clean-architecture") {
    const sections = await buildCleanArchitectureSections(
      srcBaseAbsolute,
      srcBase,
    );
    directoryStructure += sections.directoryStructure;
    layerAnalysis = sections.layerAnalysis;
    notes = sections.notes;
  } else if (layerConvention === "none") {
    layerAnalysis = `## 🏛️ Convención de Capas\n\nNo se detectó ninguna de las convenciones de capas reconocidas por este script (Clean Architecture, hexagonal/onion, MVC, feature-based). Esto **no** significa que el proyecto esté mal organizado — puede usar una convención propia no cubierta aquí. A continuación, el listado neutral de subdirectorios de \`${srcBase}/\` tal como existen:\n\n`;
  } else {
    const sections = await buildGroupedSections(
      srcBaseAbsolute,
      srcBase,
      layerConvention,
    );
    directoryStructure += sections.directoryStructure;
    layerAnalysis = sections.layerAnalysis;
  }

  const skipDirs = skipDirsFor(layerConvention);
  const subdirs = await listSubdirs(srcBaseAbsolute);
  for (const name of subdirs) {
    if (skipDirs.includes(name)) continue;
    const count = await countFiles(path.join(srcBaseAbsolute, name));
    directoryStructure += `├── ${name}/${pad(name, 18)}# (${count} files)\n`;
    if (layerConvention === "none") {
      layerAnalysis += `- \`${name}/\`: ${count} archivos\n`;
    }
  }

  directoryStructure += "```\n";

  const patternsFactsRows: string[][] = [];
  const detectedPatternNames: string[] = [];
  for (const def of PATTERN_DEFS) {
    const dir = def.subdir
      ? path.join(srcBaseAbsolute, def.subdir)
      : srcBaseAbsolute;
    const result = await addPatternFact(def.label, def.pattern, dir);
    if (result.detected) {
      patternsFactsRows.push(result.row);
      detectedPatternNames.push(def.label);
    }
  }

  const tsConfigAnalysis = await buildTsConfigAnalysis(projectPath);

  return {
    srcBase,
    layerConvention,
    directoryStructure,
    layerAnalysis,
    patternsFactsRows,
    tsConfigAnalysis,
    notes,
    detectedPatternNames,
  };
}

export function buildArchitectureOverview(
  analysis: ArchitectureAnalysis,
): string {
  const conventionPhrases: Record<LayerConvention, string> = {
    "clean-architecture": `una convención de **Clean Architecture** (\`${analysis.srcBase}/core/\` con entities/adapters/drivers/interactors)`,
    hexagonal:
      "una convención **hexagonal/onion** (domain + application/infrastructure)",
    mvc: "una convención **MVC** (models + controllers/views)",
    "feature-based": "una organización **por feature/módulo**",
    none: "**ninguna convención de capas reconocida por este script**",
  };

  const patternsPhrase =
    analysis.detectedPatternNames.length > 0
      ? ` Se encontraron señales de: ${analysis.detectedPatternNames.join(", ")} (ver tabla de hallazgos para archivos y ocurrencias exactas).`
      : " No se encontraron señales de los patrones que este script sabe buscar.";

  return `El proyecto presenta ${conventionPhrases[analysis.layerConvention]}.${patternsPhrase}`;
}
