import type { Command } from "commander";
import { SddMcpServer } from "../../mcp/server.js";
import { printError } from "../ui.js";

export function registerMcpServerCommand(program: Command): void {
  program
    .command("mcp-server")
    .description("Inicia el servidor MCP para Claude/OpenCode")
    .action(async () => {
      // Nada de banners/console.log acá: StdioServerTransport usa stdout para el
      // protocolo JSON-RPC — cualquier escritura extra lo corrompe.
      try {
        await new SddMcpServer({ projectPath: process.cwd() }).start();
      } catch (error) {
        printError(
          error instanceof Error
            ? error.message
            : "No se pudo iniciar el servidor MCP",
        );
        process.exitCode = 1;
      }
    });
}
