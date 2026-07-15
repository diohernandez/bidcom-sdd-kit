import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { analyzeIntegration } from "../../../../../../src/core/workflows/reverse/phases/integrationAnalysis.js";

describe("core/workflows/reverse/phases/integrationAnalysis", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-integration-analysis-"),
    );
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("reports no frameworks detected when neither next.config nor astro.config exist", async () => {
    const actualAnalysis = await analyzeIntegration(tempDir);

    expect(actualAnalysis.detectedFrameworks).toEqual([]);
    expect(actualAnalysis.overview).toContain(
      "No se detectó configuración de Next.js ni de Astro",
    );
    expect(actualAnalysis.nextjsAnalysis).toBe("");
  });

  it("analyzes Next.js app router pages, api routes, client and server components", async () => {
    await fs.writeFile(path.join(tempDir, "next.config.js"), "");
    await fs.ensureDir(path.join(tempDir, "src", "app", "api", "users"));
    await fs.writeFile(
      path.join(tempDir, "src", "app", "page.tsx"),
      "export default function Home() {}",
    );
    await fs.writeFile(
      path.join(tempDir, "src", "app", "api", "users", "route.ts"),
      "export async function GET() {}",
    );
    await fs.writeFile(
      path.join(tempDir, "src", "app", "Header.tsx"),
      "'use client'\nexport function Header() {}",
    );

    const actualAnalysis = await analyzeIntegration(tempDir);

    expect(actualAnalysis.detectedFrameworks).toEqual(["Next.js"]);
    expect(actualAnalysis.nextjsAnalysis).toContain(
      "- **App Router**: 1 páginas",
    );
    expect(actualAnalysis.nextjsAnalysis).toContain(
      "- **API Routes**: 1 rutas",
    );
    expect(actualAnalysis.nextjsAnalysis).toContain(
      "- **Client Components**: 1 (con 'use client')",
    );
    expect(actualAnalysis.nextjsAnalysis).toContain(
      "- **Server Components**: Detectados (funciones async en App Router)",
    );
    expect(actualAnalysis.overview).toContain("El proyecto usa **Next.js**");
  });

  it("analyzes Astro pages, widgets and hydration directives", async () => {
    await fs.writeFile(path.join(tempDir, "astro.config.mjs"), "");
    await fs.ensureDir(path.join(tempDir, "src", "astro", "pages", "widgets"));
    await fs.writeFile(
      path.join(tempDir, "src", "astro", "index.astro"),
      "<div></div>",
    );
    await fs.writeFile(
      path.join(tempDir, "src", "astro", "pages", "widgets", "Header.astro"),
      "<Header client:load />",
    );
    await fs.writeFile(
      path.join(tempDir, "src", "astro", "pages", "widgets", "Footer.astro"),
      "<Footer />",
    );

    const actualAnalysis = await analyzeIntegration(tempDir);

    expect(actualAnalysis.detectedFrameworks).toEqual(["Astro"]);
    expect(actualAnalysis.astroAnalysis).toContain("- **Páginas Astro**: 3");
    expect(actualAnalysis.astroAnalysis).toContain(
      "- **Widgets**: 2 puntos de entrada para microfrontends",
    );
    expect(actualAnalysis.widgetsList).toBe(
      "### Widgets Disponibles\n\n| Widget | Descripción |\n|--------|-------------|\n| `Footer` | Widget de Footer |\n| `Header` | Widget de Header |\n",
    );
    expect(actualAnalysis.hydrationAnalysis).toContain(
      "**Componentes con hidratación**: 1",
    );
    expect(actualAnalysis.notes).toEqual([
      "- Se detectó configuración de Astro (`astro.config.*`); revisar el comando de build específico del proyecto (ej. `package.json` scripts)",
      "- La hidratación selectiva de Astro minimiza el JavaScript enviado al cliente",
    ]);
  });

  it("describes dual framework integration and shared components when both exist", async () => {
    await fs.writeFile(path.join(tempDir, "next.config.js"), "");
    await fs.writeFile(path.join(tempDir, "astro.config.js"), "");
    await fs.ensureDir(path.join(tempDir, "src", "app"));
    await fs.ensureDir(path.join(tempDir, "src", "astro"));
    await fs.ensureDir(path.join(tempDir, "src", "components"));
    await fs.writeFile(
      path.join(tempDir, "src", "components", "Button.tsx"),
      "",
    );

    const actualAnalysis = await analyzeIntegration(tempDir);

    expect(actualAnalysis.detectedFrameworks).toEqual(["Next.js", "Astro"]);
    expect(actualAnalysis.overview).toContain(
      "El proyecto integra **Next.js y Astro**",
    );
    expect(actualAnalysis.sharedComponentsAnalysis).toContain(
      "**Total de componentes compartidos**: 1",
    );
    expect(actualAnalysis.sharedComponentsAnalysis).toContain(
      "### Dual Framework Usage",
    );
  });

  it("detects Module Federation from package.json contents", async () => {
    await fs.writeJson(path.join(tempDir, "package.json"), {
      devDependencies: { "@module-federation/nextjs-mf": "^8.0.0" },
    });

    const actualAnalysis = await analyzeIntegration(tempDir);

    expect(actualAnalysis.microfrontendAnalysis).toContain(
      "- **Module Federation**: Detectado",
    );
  });
});
