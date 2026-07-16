import type { Command } from "commander";
import { ApproveWorkflow } from "../../core/workflows/dev/ApproveWorkflow.js";
import { requireConfig } from "../context.js";
import { getGitActor } from "../../utils/gitActor.js";
import { printBanner, printError, printSuccess } from "../ui.js";

export function registerApproveCommand(program: Command): void {
  program
    .command("approve <feature>")
    .description("Aprueba el plan de un feature y lo mueve a fase impl")
    .action(async (feature: string) => {
      printBanner("✅ SDD KIT - Approve");

      const projectPath = process.cwd();
      const config = await requireConfig(projectPath);
      if (!config) {
        process.exitCode = 1;
        return;
      }

      const actor = getGitActor({ cwd: projectPath });
      const workflow = new ApproveWorkflow();
      const result = await workflow.execute({
        featureName: feature,
        projectPath,
        config,
        actor: actor.name,
        email: actor.email,
      });

      if (!result.success) {
        printError(result.error ?? "No se pudo aprobar el feature");
        process.exitCode = 1;
        return;
      }

      printSuccess(
        `Feature "${feature}" aprobado (número de aprobación: ${result.approvalNumber})`,
      );
    });
}
