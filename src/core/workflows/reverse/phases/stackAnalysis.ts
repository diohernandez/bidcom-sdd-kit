import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../../../utils/fs.js";

export type Ecosystem = "node" | "python" | "go" | "rust" | "unknown";

interface NodeManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface StackAnalysis {
  ecosystem: Ecosystem;
  frameworksRows: string[][];
  testingRows: string[][];
  stylingRows: string[][];
  buildRows: string[][];
  prodDepsRows: string[][];
  devDepsRows: string[][];
  configFilesRows: string[][];
  notes: string[];
  prodDepsLabel: string;
  devDepsLabel: string;
  detectedFrameworks: string[];
  detectedTesting: string[];
  detectedStyling: string[];
}

async function detectEcosystem(projectPath: string): Promise<Ecosystem> {
  if (await fileExists(path.join(projectPath, "package.json"))) return "node";
  if (
    (await fileExists(path.join(projectPath, "pyproject.toml"))) ||
    (await fileExists(path.join(projectPath, "requirements.txt")))
  )
    return "python";
  if (await fileExists(path.join(projectPath, "go.mod"))) return "go";
  if (await fileExists(path.join(projectPath, "Cargo.toml"))) return "rust";
  return "unknown";
}

async function findConfigFile(
  projectPath: string,
  base: string,
  extensions: string[],
): Promise<string | undefined> {
  const candidates = [...extensions].sort();
  for (const ext of candidates) {
    const fileName = `${base}.${ext}`;
    if (await fileExists(path.join(projectPath, fileName))) return fileName;
  }
  return undefined;
}

async function analyzeNode(
  projectPath: string,
): Promise<Partial<StackAnalysis>> {
  const manifest = await fs
    .readJson(path.join(projectPath, "package.json"))
    .catch(() => ({}));
  const pkg = manifest as NodeManifest;
  const deps = pkg.dependencies ?? {};
  const devDeps = pkg.devDependencies ?? {};

  const frameworksRows: string[][] = [];
  const detectedFrameworks: string[] = [];
  if ("next" in deps) {
    frameworksRows.push([
      "Next.js",
      deps.next,
      "Framework principal para SSR y navegación",
    ]);
    detectedFrameworks.push(`Next.js ${deps.next}`);
  }
  if ("astro" in deps) {
    frameworksRows.push([
      "Astro",
      deps.astro,
      "Framework para widgets y microfrontends",
    ]);
    detectedFrameworks.push(`Astro ${deps.astro}`);
  }
  if ("react" in deps) {
    frameworksRows.push(["React", deps.react, "Librería UI para componentes"]);
    detectedFrameworks.push(`React ${deps.react}`);
  }
  if ("vue" in deps) {
    frameworksRows.push(["Vue", deps.vue, "Librería UI para componentes"]);
    detectedFrameworks.push(`Vue ${deps.vue}`);
  }

  const testingRows: string[][] = [];
  const detectedTesting: string[] = [];
  if ("jest" in devDeps) {
    testingRows.push([
      "Jest",
      devDeps.jest,
      "Unit testing y component testing",
    ]);
    detectedTesting.push(`Jest ${devDeps.jest}`);
  }
  if ("vitest" in devDeps) {
    testingRows.push(["Vitest", devDeps.vitest, "Unit testing"]);
    detectedTesting.push(`Vitest ${devDeps.vitest}`);
  }
  if ("cypress" in devDeps) {
    testingRows.push(["Cypress", devDeps.cypress, "End-to-End testing"]);
    detectedTesting.push(`Cypress ${devDeps.cypress}`);
  }
  if ("playwright" in devDeps) {
    testingRows.push(["Playwright", devDeps.playwright, "End-to-End testing"]);
    detectedTesting.push(`Playwright ${devDeps.playwright}`);
  }
  if ("storybook" in devDeps) {
    testingRows.push([
      "Storybook",
      devDeps.storybook,
      "Visual testing y documentación de componentes",
    ]);
    detectedTesting.push(`Storybook ${devDeps.storybook}`);
  }
  if ("@testing-library/react" in devDeps) {
    testingRows.push([
      "React Testing Library",
      devDeps["@testing-library/react"],
      "Testing de componentes React",
    ]);
  }

  const stylingRows: string[][] = [];
  const detectedStyling: string[] = [];
  if ("tailwindcss" in devDeps) {
    stylingRows.push([
      "Tailwind CSS",
      devDeps.tailwindcss,
      "Utility-first CSS framework",
    ]);
    detectedStyling.push(`Tailwind CSS ${devDeps.tailwindcss}`);
  }
  if ("@radix-ui/react-slot" in deps) {
    stylingRows.push(["Radix UI", "Varios", "Componentes headless accesibles"]);
    detectedStyling.push("Radix UI");
  }

  const buildRows: string[][] = [];
  if ("typescript" in devDeps) {
    buildRows.push(["TypeScript", devDeps.typescript, "Tipado estático"]);
  }
  if ("webpack" in devDeps) {
    buildRows.push(["Webpack", devDeps.webpack, "Module bundler"]);
  }
  if ("@tailwindcss/vite" in deps || "vite" in devDeps) {
    buildRows.push(["Vite", "-", "Build tool"]);
  }

  const prodDepsRows = Object.entries(deps).map(([pkgName, version]) => [
    pkgName,
    version,
    "-",
  ]);
  const devDepsRows = Object.entries(devDeps).map(([pkgName, version]) => [
    pkgName,
    version,
    "-",
  ]);

  const notes: string[] = [];
  if (await fileExists(path.join(projectPath, "tsconfig.json"))) {
    notes.push(
      "- Configuración de TypeScript (strict mode, path aliases): ver `2-architecture/architecture.md`",
    );
  }

  return {
    frameworksRows,
    testingRows,
    stylingRows,
    buildRows,
    prodDepsRows,
    devDepsRows,
    notes,
    detectedFrameworks,
    detectedTesting,
    detectedStyling,
  };
}

