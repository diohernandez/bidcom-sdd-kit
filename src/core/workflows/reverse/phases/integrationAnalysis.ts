import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../../../utils/fs.js";

export interface IntegrationAnalysis {
  overview: string;
  nextjsAnalysis: string;
  astroAnalysis: string;
  widgetsList: string;
  hydrationAnalysis: string;
  sharedComponentsAnalysis: string;
  microfrontendAnalysis: string;
  notes: string[];
  detectedFrameworks: string[];
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

async function countFilesByNames(
  dir: string,
  names: string[],
): Promise<number> {
  const files = await walkFiles(dir);
  return files.filter((file) => names.includes(path.basename(file))).length;
}

async function countFilesByExt(dir: string, ext: string): Promise<number> {
  const files = await walkFiles(dir);
  return files.filter((file) => file.endsWith(ext)).length;
}

async function listFilesByExt(dir: string, ext: string): Promise<string[]> {
  const files = await walkFiles(dir);
  return files.filter((file) => file.endsWith(ext));
}

async function countFilesContaining(
  dir: string,
  extensions: string[],
  patterns: RegExp,
): Promise<number> {
  const files = await walkFiles(dir);
  const candidates = files.filter((file) =>
    extensions.some((ext) => file.endsWith(ext)),
  );
  let count = 0;
  for (const file of candidates) {
    const content = await fs.readFile(file, "utf-8");
    if (patterns.test(content)) count += 1;
  }
  return count;
}

async function hasConfigFile(
  projectPath: string,
  base: string,
  extensions: string[],
): Promise<boolean> {
  for (const ext of extensions) {
    if (await fileExists(path.join(projectPath, `${base}.${ext}`))) return true;
  }
  return false;
}

async function buildNextjsAnalysis(projectPath: string): Promise<string> {
  let analysis = "## 📘 Next.js\n\n";

  const appDir = path.join(projectPath, "src", "app");
  if (await fileExists(appDir)) {
    const pagesCount = await countFilesByNames(appDir, ["page.tsx", "page.ts"]);
    analysis += `- **App Router**: ${pagesCount} páginas\n`;
  }

  const apiDir = path.join(projectPath, "src", "app", "api");
  if (await fileExists(apiDir)) {
    const apiRoutesCount = await countFilesByNames(apiDir, [
      "route.ts",
      "route.tsx",
    ]);
    analysis += `- **API Routes**: ${apiRoutesCount} rutas\n`;
  }

  if (await fileExists(appDir)) {
    const clientComponents = await countFilesContaining(
      appDir,
      [".tsx", ".ts"],
      /use client/,
    );
    if (clientComponents > 0) {
      analysis += `- **Client Components**: ${clientComponents} (con 'use client')\n`;
    }

    const serverComponents = await countFilesContaining(
      appDir,
      [".tsx", ".ts"],
      /export async function GET|export async function POST/,
    );
    if (serverComponents > 0) {
      analysis +=
        "- **Server Components**: Detectados (funciones async en App Router)\n";
    }
  }

  analysis +=
    "\n### Propósito en el Proyecto\n\nNext.js se utiliza como el framework principal para el sitio navegable, proporcionando SSR (Server-Side Rendering) y React Server Components para optimizar el rendimiento.\n";

  return analysis;
}

async function buildAstroAnalysis(projectPath: string): Promise<{
  astroAnalysis: string;
  widgetsList: string;
  hydrationAnalysis: string;
  notes: string[];
}> {
  let astroAnalysis = "## 🌟 Astro\n\n";
  let widgetsList = "";
  let hydrationAnalysis = "";
  const notes: string[] = [];

  const astroDir = path.join(projectPath, "src", "astro");
  if (await fileExists(astroDir)) {
    const astroPagesCount = await countFilesByExt(astroDir, ".astro");
    astroAnalysis += `- **Páginas Astro**: ${astroPagesCount}\n`;
  }

  const widgetsDir = path.join(projectPath, "src", "astro", "pages", "widgets");
  if (await fileExists(widgetsDir)) {
    const widgetFiles = await listFilesByExt(widgetsDir, ".astro");
    astroAnalysis += `- **Widgets**: ${widgetFiles.length} puntos de entrada para microfrontends\n\n`;

    widgetsList =
      "### Widgets Disponibles\n\n| Widget | Descripción |\n|--------|-------------|\n";
    for (const widget of widgetFiles) {
      const widgetName = path.basename(widget, ".astro");
      widgetsList += `| \`${widgetName}\` | Widget de ${widgetName} |\n`;
    }
  }

  if (await fileExists(astroDir)) {
    const hydratedComponents = await countFilesContaining(
      astroDir,
      [".astro"],
      /client:load|client:visible|client:idle/,
    );
    if (hydratedComponents > 0) {
      hydrationAnalysis = `## 💧 Estrategia de Hidratación\n\nAstro utiliza hidratación selectiva para minimizar el JavaScript enviado al cliente:\n\n| Directiva | Uso |\n|-----------|-----|\n| \`client:load\` | Hidratar inmediatamente al cargar la página |\n| \`client:visible\` | Hidratar cuando el componente entra en viewport |\n| \`client:idle\` | Hidratar cuando el navegador está inactivo |\n\n**Componentes con hidratación**: ${hydratedComponents}\n`;
    }
  }

  astroAnalysis +=
    "\n### Propósito en el Proyecto\n\nAstro se utiliza para entregar componentes React como widgets/microfrontends independientes, permitiendo la integración en otros sitios o aplicaciones.\n";

  notes.push(
    "- Se detectó configuración de Astro (`astro.config.*`); revisar el comando de build específico del proyecto (ej. `package.json` scripts)",
  );
  if (hydrationAnalysis) {
    notes.push(
      "- La hidratación selectiva de Astro minimiza el JavaScript enviado al cliente",
    );
  }

  return { astroAnalysis, widgetsList, hydrationAnalysis, notes };
}

async function buildSharedComponentsAnalysis(
  projectPath: string,
): Promise<string> {
  const componentsDir = path.join(projectPath, "src", "components");
  if (!(await fileExists(componentsDir))) return "";

  const sharedComponentsCount = await countFilesByExt(componentsDir, ".tsx");

  let analysis = `## 🔗 Componentes Compartidos\n\nLos componentes en \`src/components/\` se construyen una sola vez y se utilizan en ambos frameworks:\n\n- **Next.js**: Importados directamente en Server Components o Client Components\n- **Astro**: Importados en widgets \`.astro\` con directivas de hidratación\n\n**Total de componentes compartidos**: ${sharedComponentsCount}\n`;

  const hasApp = await fileExists(path.join(projectPath, "src", "app"));
  const hasAstro = await fileExists(path.join(projectPath, "src", "astro"));
  if (hasApp && hasAstro) {
    analysis +=
      "\n### Dual Framework Usage\n\nLos mismos componentes React funcionan en ambos contextos gracias a:\n1. No depender de APIs específicas de framework\n2. Recibir datos via props (no business logic interna)\n3. Usar Tailwind CSS para styling (compatible con ambos)\n";
  }

  return analysis;
}

async function buildMicrofrontendAnalysis(
  projectPath: string,
): Promise<string> {
  let analysis = "## 🧩 Estrategia de Microfrontends\n\n";

  const packageJsonPath = path.join(projectPath, "package.json");
  let hasModuleFederation = false;
  if (await fileExists(packageJsonPath)) {
    const content = await fs.readFile(packageJsonPath, "utf-8");
    hasModuleFederation = /Module Federation|@module-federation/.test(content);
  }

  analysis += hasModuleFederation
    ? "- **Module Federation**: Detectado\n"
    : "- **Module Federation**: No utilizado\n";

  analysis +=
    "\n### Enfoque Actual\n\nEl proyecto utiliza un enfoque de **widgets Astro** como microfrontends:\n- Cada widget es un punto de entrada independiente en `src/astro/pages/widgets/`\n- Los widgets pueden hidratar componentes React selectivamente\n- Se comparten componentes a través de `src/components/`\n";

  return analysis;
}

function buildOverview(detectedFrameworks: string[]): string {
  if (detectedFrameworks.length === 2) {
    return `El proyecto integra **${detectedFrameworks.join(" y ")}** desde una única base de código (ver detalle de cada uno abajo). Los componentes en \`src/components/\` (si existen) son el punto de reutilización entre ambos, según lo detectado en este análisis.`;
  }
  if (detectedFrameworks.length === 1) {
    return `El proyecto usa **${detectedFrameworks[0]}**. No se detectó un segundo framework de entrega (Next.js/Astro) para documentar como integración dual.`;
  }
  return "No se detectó configuración de Next.js ni de Astro (`next.config.*` / `astro.config.*`). Este análisis de integración de frameworks no aplica tal como está diseñado para este proyecto — revisar manualmente qué framework(s) de entrega usa.";
}

export async function analyzeIntegration(
  projectPath: string,
): Promise<IntegrationAnalysis> {
  const detectedFrameworks: string[] = [];
  let nextjsAnalysis = "";
  let astroAnalysis = "";
  let widgetsList = "";
  let hydrationAnalysis = "";
  let notes: string[] = [];

  if (await hasConfigFile(projectPath, "next.config", ["js", "ts", "mjs"])) {
    detectedFrameworks.push("Next.js");
    nextjsAnalysis = await buildNextjsAnalysis(projectPath);
  }

  if (await hasConfigFile(projectPath, "astro.config", ["js", "ts", "mjs"])) {
    detectedFrameworks.push("Astro");
    const astroSections = await buildAstroAnalysis(projectPath);
    astroAnalysis = astroSections.astroAnalysis;
    widgetsList = astroSections.widgetsList;
    hydrationAnalysis = astroSections.hydrationAnalysis;
    notes = astroSections.notes;
  }

  const sharedComponentsAnalysis =
    await buildSharedComponentsAnalysis(projectPath);
  const microfrontendAnalysis = await buildMicrofrontendAnalysis(projectPath);
  const overview = buildOverview(detectedFrameworks);

  return {
    overview,
    nextjsAnalysis,
    astroAnalysis,
    widgetsList,
    hydrationAnalysis,
    sharedComponentsAnalysis,
    microfrontendAnalysis,
    notes,
    detectedFrameworks,
  };
}
