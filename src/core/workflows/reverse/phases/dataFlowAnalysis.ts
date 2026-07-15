import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../../../utils/fs.js";

export interface DataFlowAnalysis {
  overview: string;
  apiAnalysis: string;
  stateAnalysis: string;
  errorAnalysis: string;
  envAnalysis: string;
  cacheAnalysis: string;
  dataflowDiagram: string;
}

const SRC_EXTENSIONS = [".ts", ".tsx"];

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

async function countFilesContaining(
  dir: string,
  pattern: RegExp,
): Promise<number> {
  const files = await walkFiles(dir);
  const candidates = files.filter((file) =>
    SRC_EXTENSIONS.some((ext) => file.endsWith(ext)),
  );
  let count = 0;
  for (const file of candidates) {
    const content = await fs.readFile(file, "utf-8");
    if (pattern.test(content)) count += 1;
  }
  return count;
}

async function anyFileContains(dir: string, pattern: RegExp): Promise<boolean> {
  return (await countFilesContaining(dir, pattern)) > 0;
}

async function listDotEnvFiles(projectPath: string): Promise<string[]> {
  if (!(await fileExists(projectPath))) return [];
  const entries = await fs.readdir(projectPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.startsWith(".env"))
    .map((entry) => path.join(projectPath, entry.name));
}

