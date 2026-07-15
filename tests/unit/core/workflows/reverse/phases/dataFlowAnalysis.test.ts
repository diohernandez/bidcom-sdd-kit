import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { analyzeDataFlow } from "../../../../../../src/core/workflows/reverse/phases/dataFlowAnalysis.js";

describe("core/workflows/reverse/phases/dataFlowAnalysis", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-dataflow-analysis-"),
    );
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("reports the always-on/off toggles with their default 'not used' state", async () => {
    const actualAnalysis = await analyzeDataFlow(tempDir);

    expect(actualAnalysis.apiAnalysis).toBe(
      "## 🌐 Llamadas a APIs\n\n- **Axios**: No utilizado\n- **React Query**: No utilizado\n",
    );
    expect(actualAnalysis.stateAnalysis).toContain(
      "- **Context API**: No utilizada\n",
    );
    expect(actualAnalysis.stateAnalysis).toContain(
      "- **Zustand**: No utilizado\n",
    );
    expect(actualAnalysis.stateAnalysis).toContain(
      "- **Redux**: No utilizado\n",
    );
    expect(actualAnalysis.stateAnalysis).toContain(
      "No se detectó un store global (Redux/Zustand)",
    );
    expect(actualAnalysis.errorAnalysis).toContain(
      "- **Error Boundaries**: No detectados\n",
    );
    expect(actualAnalysis.cacheAnalysis).toBe(
      "## 💾 Estrategias de Caché\n\n- **Fetch cache strategies**: No detectadas\n- **ISR**: No utilizado\n- **Web Storage**: No utilizado\n",
    );
    expect(actualAnalysis.envAnalysis).toBe("## 🔐 Variables de Entorno\n\n");
  });

  it("detects fetch/axios/react-query API usage", async () => {
    await fs.ensureDir(path.join(tempDir, "src"));
    await fs.writeFile(
      path.join(tempDir, "src", "api.ts"),
      "fetch('/x')\naxios.get('/y')\nuseQuery(['x'], fetcher)",
    );

    const actualAnalysis = await analyzeDataFlow(tempDir);

    expect(actualAnalysis.apiAnalysis).toContain(
      "- **Fetch API**: 1 archivos utilizan fetch nativo",
    );
    expect(actualAnalysis.apiAnalysis).toContain("- **Axios**: Detectado");
    expect(actualAnalysis.apiAnalysis).toContain(
      "- **React Query**: Detectado",
    );
  });

  it("describes the Repository pattern when drivers and adapters both exist", async () => {
    await fs.ensureDir(path.join(tempDir, "src", "core", "drivers"));
    await fs.ensureDir(path.join(tempDir, "src", "core", "adapters"));

    const actualAnalysis = await analyzeDataFlow(tempDir);

    expect(actualAnalysis.apiAnalysis).toContain(
      "### Patrón de Acceso a Datos",
    );
    expect(actualAnalysis.overview).toContain("No se detectó la convención");
  });

  it("builds the clean-architecture overview and diagram when drivers and interactors exist", async () => {
    await fs.ensureDir(path.join(tempDir, "src", "core", "drivers"));
    await fs.ensureDir(path.join(tempDir, "src", "core", "interactors"));

    const actualAnalysis = await analyzeDataFlow(tempDir);

    expect(actualAnalysis.overview).toContain(
      "consistente con un flujo de datos estilo Clean Architecture",
    );
    expect(actualAnalysis.overview).toContain(
      "El estado observado es principalmente local",
    );
    expect(actualAnalysis.dataflowDiagram).toContain("┌─────────────────┐");
    expect(actualAnalysis.stateAnalysis).toContain(
      "Se detectó `src/core/interactors/`",
    );
  });

  it("detects a global store and adjusts the overview accordingly", async () => {
    await fs.ensureDir(path.join(tempDir, "src"));
    await fs.writeFile(
      path.join(tempDir, "src", "store.ts"),
      "import { create } from 'zustand'",
    );

    const actualAnalysis = await analyzeDataFlow(tempDir);

    expect(actualAnalysis.stateAnalysis).toContain("- **Zustand**: Detectado");
    expect(actualAnalysis.stateAnalysis).toContain(
      "Se detectó uso de un store global (Redux y/o Zustand)",
    );
    expect(actualAnalysis.overview).not.toContain(
      "El estado observado es principalmente local",
    );
  });

  it("reports domain exceptions count when src/core/exceptions exists", async () => {
    await fs.ensureDir(path.join(tempDir, "src", "core", "exceptions"));
    await fs.writeFile(
      path.join(tempDir, "src", "core", "exceptions", "NotFoundError.ts"),
      "",
    );

    const actualAnalysis = await analyzeDataFlow(tempDir);

    expect(actualAnalysis.errorAnalysis).toContain(
      "Se detectó `src/core/exceptions/` (1 archivos)",
    );
  });

  it("counts public env vars and lists variable names up to 15, sorted", async () => {
    await fs.writeFile(
      path.join(tempDir, ".env"),
      [
        "NEXT_PUBLIC_API_URL=https://x",
        "SECRET_KEY=abc",
        "PUBLIC_FLAG=true",
      ].join("\n"),
    );
    await fs.writeFile(path.join(tempDir, ".env.local"), "ANOTHER_VAR=1");

    const actualAnalysis = await analyzeDataFlow(tempDir);

    expect(actualAnalysis.envAnalysis).toContain(
      "- **Archivos .env**: Detectados",
    );
    expect(actualAnalysis.envAnalysis).toContain("- **Variables públicas**: 2");
    expect(actualAnalysis.envAnalysis).toContain(
      "### Nombres de Variables Detectados (hasta 15)",
    );
    expect(actualAnalysis.envAnalysis).toContain("- `ANOTHER_VAR`");
    expect(actualAnalysis.envAnalysis).toContain("- `NEXT_PUBLIC_API_URL`");
    expect(actualAnalysis.envAnalysis).toContain("- `PUBLIC_FLAG`");
    expect(actualAnalysis.envAnalysis).toContain("- `SECRET_KEY`");
  });

  it("reports env usage in code separately from env file detection", async () => {
    await fs.ensureDir(path.join(tempDir, "src"));
    await fs.writeFile(
      path.join(tempDir, "src", "config.ts"),
      "process.env.NODE_ENV",
    );

    const actualAnalysis = await analyzeDataFlow(tempDir);

    expect(actualAnalysis.envAnalysis).toBe(
      "## 🔐 Variables de Entorno\n\n- **Uso en código**: 1 archivos\n",
    );
  });
});
