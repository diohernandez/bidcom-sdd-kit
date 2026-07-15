import type { Command } from "commander";
import { BuildWorkflow } from "../../core/workflows/dev/BuildWorkflow.js";
import { requireConfig } from "../context.js";
import {
  printBanner,
  printError,
  printSuccess,
  printNextSteps,
} from "../ui.js";

export function registerBuildCommand(program: Command): void {
  program
    .command("build <feature>")
    .description("Verifica que un feature esté listo para implementación")
    .action(async (feature: string) => {
      printBanner("🔨 SDD KIT - Build");

      const projectPath = process.cwd();
      const config = await requireConfig(projectPath);
      if (!config) {
        process.exitCode = 1;
        return;
      }

      const workflow = new BuildWorkflow();
      const result = await workflow.execute({
        featureName: feature,
        projectPath,
        config,
      });

      if (!result.success) {
        printError(
          result.error ?? "El feature no está listo para implementación",
        );
        process.exitCode = 1;
        return;
      }

      printSuccess(
        `Feature "${feature}" listo para implementación (fase: ${result.phase})`,
      );
      printNextSteps(result.nextSteps);
    });
}
