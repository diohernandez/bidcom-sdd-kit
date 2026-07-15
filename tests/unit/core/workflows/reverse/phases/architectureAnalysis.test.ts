import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import {
  analyzeArchitecture,
  buildArchitectureOverview,
} from "../../../../../../src/core/workflows/reverse/phases/architectureAnalysis.js";

describe("core/workflows/reverse/phases/architectureAnalysis", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-arch-analysis-"),
    );
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe("layer convention detection", () => {
    it("detects clean-architecture when src/core has any of its sublayers", async () => {
      await fs.ensureDir(path.join(tempDir, "src", "core", "entities"));
      await fs.writeFile(
        path.join(tempDir, "src", "core", "entities", "User.ts"),
        "export class User {}",
      );

      const actualAnalysis = await analyzeArchitecture(tempDir);

      expect(actualAnalysis.layerConvention).toBe("clean-architecture");
      expect(actualAnalysis.srcBase).toBe("src");
      expect(actualAnalysis.directoryStructure).toContain(
        "├── core/              # Clean Architecture - Business logic",
      );
      expect(actualAnalysis.directoryStructure).toContain(
        "│   ├── entities/        # Domain models (1 files)",
      );
      expect(actualAnalysis.layerAnalysis).toContain(
        "### Entities (src/core/entities/)",
      );
      expect(actualAnalysis.layerAnalysis).toContain("- **Archivos**: 1");
      expect(actualAnalysis.notes).toEqual([
        "- La regla de Clean Architecture: `src/core/` no debería importar de capas externas (verificar caso a caso, este script no lo valida)",
      ]);
    });

    it("detects hexagonal when domain+application (or domain+infrastructure) exist", async () => {
      await fs.ensureDir(path.join(tempDir, "src", "domain"));
      await fs.ensureDir(path.join(tempDir, "src", "application"));
      await fs.writeFile(path.join(tempDir, "src", "domain", "a.ts"), "");

      const actualAnalysis = await analyzeArchitecture(tempDir);

      expect(actualAnalysis.layerConvention).toBe("hexagonal");
      expect(actualAnalysis.layerAnalysis).toContain(
        "## 🏛️ Arquitectura Hexagonal / Onion",
      );
      expect(actualAnalysis.layerAnalysis).toContain(
        "### domain (src/domain/)",
      );
      expect(actualAnalysis.layerAnalysis).toContain("- **Archivos**: 1");
      expect(actualAnalysis.notes).toEqual([]);
    });

    it("detects mvc when models + (controllers or views) exist", async () => {
      await fs.ensureDir(path.join(tempDir, "src", "models"));
      await fs.ensureDir(path.join(tempDir, "src", "views"));

      const actualAnalysis = await analyzeArchitecture(tempDir);

      expect(actualAnalysis.layerConvention).toBe("mvc");
    });

    it("detects feature-based when features/ or modules/ exist, counting subfolders", async () => {
      await fs.ensureDir(path.join(tempDir, "src", "features", "checkout"));
      await fs.ensureDir(path.join(tempDir, "src", "features", "auth"));

      const actualAnalysis = await analyzeArchitecture(tempDir);

      expect(actualAnalysis.layerConvention).toBe("feature-based");
      expect(actualAnalysis.layerAnalysis).toContain(
        "- **Subcarpetas (posibles features/módulos)**: 2",
      );
    });

    it("falls back to none and lists a neutral subdirectory listing", async () => {
      await fs.ensureDir(path.join(tempDir, "src", "whatever"));
      await fs.writeFile(path.join(tempDir, "src", "whatever", "a.ts"), "");

      const actualAnalysis = await analyzeArchitecture(tempDir);

      expect(actualAnalysis.layerConvention).toBe("none");
      expect(actualAnalysis.layerAnalysis).toContain(
        "No se detectó ninguna de las convenciones de capas reconocidas por este script",
      );
      expect(actualAnalysis.layerAnalysis).toContain(
        "- `whatever/`: 1 archivos",
      );
      expect(actualAnalysis.directoryStructure).toContain(
        "├── whatever/          # (1 files)",
      );
    });

    it("uses the project root as srcBase when there is no src/ directory", async () => {
      await fs.ensureDir(path.join(tempDir, "core", "entities"));

      const actualAnalysis = await analyzeArchitecture(tempDir);

      expect(actualAnalysis.srcBase).toBe(".");
      expect(actualAnalysis.layerConvention).toBe("clean-architecture");
    });
  });

  describe("pattern facts", () => {
    it("reports file count, occurrence count and a truncated example per matched pattern", async () => {
      await fs.ensureDir(path.join(tempDir, "src", "core"));
      await fs.writeFile(
        path.join(tempDir, "src", "core", "UserInteractor.ts"),
        "export class UserInteractor {}\nexport class OtherInteractor {}",
      );

      const actualAnalysis = await analyzeArchitecture(tempDir);

      expect(actualAnalysis.patternsFactsRows).toEqual(
        expect.arrayContaining([
          [
            "Interactor/UseCase (clase + execute)",
            "1",
            "2",
            expect.stringContaining(
              "UserInteractor.ts:1:export class UserInteractor {}",
            ),
          ],
        ]),
      );
      expect(actualAnalysis.detectedPatternNames).toContain(
        "Interactor/UseCase (clase + execute)",
      );
    });

    it("does not report a pattern when its target directory does not exist", async () => {
      const actualAnalysis = await analyzeArchitecture(tempDir);

      expect(actualAnalysis.patternsFactsRows).toEqual([]);
      expect(actualAnalysis.detectedPatternNames).toEqual([]);
    });
  });

  describe("tsconfig analysis", () => {
    it("reports strict mode and path aliases (inline array format)", async () => {
      await fs.writeFile(
        path.join(tempDir, "tsconfig.json"),
        JSON.stringify(
          {
            compilerOptions: {
              strict: true,
              paths: {
                "@/*": ["./src/*"],
                "@core/*": ["./src/core/*"],
              },
            },
          },
          null,
          2,
        ),
      );

      const actualAnalysis = await analyzeArchitecture(tempDir);

      expect(actualAnalysis.tsConfigAnalysis).toContain(
        "- **Strict Mode**: Habilitado",
      );
      expect(actualAnalysis.tsConfigAnalysis).toContain(
        "| `@/*` | `./src/*` |",
      );
      expect(actualAnalysis.tsConfigAnalysis).toContain(
        "| `@core/*` | `./src/core/*` |",
      );
    });

    it("reports strict mode disabled and handles multi-line alias values", async () => {
      await fs.writeFile(
        path.join(tempDir, "tsconfig.json"),
        [
          "{",
          '  "compilerOptions": {',
          '    "paths": {',
          '      "@/*": [',
          '        "./src/*"',
          "      ]",
          "    }",
          "  }",
          "}",
        ].join("\n"),
      );

      const actualAnalysis = await analyzeArchitecture(tempDir);

      expect(actualAnalysis.tsConfigAnalysis).toContain(
        "- **Strict Mode**: No habilitado",
      );
      expect(actualAnalysis.tsConfigAnalysis).toContain(
        "| `@/*` | `./src/*` |",
      );
    });

    it("returns an empty string when tsconfig.json does not exist", async () => {
      const actualAnalysis = await analyzeArchitecture(tempDir);
      expect(actualAnalysis.tsConfigAnalysis).toBe("");
    });
  });
});

describe("buildArchitectureOverview", () => {
  it("describes clean-architecture with detected patterns", () => {
    const actualOverview = buildArchitectureOverview({
      srcBase: "src",
      layerConvention: "clean-architecture",
      directoryStructure: "",
      layerAnalysis: "",
      patternsFactsRows: [],
      tsConfigAnalysis: "",
      notes: [],
      detectedPatternNames: ["Custom Hooks"],
    });

    expect(actualOverview).toBe(
      "El proyecto presenta una convención de **Clean Architecture** (`src/core/` con entities/adapters/drivers/interactors). Se encontraron señales de: Custom Hooks (ver tabla de hallazgos para archivos y ocurrencias exactas).",
    );
  });

  it("describes none convention with no patterns found", () => {
    const actualOverview = buildArchitectureOverview({
      srcBase: ".",
      layerConvention: "none",
      directoryStructure: "",
      layerAnalysis: "",
      patternsFactsRows: [],
      tsConfigAnalysis: "",
      notes: [],
      detectedPatternNames: [],
    });

    expect(actualOverview).toBe(
      "El proyecto presenta **ninguna convención de capas reconocida por este script**. No se encontraron señales de los patrones que este script sabe buscar.",
    );
  });
});
