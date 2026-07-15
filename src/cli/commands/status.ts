import type { Command } from "commander";
import { StatusWorkflow } from "../../core/workflows/dev/StatusWorkflow.js";
import { requireConfig } from "../context.js";
import { printBanner, printError } from "../ui.js";

export function registerStatusCommand(program: Command): void {
  program
    .command("status [feature]")
    .description(
      "Muestra el estado de un feature, o de todos los features en progreso",
    )
    .action(async (feature: string | undefined) => {
      printBanner("📊 SDD KIT - Status");

      const projectPath = process.cwd();
      const config = await requireConfig(projectPath);
      if (!config) {
        process.exitCode = 1;
        return;
      }

      const workflow = new StatusWorkflow();
      const result = await workflow.execute({
        projectPath,
        config,
        featureName: feature,
      });

      if (!result.success) {
        printError(result.error ?? "No se pudo obtener el estado");
        process.exitCode = 1;
        return;
      }

      if (result.feature) {
        const { featureName, state, createdAt, createdBy, tasks } =
          result.feature;
        console.log(`📋 Feature: ${featureName}`);
        console.log(`   Estado: ${state ?? "desconocido"}`);
        console.log(`   Creado: ${createdAt ?? "-"} por ${createdBy ?? "-"}`);
        if (tasks) {
          console.log(`   Tareas: ${tasks.done} / ${tasks.total}`);
        }
        return;
      }

      const features = result.features ?? [];
      if (features.length === 0) {
        console.log("No hay features en progreso");
        return;
      }

      for (const summary of features) {
        console.log(
          `  • ${summary.featureName} (${summary.state ?? "desconocido"})`,
        );
      }

      console.log("");
      console.log("Resumen por estado:");
      for (const [state, count] of Object.entries(
        result.summaryByState ?? {},
      )) {
        console.log(`  ${state}: ${count}`);
      }
    });
}
