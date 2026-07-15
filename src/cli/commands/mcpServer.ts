import type { Command } from "commander";
import { printError } from "../ui.js";

export function registerMcpServerCommand(program: Command): void {
  program
    .command("mcp-server")
    .description(
      "Inicia el servidor MCP (aún no implementado — Fase 7 del task-list)",
    )
    .action(() => {
      printError(
        "El servidor MCP todavía no está implementado (Fase 7 del task-list).",
      );
      process.exitCode = 1;
    });
}
