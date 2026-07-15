import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import {
  analyzeStack,
  buildStackOverview,
  renderTableRows,
} from "../../../../../../src/core/workflows/reverse/phases/stackAnalysis.js";

describe("core/workflows/reverse/phases/stackAnalysis", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-stack-analysis-"),
    );
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe("analyzeStack — node ecosystem", () => {
    it("detects frameworks, testing and styling tools with their raw versions", async () => {
      await fs.writeJson(path.join(tempDir, "package.json"), {
        dependencies: {
          next: "^15.3.8",
          react: "19.0.0",
          "@radix-ui/react-slot": "^1.0.0",
        },
        devDependencies: {
          jest: "^29.0.0",
          tailwindcss: "^4.0.0",
          typescript: "^5.5.0",
        },
      });

      const actualAnalysis = await analyzeStack(tempDir);

      expect(actualAnalysis.ecosystem).toBe("node");
      expect(actualAnalysis.frameworksRows).toEqual([
        ["Next.js", "^15.3.8", "Framework principal para SSR y navegación"],
        ["React", "19.0.0", "Librería UI para componentes"],
      ]);
      expect(actualAnalysis.testingRows).toEqual([
        ["Jest", "^29.0.0", "Unit testing y component testing"],
      ]);
      expect(actualAnalysis.stylingRows).toEqual([
        ["Tailwind CSS", "^4.0.0", "Utility-first CSS framework"],
        ["Radix UI", "Varios", "Componentes headless accesibles"],
      ]);
      expect(actualAnalysis.buildRows).toEqual([
        ["TypeScript", "^5.5.0", "Tipado estático"],
      ]);
      expect(actualAnalysis.detectedFrameworks).toEqual([
        "Next.js ^15.3.8",
        "React 19.0.0",
      ]);
      expect(actualAnalysis.detectedStyling).toEqual([
        "Tailwind CSS ^4.0.0",
        "Radix UI",
      ]);
    });

    it("lists production and dev dependencies preserving package.json order", async () => {
      await fs.writeJson(path.join(tempDir, "package.json"), {
        dependencies: { zod: "^3.0.0", chalk: "^5.0.0" },
        devDependencies: { eslint: "^9.0.0" },
      });

      const actualAnalysis = await analyzeStack(tempDir);

      expect(actualAnalysis.prodDepsRows).toEqual([
        ["zod", "^3.0.0", "-"],
        ["chalk", "^5.0.0", "-"],
      ]);
      expect(actualAnalysis.devDepsRows).toEqual([["eslint", "^9.0.0", "-"]]);
      expect(actualAnalysis.prodDepsLabel).toBe("Dependencias de Producción");
      expect(actualAnalysis.devDepsLabel).toBe("Dependencias de Desarrollo");
    });

    it("detects vite when either @tailwindcss/vite or vite is present, only once", async () => {
      await fs.writeJson(path.join(tempDir, "package.json"), {
        dependencies: { "@tailwindcss/vite": "^4.0.0" },
        devDependencies: { vite: "^5.0.0" },
      });

      const actualAnalysis = await analyzeStack(tempDir);

      expect(actualAnalysis.buildRows).toEqual([["Vite", "-", "Build tool"]]);
    });

    it("adds a note pointing to the architecture doc when tsconfig.json exists", async () => {
      await fs.writeJson(path.join(tempDir, "package.json"), {});
      await fs.writeFile(path.join(tempDir, "tsconfig.json"), "{}");

      const actualAnalysis = await analyzeStack(tempDir);

      expect(actualAnalysis.notes).toEqual([
        "- Configuración de TypeScript (strict mode, path aliases): ver `2-architecture/architecture.md`",
      ]);
    });

    it("detects additional config files regardless of ecosystem-specific ones", async () => {
      await fs.writeJson(path.join(tempDir, "package.json"), {});
      await fs.writeFile(path.join(tempDir, "next.config.mjs"), "");
      await fs.writeFile(path.join(tempDir, "next.config.js"), "");
      await fs.writeFile(path.join(tempDir, "tailwind.config.ts"), "");
      await fs.writeFile(path.join(tempDir, "cypress.config.ts"), "");

      const actualAnalysis = await analyzeStack(tempDir);

      expect(actualAnalysis.configFilesRows).toEqual([
        [
          "next.config.js",
          "Configuración de Next.js (SSR, redirects, rewrites)",
        ],
        [
          "tailwind.config.ts",
          "Configuración de Tailwind CSS (temas, plugins)",
        ],
        ["cypress.config.ts", "Configuración de Cypress (E2E tests)"],
      ]);
    });
  });

  describe("analyzeStack — python ecosystem", () => {
    it("detects frameworks and testing tools declared in pyproject.toml (poetry style)", async () => {
      await fs.writeFile(
        path.join(tempDir, "pyproject.toml"),
        [
          "[tool.poetry.dependencies]",
          'python = "^3.11"',
          'fastapi = "^0.100.0"',
          'pytest = "^7.0.0"',
        ].join("\n"),
      );

      const actualAnalysis = await analyzeStack(tempDir);

      expect(actualAnalysis.ecosystem).toBe("python");
      expect(actualAnalysis.frameworksRows).toEqual([
        ["Fastapi", "-", "Framework web"],
      ]);
      expect(actualAnalysis.testingRows).toEqual([["pytest", "-", "Testing"]]);
      expect(actualAnalysis.prodDepsLabel).toBe("Dependencias");
      expect(actualAnalysis.configFilesRows).toEqual([
        [
          "pyproject.toml",
          "Metadata y dependencias del proyecto (PEP 621 / Poetry)",
        ],
      ]);
    });

    it("extracts PEP 621 style dependency arrays, excluding python itself", async () => {
      await fs.writeFile(
        path.join(tempDir, "pyproject.toml"),
        [
          "[project]",
          "dependencies = [",
          '  "django",',
          '  "requests",',
          "]",
        ].join("\n"),
      );

      const actualAnalysis = await analyzeStack(tempDir);

      expect(actualAnalysis.prodDepsRows).toEqual(
        expect.arrayContaining([
          ["django", "-", "-"],
          ["requests", "-", "-"],
        ]),
      );
      expect(actualAnalysis.frameworksRows).toEqual([
        ["Django", "-", "Framework web"],
      ]);
    });

    it("parses requirements.txt lines and attributes framework/testing rows with their version spec", async () => {
      await fs.writeFile(
        path.join(tempDir, "requirements.txt"),
        ["# comment", "", "Flask==2.3.0", "pytest>=7.0"].join("\n"),
      );

      const actualAnalysis = await analyzeStack(tempDir);

      expect(actualAnalysis.prodDepsRows).toEqual([
        ["Flask", "==2.3.0", "-"],
        ["pytest", ">=7.0", "-"],
      ]);
      expect(actualAnalysis.frameworksRows).toEqual([
        ["Flask", "==2.3.0", "Framework web"],
      ]);
      expect(actualAnalysis.testingRows).toEqual([
        ["pytest", ">=7.0", "Testing"],
      ]);
      expect(actualAnalysis.configFilesRows).toEqual([
        ["requirements.txt", "Lista de dependencias (pip)"],
      ]);
    });
  });

  describe("analyzeStack — go ecosystem", () => {
    it("parses go.mod module version and require block, detecting known frameworks", async () => {
      await fs.writeFile(
        path.join(tempDir, "go.mod"),
        [
          "module example.com/app",
          "",
          "go 1.22",
          "",
          "require (",
          "\tgithub.com/gin-gonic/gin v1.9.1",
          "\tgithub.com/stretchr/testify v1.8.4",
          ")",
        ].join("\n"),
      );

      const actualAnalysis = await analyzeStack(tempDir);

      expect(actualAnalysis.ecosystem).toBe("go");
      expect(actualAnalysis.buildRows).toEqual([
        ["Go", "1.22", "Lenguaje y toolchain"],
      ]);
      expect(actualAnalysis.frameworksRows).toEqual([
        ["Gin", "v1.9.1", "Framework HTTP"],
      ]);
      expect(actualAnalysis.testingRows).toEqual([
        ["testify", "v1.8.4", "Testing"],
      ]);
      expect(actualAnalysis.prodDepsLabel).toBe("Dependencias (require)");
    });
  });

  describe("analyzeStack — rust ecosystem", () => {
    it("parses Cargo.toml dependency sections, detecting known frameworks", async () => {
      await fs.writeFile(
        path.join(tempDir, "Cargo.toml"),
        [
          "[package]",
          'name = "app"',
          'version = "0.1.0"',
          "",
          "[dependencies]",
          'axum = "0.7"',
          'tokio = "1"',
          "",
          "[dev-dependencies]",
          'mockall = "0.12"',
        ].join("\n"),
      );

      const actualAnalysis = await analyzeStack(tempDir);

      expect(actualAnalysis.ecosystem).toBe("rust");
      expect(actualAnalysis.frameworksRows).toEqual([
        ["axum", "-", "Framework HTTP"],
      ]);
      expect(actualAnalysis.buildRows).toEqual([
        ["tokio", "-", "Runtime async"],
      ]);
      expect(actualAnalysis.devDepsRows).toEqual([["mockall", "-", "-"]]);
    });
  });

  describe("analyzeStack — unknown ecosystem", () => {
    it("falls back to unknown when no recognized manifest exists", async () => {
      const actualAnalysis = await analyzeStack(tempDir);

      expect(actualAnalysis.ecosystem).toBe("unknown");
      expect(actualAnalysis.frameworksRows).toEqual([]);
      expect(actualAnalysis.prodDepsLabel).toBe("Dependencias de Producción");
    });
  });

  describe("buildStackOverview", () => {
    it("builds a sentence from detected frameworks, testing and styling", () => {
      const actualOverview = buildStackOverview({
        ecosystem: "node",
        frameworksRows: [],
        testingRows: [],
        stylingRows: [],
        buildRows: [],
        prodDepsRows: [],
        devDepsRows: [],
        configFilesRows: [],
        notes: [],
        prodDepsLabel: "",
        devDepsLabel: "",
        detectedFrameworks: ["Next.js 15.3.8"],
        detectedTesting: ["Jest 29.0.0"],
        detectedStyling: [],
      });

      expect(actualOverview).toBe(
        "Ecosistema detectado: **node**. Frameworks/librerías principales: Next.js 15.3.8. Testing: Jest 29.0.0.",
      );
    });

    it("falls back to a neutral message when nothing was detected", () => {
      const actualOverview = buildStackOverview({
        ecosystem: "unknown",
        frameworksRows: [],
        testingRows: [],
        stylingRows: [],
        buildRows: [],
        prodDepsRows: [],
        devDepsRows: [],
        configFilesRows: [],
        notes: [],
        prodDepsLabel: "",
        devDepsLabel: "",
        detectedFrameworks: [],
        detectedTesting: [],
        detectedStyling: [],
      });

      expect(actualOverview).toBe(
        "Ecosistema detectado: **unknown**. No se identificaron frameworks, herramientas de testing o styling reconocidas automáticamente a partir del manifiesto — revisar manualmente o ampliar la detección de este script.",
      );
    });
  });

  describe("renderTableRows", () => {
    it("joins rows into markdown table lines without a trailing newline", () => {
      expect(
        renderTableRows([
          ["a", "b"],
          ["c", "d"],
        ]),
      ).toBe("| a | b |\n| c | d |");
    });

    it("renders an empty string for no rows", () => {
      expect(renderTableRows([])).toBe("");
    });
  });
});
