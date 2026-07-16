import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { runPlanTool } from "./tools/planTool.js";
import { runBuildTool } from "./tools/buildTool.js";
import { runValidateTool } from "./tools/validateTool.js";
import { runAnalyzeTool } from "./tools/analyzeTool.js";
import { runApproveTool } from "./tools/approveTool.js";
import { runDoneTool } from "./tools/doneTool.js";
import { runSpecsSearchTool } from "./tools/specsSearchTool.js";
import { runReverseInitTool } from "./tools/reverseInitTool.js";
import { runReverseAnalyzeTool } from "./tools/reverseAnalyzeTool.js";
import { registerStatusResource } from "./resources/statusResource.js";
import { registerReverseStatusResource } from "./resources/reverseStatusResource.js";

export interface SddMcpServerOptions {
  projectPath?: string;
}

/**
 * Arma el `McpServer` sin atarlo a ningún transporte — separado de `start()` para poder
 * testearlo in-process con `InMemoryTransport` (sin spawnear el binario, mismo criterio
 * que `tests/e2e/commands/cli.test.ts`).
 */
export function createSddMcpServer(
  options: SddMcpServerOptions = {},
): McpServer {
  const projectPath = options.projectPath ?? process.cwd();

  const server = new McpServer({ name: "sdd-kit", version: "1.0.0" });

  server.registerTool(
    "sdd_plan",
    {
      description: "Iniciar planificación de un nuevo feature",
      inputSchema: {
        featureName: z.string().describe("Nombre del feature (kebab-case)"),
      },
    },
    (args) => runPlanTool(args, { projectPath }),
  );

  server.registerTool(
    "sdd_build",
    {
      description: "Iniciar implementación de un feature",
      inputSchema: {
        featureName: z.string().describe("Nombre del feature (kebab-case)"),
      },
    },
    (args) => runBuildTool(args, { projectPath }),
  );

  server.registerTool(
    "sdd_validate",
    {
      description: "Correr las validaciones (gate) de un feature",
      inputSchema: {
        featureName: z.string().describe("Nombre del feature (kebab-case)"),
      },
    },
    (args) => runValidateTool(args, { projectPath }),
  );

  server.registerTool(
    "sdd_analyze",
    {
      description: "Analizar trazabilidad historias ↔ requirements ↔ tareas",
      inputSchema: {
        featureName: z.string().describe("Nombre del feature (kebab-case)"),
      },
    },
    (args) => runAnalyzeTool(args, { projectPath }),
  );

  server.registerTool(
    "sdd_approve",
    {
      description: "Aprobar un feature y moverlo a impl",
      inputSchema: {
        featureName: z.string().describe("Nombre del feature (kebab-case)"),
      },
    },
    (args) => runApproveTool(args, { projectPath }),
  );

  server.registerTool(
    "sdd_done",
    {
      description: "Cerrar un feature, mergear deltas y archivar",
      inputSchema: {
        featureName: z.string().describe("Nombre del feature (kebab-case)"),
      },
    },
    (args) => runDoneTool(args, { projectPath }),
  );

  server.registerTool(
    "sdd_specs_search",
    {
      description: "Buscar sobre specs/ por texto o tag",
      inputSchema: {
        query: z.string().describe("Texto a buscar"),
      },
    },
    (args) => runSpecsSearchTool(args, { projectPath }),
  );

  server.registerTool(
    "sdd_reverse_init",
    {
      description: "Iniciar un análisis de ingeniería inversa",
      inputSchema: {
        projectName: z.string().describe("Nombre del proyecto a documentar"),
      },
    },
    (args) => runReverseInitTool(args, { projectPath }),
  );

  server.registerTool(
    "sdd_reverse_analyze",
    {
      description: "Analizar una fase de ingeniería inversa",
      inputSchema: {
        phase: z
          .enum([
            "stack",
            "architecture",
            "integration",
            "components",
            "data-flow",
            "testing",
            "seed-specs",
          ])
          .describe("Fase de análisis a ejecutar"),
        projectName: z
          .string()
          .describe("Nombre del proyecto de reverse engineering"),
      },
    },
    (args) => runReverseAnalyzeTool(args, { projectPath }),
  );

  registerStatusResource(server, { projectPath });
  registerReverseStatusResource(server, { projectPath });

  return server;
}

export class SddMcpServer {
  private readonly mcpServer: McpServer;

  constructor(options: SddMcpServerOptions = {}) {
    this.mcpServer = createSddMcpServer(options);
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
  }
}
