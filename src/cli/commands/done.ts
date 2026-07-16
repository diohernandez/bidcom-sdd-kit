import type { Command } from "commander";
import { DoneWorkflow } from "../../core/workflows/dev/DoneWorkflow.js";
import { requireConfig } from "../context.js";
import { printBanner, printError, printSuccess, printNextSteps } from "../ui.js";

export function registerDoneCommand(program: Command): void {
  program
    .command("done <feature>")
    .description("Cierra un feature (impl→done), mergea deltas y archiva")
    .action(async (feature: string) => {
      printBanner("🎉 SDD KIT - Done");

      const projectPath = process.cwd();
      const config = await requireConfig(projectPath);
      if (!config) {
        process.exitCode = 1;
        return;
      }

      const workflow = new DoneWorkflow();
      const result = await workflow.execute({
        featureName: feature,
        projectPath,
        config,
      });

      if (!result.success) {
        printError(result.error ?? "No se pudo cerrar el feature");
        process.exitCode = 1;
        return;
      }

      printSuccess(`Feature "${feature}" cerrado y archivado`);
      console.log(`  Snapshot: ${result.snapshotPath ?? "-"}`);
      console.log(
        `  Capabilities mergeadas: ${result.mergedCapabilities?.join(", ") ?? "ninguna"}`,
      );
      printNextSteps([
        `Revisar specs/index.md y specs/log.md`,
        `Revisar el feature archivado en: ${result.archivePath}`,
      ]);
    });
}

export function registerArchiveCommand(program: Command): void {
  program
    .command("archive <feature>")
    .description("Alias de 'done'")
    .action(async (feature: string) => {
      printBanner("🗄️  SDD KIT - Archive");

      const projectPath = process.cwd();
      const config = await requireConfig(projectPath);
      if (!config) {
        process.exitCode = 1;
        return;
      }

      const workflow = new DoneWorkflow();
      const result = await workflow.execute({
        featureName: feature,
        projectPath,
        config,
      });

      if (!result.success) {
        printError(result.error ?? "No se pudo archivar el feature");
        process.exitCode = 1;
        return;
      }

      printSuccess(`Feature "${feature}" archivado`);
      console.log(`  Snapshot: ${result.snapshotPath ?? "-"}`);
      console.log(
        `  Capabilities mergeadas: ${result.mergedCapabilities?.join(", ") ?? "ninguna"}`,
      );
    });
}