function extractTomlRange(
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

function extractPyProjectDependencies(blob: string): string[] {
  const lines = blob.split("\n");
  const byIndex = new Map<number, string>();

  const collect = (startPattern: RegExp, endPattern: RegExp): void => {
    let inRange = false;
    lines.forEach((line, index) => {
      if (!inRange) {
        if (startPattern.test(line)) {
          inRange = true;
          byIndex.set(index, line);
        }
        return;
      }
      byIndex.set(index, line);
      if (endPattern.test(line)) inRange = false;
    });
  };

  collect(/\[project\.dependencies\]/, /\]/);
  collect(/^dependencies\s*=\s*\[/, /\]/);

  const candidateLines = [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, line]) => line);

  return candidateLines
    .filter((line) => /["=]/.test(line))
    .filter((line) => !/^dependencies|^\[/.test(line.trim()))
    .map((line) => {
      const match = /^\s*"?([^",\s]+)/.exec(line);
      return match ? match[1] : "";
    })
    .filter((dep) => dep.length > 0 && dep !== "python");
}

async function analyzePython(
  projectPath: string,
): Promise<Partial<StackAnalysis>> {
  const frameworksRows: string[][] = [];
  const detectedFrameworks: string[] = [];
  const testingRows: string[][] = [];
  const detectedTesting: string[] = [];
  const prodDepsRows: string[][] = [];
  const configFilesRows: string[][] = [];

  const pyprojectPath = path.join(projectPath, "pyproject.toml");
  if (await fileExists(pyprojectPath)) {
    configFilesRows.push([
      "pyproject.toml",
      "Metadata y dependencias del proyecto (PEP 621 / Poetry)",
    ]);
    const blob = await fs.readFile(pyprojectPath, "utf-8");

    for (const fw of ["django", "flask", "fastapi"]) {
      const pattern = new RegExp(`"${fw}|^\\s*${fw}\\s*=`, "im");
      if (pattern.test(blob)) {
        const label = fw.charAt(0).toUpperCase() + fw.slice(1);
        frameworksRows.push([label, "-", "Framework web"]);
        detectedFrameworks.push(label);
      }
    }

    for (const tool of ["pytest", "tox"]) {
      const pattern = new RegExp(`^\\s*${tool}\\s*=|"${tool}`, "im");
      if (pattern.test(blob)) {
        testingRows.push([tool, "-", "Testing"]);
        detectedTesting.push(tool);
      }
    }

    for (const dep of extractPyProjectDependencies(blob)) {
      prodDepsRows.push([dep, "-", "-"]);
    }
  }

  const requirementsPath = path.join(projectPath, "requirements.txt");
  if (await fileExists(requirementsPath)) {
    configFilesRows.push(["requirements.txt", "Lista de dependencias (pip)"]);
    const content = await fs.readFile(requirementsPath, "utf-8");

    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const pkgMatch = /^([A-Za-z0-9._-]+)/.exec(line);
      const pkg = pkgMatch ? pkgMatch[1] : "";
      if (!pkg) continue;

      const versionSpec = line.slice(pkg.length);
      prodDepsRows.push([pkg, versionSpec, "-"]);

      const pkgLower = pkg.toLowerCase();
      for (const fw of ["django", "flask", "fastapi"]) {
        if (pkgLower === fw) {
          const label = fw.charAt(0).toUpperCase() + fw.slice(1);
          frameworksRows.push([label, versionSpec, "Framework web"]);
          detectedFrameworks.push(label);
        }
      }
      if (pkgLower === "pytest") {
        testingRows.push(["pytest", versionSpec, "Testing"]);
        detectedTesting.push("pytest");
      }
    }
  }

  return {
    frameworksRows,
    testingRows,
    stylingRows: [],
    buildRows: [],
    prodDepsRows,
    devDepsRows: [],
    configFilesRows,
    notes: [],
    detectedFrameworks,
    detectedTesting,
    detectedStyling: [],
    prodDepsLabel: "Dependencias",
    devDepsLabel: "Dependencias de Desarrollo (si están separadas)",
  };
}

