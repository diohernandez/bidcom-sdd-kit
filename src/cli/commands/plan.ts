import type { Command } from "commander";
import { PlanWorkflow } from "../../core/workflows/dev/PlanWorkflow.js";
import { getGitActor } from "../../utils/gitActor.js";
import { requireConfig } from "../context.js";
import {
  printBanner,
  printError,
  printSuccess,
  printNextSteps,
} from "../ui.js";

export function registerPlanCommand(program: Command): void {
  program
    .command("plan <feature>")
    .description("Crea la estructura de planificación para un feature nuevo")
    .action(async (feature: string) => {
      printBanner("🧠 SDD KIT - Plan");

      const projectPath = process.cwd();
      const config = await requireConfig(projectPath);
      if (!config) {
        process.exitCode = 1;
        return;
      }

      const author = getGitActor({ cwd: projectPath });
      const workflow = new PlanWorkflow();
      const result = await workflow.execute({
        featureName: feature,
        projectPath,
        config,
        author,
      });

      if (!result.success) {
        printError(result.error ?? "No se pudo crear el plan");
        process.exitCode = 1;
        return;
      }

      printSuccess(`Feature "${feature}" creado en ${result.featurePath}`);
      printNextSteps(result.nextSteps);
    });
}
