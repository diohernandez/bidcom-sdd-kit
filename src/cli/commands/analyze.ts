import type { Command } from "commander";
import { analyzeFeature } from "../../core/analyze/Analyzer.js";
import { requireConfig } from "../context.js";
import { printBanner, printError, printSuccess } from "../ui.js";

export function registerAnalyzeCommand(program: Command): void {
  program
    .command("analyze <feature>")
    .description("Analiza la trazabilidad historias ↔ requirements ↔ tareas")
    .action(async (feature: string) => {
      printBanner("🔎 SDD KIT - Analyze");

      const projectPath = process.cwd();
      const config = await requireConfig(projectPath);
      if (!config) {
        process.exitCode = 1;
        return;
      }

      const report = await analyzeFeature({
        featureName: feature,
        projectPath,
        wipPath: config.wipPath,
        specsPath: config.specsPath,
      });

      console.log(`  Historias: ${report.stories.length}`);
      console.log(`  Requirements: ${report.requirements.length}`);
      console.log(`  Tareas: ${report.tasks.length}`);

      if (report.issues.length > 0) {
        console.log("");
        for (const issue of report.issues) {
          console.log(`  ❌ [${issue.type}] ${issue.id}: ${issue.detail}`);
        }
        printError(`Análisis falló con ${report.issues.length} problema(s)`);
        process.exitCode = 1;
        return;
      }

      printSuccess("Análisis de trazabilidad exitoso");
    });
}