async function analyzeGo(projectPath: string): Promise<Partial<StackAnalysis>> {
  const configFilesRows: string[][] = [
    ["go.mod", "Módulo y dependencias de Go"],
  ];
  const buildRows: string[][] = [];
  const prodDepsRows: string[][] = [];
  const frameworksRows: string[][] = [];
  const detectedFrameworks: string[] = [];
  const testingRows: string[][] = [];
  const detectedTesting: string[] = [];

  const goModPath = path.join(projectPath, "go.mod");
  const content = await fs.readFile(goModPath, "utf-8");
  const lines = content.split("\n");

  const goVersionLine = lines.find((line) => /^go /.test(line));
  const goVersion = goVersionLine
    ? goVersionLine.trim().split(/\s+/)[1]
    : undefined;
  buildRows.push(["Go", goVersion ?? "?", "Lenguaje y toolchain"]);

  const requireLines = extractTomlRange(lines, /^require \(/, /^\)/).filter(
    (line) => !/^require \(/.test(line) && !/^\)/.test(line),
  );

  for (const rawLine of requireLines) {
    const line = rawLine.trim();
    if (!line) continue;
    const [dep, ver] = line.split(/\s+/);
    if (!dep) continue;
    prodDepsRows.push([dep, ver ?? "", "-"]);

    if (dep.includes("gin-gonic/gin")) {
      frameworksRows.push(["Gin", ver ?? "", "Framework HTTP"]);
      detectedFrameworks.push("Gin");
    } else if (dep.includes("labstack/echo")) {
      frameworksRows.push(["Echo", ver ?? "", "Framework HTTP"]);
      detectedFrameworks.push("Echo");
    } else if (dep.includes("stretchr/testify")) {
      testingRows.push(["testify", ver ?? "", "Testing"]);
      detectedTesting.push("testify");
    }
  }

  return {
    frameworksRows,
    testingRows,
    stylingRows: [],
    buildRows,
    prodDepsRows,
    devDepsRows: [],
    configFilesRows,
    notes: [],
    detectedFrameworks,
    detectedTesting,
    detectedStyling: [],
    prodDepsLabel: "Dependencias (require)",
    devDepsLabel: "N/A (Go no distingue dev/prod en go.mod)",
  };
}