async function buildApiAnalysis(srcDir: string): Promise<string> {
  let analysis = "## 🌐 Llamadas a APIs\n\n";

  const fetchCalls = await countFilesContaining(srcDir, /fetch\(/);
  if (fetchCalls > 0) {
    analysis += `- **Fetch API**: ${fetchCalls} archivos utilizan fetch nativo\n`;
  }

  analysis += (await anyFileContains(srcDir, /axios\./))
    ? "- **Axios**: Detectado\n"
    : "- **Axios**: No utilizado\n";

  analysis += (await anyFileContains(
    srcDir,
    /@tanstack\/react-query|useQuery|useMutation/,
  ))
    ? "- **React Query**: Detectado\n"
    : "- **React Query**: No utilizado\n";

  if (
    (await fileExists(path.join(srcDir, "core", "drivers"))) &&
    (await fileExists(path.join(srcDir, "core", "adapters")))
  ) {
    analysis +=
      "\n### Patrón de Acceso a Datos\n\nSe detectó `src/core/drivers/` y `src/core/adapters/`: consistente con llamadas a APIs vía drivers que implementan interfaces de adapters (patrón Repository).\n";
  }

  return analysis;
}

async function buildStateAnalysis(srcDir: string): Promise<{
  stateAnalysis: string;
  hasGlobalStore: boolean;
}> {
  let analysis = "## 📊 Manejo de Estado\n\n";

  const stateHooks = await countFilesContaining(srcDir, /useState|useReducer/);
  if (stateHooks > 0) {
    analysis += `- **useState/useReducer**: ${stateHooks} archivos\n`;
  }

  analysis += (await anyFileContains(srcDir, /useContext|createContext/))
    ? "- **Context API**: Detectada\n"
    : "- **Context API**: No utilizada\n";

  analysis += (await anyFileContains(srcDir, /zustand|create\(/))
    ? "- **Zustand**: Detectado\n"
    : "- **Zustand**: No utilizado\n";

  analysis += (await anyFileContains(srcDir, /redux|createStore/))
    ? "- **Redux**: Detectado\n"
    : "- **Redux**: No utilizado\n";

  const hasGlobalStore = await anyFileContains(
    srcDir,
    /zustand|redux|createStore/,
  );
  analysis += hasGlobalStore
    ? "\n### Estrategia de Estado\n\nSe detectó uso de un store global (Redux y/o Zustand) además de estado local — ver el detalle arriba para cuál.\n"
    : "\n### Estrategia de Estado\n\nNo se detectó un store global (Redux/Zustand) en las búsquedas anteriores; el estado observado es local a los componentes (useState/useReducer/Context).\n";

  if (await fileExists(path.join(srcDir, "core", "interactors"))) {
    analysis +=
      "\nSe detectó `src/core/interactors/`: consistente con estado de negocio orquestado ahí y pasado a componentes via props.\n";
  }

  return { stateAnalysis: analysis, hasGlobalStore };
}

async function buildErrorAnalysis(srcDir: string): Promise<string> {
  let analysis = "## ⚠️ Manejo de Errores\n\n";

  const errorHandling = await countFilesContaining(
    srcDir,
    /try.*catch|catch.*error/,
  );
  if (errorHandling > 0) {
    analysis += `- **Try/Catch**: ${errorHandling} archivos\n`;
  }

  analysis += (await anyFileContains(srcDir, /ErrorBoundary|componentDidCatch/))
    ? "- **Error Boundaries**: Detectados\n"
    : "- **Error Boundaries**: No detectados\n";

  const customErrors = await countFilesContaining(
    srcDir,
    /throw new Error|throw new.*Error/,
  );
  if (customErrors > 0) {
    analysis += `- **Custom errors**: ${customErrors} archivos\n`;
  }

  const exceptionsDir = path.join(srcDir, "core", "exceptions");
  if (await fileExists(exceptionsDir)) {
    const files = await walkFiles(exceptionsDir);
    const exceptionsCount = files.filter((file) => file.endsWith(".ts")).length;
    analysis += `\n### Excepciones de Dominio\n\nSe detectó \`src/core/exceptions/\` (${exceptionsCount} archivos): posibles excepciones de dominio personalizadas.\n`;
  }

  return analysis;
}

async function buildEnvAnalysis(
  projectPath: string,
  srcDir: string,
): Promise<string> {
  let analysis = "## 🔐 Variables de Entorno\n\n";

  const gateFiles = [".env", ".env.local", ".env.development"];
  const hasEnvFile = (
    await Promise.all(
      gateFiles.map((name) => fileExists(path.join(projectPath, name))),
    )
  ).some(Boolean);

  const envFiles = await listDotEnvFiles(projectPath);

  if (hasEnvFile) {
    analysis += "- **Archivos .env**: Detectados\n";

    let envVars = 0;
    for (const envFile of envFiles) {
      const content = await fs.readFile(envFile, "utf-8");
      envVars += content
        .split("\n")
        .filter((line) => /NEXT_PUBLIC_|PUBLIC_/.test(line)).length;
    }
    analysis += `- **Variables públicas**: ${envVars}\n`;
  }

  const envUsage = await countFilesContaining(
    srcDir,
    /process\.env|import\.meta\.env/,
  );
  if (envUsage > 0) {
    analysis += `- **Uso en código**: ${envUsage} archivos\n`;
  }

  if (hasEnvFile) {
    const names = new Set<string>();
    for (const envFile of envFiles) {
      const content = await fs.readFile(envFile, "utf-8");
      for (const line of content.split("\n")) {
        const match = /^[A-Z_][A-Z0-9_]*/.exec(line);
        if (match) names.add(match[0]);
      }
    }
    const sortedNames = [...names].sort().slice(0, 15);

    if (sortedNames.length > 0) {
      analysis += "\n### Nombres de Variables Detectados (hasta 15)\n\n";
      for (const name of sortedNames) {
        analysis += `- \`${name}\`\n`;
      }
      analysis +=
        "\n_El propósito de cada variable no se infiere automáticamente — completar según el proyecto real._\n";
    }
  }

  return analysis;
}

async function buildCacheAnalysis(srcDir: string): Promise<string> {
  let analysis = "## 💾 Estrategias de Caché\n\n";

  analysis += (await anyFileContains(
    srcDir,
    /cache.*force-cache|cache.*no-store/,
  ))
    ? "- **Fetch cache strategies**: Detectadas\n"
    : "- **Fetch cache strategies**: No detectadas\n";

  analysis += (await anyFileContains(srcDir, /revalidate|ISR/))
    ? "- **ISR**: Detectado\n"
    : "- **ISR**: No utilizado\n";

  analysis += (await anyFileContains(srcDir, /localStorage|sessionStorage/))
    ? "- **Web Storage**: Detectado\n"
    : "- **Web Storage**: No utilizado\n";

  return analysis;
}

const CLEAN_ARCHITECTURE_DIAGRAM = `\`\`\`
┌─────────────────┐
│   Componente    │ ← Recibe datos via props
│   (React UI)    │
└────────┬────────┘
         │ user action
         ▼
┌─────────────────┐
│    Interactor   │ ← Orquesta caso de uso
│  (Use Case)     │
└────────┬────────┘
         │ calls adapter
         ▼
┌─────────────────┐
│     Driver      │ ← Implementación concreta
│  (Repository)   │ ← Llama a APIs externas
└────────┬────────┘
         │ HTTP request
         ▼
┌─────────────────┐
│   External API  │
└─────────────────┘
\`\`\``;

export async function analyzeDataFlow(
  projectPath: string,
): Promise<DataFlowAnalysis> {
  const srcDir = path.join(projectPath, "src");

  const apiAnalysis = await buildApiAnalysis(srcDir);
  const { stateAnalysis, hasGlobalStore } = await buildStateAnalysis(srcDir);
  const errorAnalysis = await buildErrorAnalysis(srcDir);
  const envAnalysis = await buildEnvAnalysis(projectPath, srcDir);
  const cacheAnalysis = await buildCacheAnalysis(srcDir);

  const hasCleanArchDataflow =
    (await fileExists(path.join(srcDir, "core", "drivers"))) &&
    (await fileExists(path.join(srcDir, "core", "interactors")));

  let overview = hasCleanArchDataflow
    ? "Se detectó `src/core/interactors/` y `src/core/drivers/`, consistente con un flujo de datos estilo Clean Architecture: componentes reciben datos via props, interactors orquestan la lógica, drivers hablan con APIs externas."
    : "No se detectó la convención `src/core/interactors` + `src/core/drivers`; ver el detalle de API/estado/errores abajo para el flujo de datos real de este proyecto.";
  if (!hasGlobalStore) {
    overview +=
      " El estado observado es principalmente local (useState/useReducer).";
  }

  const dataflowDiagram = hasCleanArchDataflow
    ? CLEAN_ARCHITECTURE_DIAGRAM
    : "_No se detectó la convención `src/core/interactors` + `src/core/drivers` para dibujar este diagrama de forma confiable. Completar manualmente a partir del detalle de API/estado arriba._";

  return {
    overview,
    apiAnalysis,
    stateAnalysis,
    errorAnalysis,
    envAnalysis,
    cacheAnalysis,
    dataflowDiagram,
  };
}
