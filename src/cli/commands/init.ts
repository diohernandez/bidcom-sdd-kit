import type { Command } from "commander";
import { InitWorkflow } from "../../core/workflows/dev/InitWorkflow.js";
import {
  printBanner,
  printError,
  printSuccess,
  printNextSteps,
} from "../ui.js";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Inicializa sdd-kit en el proyecto actual")
    .option(
      "--name <name>",
      "Nombre del proyecto (por defecto, el nombre del directorio)",
    )
    .action(async (options: { name?: string }) => {
      printBanner("🚀 SDD KIT - Inicialización");

      const workflow = new InitWorkflow();
      const result = await workflow.execute({
        projectPath: process.cwd(),
        projectName: options.name,
      });

      if (!result.success) {
        printError(result.error ?? "No se pudo inicializar el proyecto");
        process.exitCode = 1;
        return;
      }

      const stack = result.config?.stack;
      if (stack) {
        const framework = stack.framework ? ` (${stack.framework})` : "";
        console.log(`🔍 Stack detectado: ${stack.language}${framework}`);
      }
      printSuccess(`sdd-kit inicializado en ${result.configPath}`);
      printNextSteps(result.nextSteps);
    });
}