async function analyzeRust(
  projectPath: string,
): Promise<Partial<StackAnalysis>> {
  const configFilesRows: string[][] = [
    ["Cargo.toml", "Paquete y dependencias de Rust (Cargo)"],
  ];
  const buildRows: string[][] = [];
  const prodDepsRows: string[][] = [];
  const devDepsRows: string[][] = [];
  const frameworksRows: string[][] = [];
  const detectedFrameworks: string[] = [];

  const cargoTomlPath = path.join(projectPath, "Cargo.toml");
  const content = await fs.readFile(cargoTomlPath, "utf-8");
  const lines = content.split("\n");

  const depsSection = extractTomlRange(
    lines,
    /^\[dependencies\]/,
    /^\[/,
  ).filter((line) => !/^\[/.test(line) && line.includes("="));
  for (const line of depsSection) {
    const match = /^([A-Za-z0-9_-]+)/.exec(line);
    const dep = match ? match[1] : "";
    if (!dep) continue;
    prodDepsRows.push([dep, "-", "-"]);
    if (dep === "actix-web") {
      frameworksRows.push(["actix-web", "-", "Framework HTTP"]);
      detectedFrameworks.push("actix-web");
    } else if (dep === "axum") {
      frameworksRows.push(["axum", "-", "Framework HTTP"]);
      detectedFrameworks.push("axum");
    } else if (dep === "tokio") {
      buildRows.push(["tokio", "-", "Runtime async"]);
    }
  }

  const devDepsSection = extractTomlRange(
    lines,
    /^\[dev-dependencies\]/,
    /^\[/,
  ).filter((line) => !/^\[/.test(line) && line.includes("="));
  for (const line of devDepsSection) {
    const match = /^([A-Za-z0-9_-]+)/.exec(line);
    const dep = match ? match[1] : "";
    if (dep) devDepsRows.push([dep, "-", "-"]);
  }

  return {
    frameworksRows,
    testingRows: [],
    stylingRows: [],
    buildRows,
    prodDepsRows,
    devDepsRows,
    configFilesRows,
    notes: [],
    detectedFrameworks,
    detectedTesting: [],
    detectedStyling: [],
    prodDepsLabel: "Dependencias ([dependencies])",
    devDepsLabel: "Dependencias de Desarrollo ([dev-dependencies])",
  };
}

export async function analyzeStack(
  projectPath: string,
): Promise<StackAnalysis> {
  const ecosystem = await detectEcosystem(projectPath);

  const base: StackAnalysis = {
    ecosystem,
    frameworksRows: [],
    testingRows: [],
    stylingRows: [],
    buildRows: [],
    prodDepsRows: [],
    devDepsRows: [],
    configFilesRows: [],
    notes: [],
    prodDepsLabel: "Dependencias de Producción",
    devDepsLabel: "Dependencias de Desarrollo",
    detectedFrameworks: [],
    detectedTesting: [],
    detectedStyling: [],
  };

  let ecosystemResult: Partial<StackAnalysis> = {};
  if (ecosystem === "node") ecosystemResult = await analyzeNode(projectPath);
  else if (ecosystem === "python")
    ecosystemResult = await analyzePython(projectPath);
  else if (ecosystem === "go") ecosystemResult = await analyzeGo(projectPath);
  else if (ecosystem === "rust")
    ecosystemResult = await analyzeRust(projectPath);

  const merged: StackAnalysis = { ...base, ...ecosystemResult };

  const nextConfig = await findConfigFile(projectPath, "next.config", [
    "js",
    "ts",
    "mjs",
  ]);
  if (nextConfig) {
    merged.configFilesRows.push([
      nextConfig,
      "Configuración de Next.js (SSR, redirects, rewrites)",
    ]);
  }

  const astroConfig = await findConfigFile(projectPath, "astro.config", [
    "js",
    "ts",
    "mjs",
  ]);
  if (astroConfig) {
    merged.configFilesRows.push([
      astroConfig,
      "Configuración de Astro (integrations, output)",
    ]);
  }

  if (await fileExists(path.join(projectPath, "tsconfig.json"))) {
    merged.configFilesRows.push([
      "tsconfig.json",
      "Configuración de TypeScript (strict mode, path aliases)",
    ]);
  }

  const tailwindConfig = await findConfigFile(projectPath, "tailwind.config", [
    "ts",
    "js",
  ]);
  if (tailwindConfig) {
    merged.configFilesRows.push([
      tailwindConfig,
      "Configuración de Tailwind CSS (temas, plugins)",
    ]);
  }

  const jestConfig = await findConfigFile(projectPath, "jest.config", [
    "js",
    "ts",
  ]);
  if (jestConfig) {
    merged.configFilesRows.push([
      jestConfig,
      "Configuración de Jest (test environment, coverage)",
    ]);
  }

  const cypressConfig = await findConfigFile(projectPath, "cypress.config", [
    "ts",
    "js",
  ]);
  if (cypressConfig) {
    merged.configFilesRows.push([
      cypressConfig,
      "Configuración de Cypress (E2E tests)",
    ]);
  }

  return merged;
}

export function buildStackOverview(analysis: StackAnalysis): string {
  const parts: string[] = [];
  if (analysis.detectedFrameworks.length > 0) {
    parts.push(
      `Frameworks/librerías principales: ${analysis.detectedFrameworks.join(", ")}.`,
    );
  }
  if (analysis.detectedTesting.length > 0) {
    parts.push(`Testing: ${analysis.detectedTesting.join(", ")}.`);
  }
  if (analysis.detectedStyling.length > 0) {
    parts.push(`Styling: ${analysis.detectedStyling.join(", ")}.`);
  }

  if (parts.length === 0) {
    return `Ecosistema detectado: **${analysis.ecosystem}**. No se identificaron frameworks, herramientas de testing o styling reconocidas automáticamente a partir del manifiesto — revisar manualmente o ampliar la detección de este script.`;
  }
  return `Ecosistema detectado: **${analysis.ecosystem}**. ${parts.join(" ")}`;
}

export function renderTableRows(rows: string[][]): string {
  return rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
}
