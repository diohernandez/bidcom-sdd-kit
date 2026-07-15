import type { Command } from "commander";
import { ValidateWorkflow } from "../../core/workflows/dev/ValidateWorkflow.js";
import { requireConfig } from "../context.js";
import { printBanner, printError, printSuccess } from "../ui.js";

export function registerValidateCommand(program: Command): void {
  program
    .command("validate <feature>")
    .description("Valida el contenido de la fase actual del feature")
    .action(async (feature: string) => {
      printBanner("✅ SDD KIT - Validate");

      const projectPath = process.cwd();
      const config = await requireConfig(projectPath);
      if (!config) {
        process.exitCode = 1;
        return;
      }

      const workflow = new ValidateWorkflow();
      const result = await workflow.execute({
        featureName: feature,
        projectPath,
        config,
      });

      for (const check of result.checks ?? []) {
        const icon = check.passed ? "✅" : "❌";
        const detail = check.detail ? ` — ${check.detail}` : "";
        console.log(`  ${icon} ${check.name}${detail}`);
      }

      if (!result.success) {
        printError(
          result.error ??
            `La validación de "${feature}" (fase: ${result.phase}) falló`,
        );
        process.exitCode = 1;
        return;
      }

      printSuccess(`Feature "${feature}" válido (fase: ${result.phase})`);
    });
}
