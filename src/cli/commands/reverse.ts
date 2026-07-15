import path from "node:path";
import type { Command } from "commander";
import { ReverseWorkflow } from "../../core/workflows/reverse/ReverseWorkflow.js";
import { ReverseStatusWorkflow } from "../../core/workflows/reverse/ReverseStatusWorkflow.js";
import { ReverseValidateWorkflow } from "../../core/workflows/reverse/ReverseValidateWorkflow.js";
import { StackPhase } from "../../core/workflows/reverse/phases/StackPhase.js";
import { ArchitecturePhase } from "../../core/workflows/reverse/phases/ArchitecturePhase.js";
import { IntegrationPhase } from "../../core/workflows/reverse/phases/IntegrationPhase.js";
import { ComponentsPhase } from "../../core/workflows/reverse/phases/ComponentsPhase.js";
import { DataFlowPhase } from "../../core/workflows/reverse/phases/DataFlowPhase.js";
import { TestingPhase } from "../../core/workflows/reverse/phases/TestingPhase.js";
import { fileExists } from "../../utils/fs.js";
import { getGitActor } from "../../utils/gitActor.js";
import { requireConfig } from "../context.js";
import {
  printBanner,
  printError,
  printSuccess,
  printNextSteps,
} from "../ui.js";
import type { PhaseResult } from "../../types/workflow.js";
import type { Language } from "../../types/stack.js";

interface AnalysisPhase {
  execute(options: {
    projectName: string;
    projectPath: string;
    reversePath: string;
    analyst: string;
    stackLanguage: Language;
  }): Promise<PhaseResult>;
}

const PHASE_CLASSES: Record<string, new () => AnalysisPhase> = {
  stack: StackPhase,
  architecture: ArchitecturePhase,
  integration: IntegrationPhase,
  components: ComponentsPhase,
  "data-flow": DataFlowPhase,
  testing: TestingPhase,
};

export function registerReverseCommand(program: Command): void {
  const reverse = program
    .command("reverse")
    .description("Ingeniería inversa: documentar un proyecto existente");

  reverse
    .command("init <name>")
    .description("Inicializa un proyecto de ingeniería inversa")
    .action(async (name: string) => {
      printBanner("🔍 SDD KIT - Reverse Init");

      const projectPath = process.cwd();
      const config = await requireConfig(projectPath);
      if (!config) {
        process.exitCode = 1;
        return;
      }

      const author = getGitActor({ cwd: projectPath });
      const workflow = new ReverseWorkflow();
      const result = await workflow.execute({
        projectName: name,
        projectPath,
        config,
        author,
      });

      if (!result.success) {
        printError(
          result.error ??
            "No se pudo inicializar el proyecto de reverse engineering",
        );
        process.exitCode = 1;
        return;
      }

      printSuccess(`Proyecto "${name}" inicializado en ${result.reversePath}`);
      printNextSteps(result.nextSteps);
    });

  reverse
    .command("analyze <phase>")
    .description(
      `Ejecuta una fase de análisis (${Object.keys(PHASE_CLASSES).join(", ")})`,
    )
    .requiredOption(
      "--project <name>",
      "Nombre del proyecto de reverse engineering",
    )
    .action(async (phase: string, options: { project: string }) => {
      printBanner("🔎 SDD KIT - Reverse Analyze");

      const projectPath = process.cwd();
      const config = await requireConfig(projectPath);
      if (!config) {
        process.exitCode = 1;
        return;
      }

      const PhaseClass = PHASE_CLASSES[phase];
      if (!PhaseClass) {
        printError(
          `Fase desconocida: "${phase}". Fases válidas: ${Object.keys(PHASE_CLASSES).join(", ")}`,
        );
        process.exitCode = 1;
        return;
      }

      const reversePath = path.join(
        projectPath,
        config.reversePath,
        options.project,
      );
      if (!(await fileExists(reversePath))) {
        printError(
          `El proyecto "${options.project}" no existe. Ejecutá: sdd reverse init ${options.project}`,
        );
        process.exitCode = 1;
        return;
      }

      const analyst = getGitActor({ cwd: projectPath }).name;
      const result = await new PhaseClass().execute({
        projectName: options.project,
        projectPath,
        reversePath,
        analyst,
        stackLanguage: config.stack.language,
      });

      if (!result.success) {
        printError(result.error ?? `No se pudo completar la fase "${phase}"`);
        process.exitCode = 1;
        return;
      }

      printSuccess(`Fase "${phase}" completada: ${result.outputPath}`);
      if (result.summary) console.log(`  ${result.summary}`);
    });

  reverse
    .command("status [name]")
    .description("Muestra el estado de un análisis, o de todos los proyectos")
    .action(async (name: string | undefined) => {
      printBanner("📊 SDD KIT - Reverse Status");

      const projectPath = process.cwd();
      const config = await requireConfig(projectPath);
      if (!config) {
        process.exitCode = 1;
        return;
      }

      const workflow = new ReverseStatusWorkflow();
      const result = await workflow.execute({
        projectPath,
        config,
        projectName: name,
      });

      if (!result.success) {
        printError(result.error ?? "No se pudo obtener el estado");
        process.exitCode = 1;
        return;
      }

      if (result.project) {
        const { summary, phases, completed, total, percent } = result.project;
        console.log(`📋 Proyecto: ${summary.projectName}`);
        console.log(`   Estado: ${summary.state ?? "desconocido"}`);
        console.log(
          `   Creado: ${summary.createdAt ?? "-"} por ${summary.createdBy ?? "-"}`,
        );
        console.log("");
        for (const phase of phases) {
          const icon = phase.completed ? "✅" : "❌";
          const count =
            phase.documentCount !== undefined
              ? ` (${phase.documentCount} documentos)`
              : "";
          console.log(`  ${icon} ${phase.description}${count}`);
        }
        console.log("");
        console.log(`Progreso: ${completed} / ${total} (${percent}%)`);
        return;
      }

      const projects = result.projects ?? [];
      if (projects.length === 0) {
        console.log("No hay proyectos de reverse engineering");
        return;
      }

      for (const project of projects) {
        console.log(
          `  • ${project.projectName} (${project.state ?? "desconocido"})`,
        );
      }
    });

  reverse
    .command("validate <name>")
    .description("Valida la completitud del análisis")
    .action(async (name: string) => {
      printBanner("✅ SDD KIT - Reverse Validate");

      const projectPath = process.cwd();
      const config = await requireConfig(projectPath);
      if (!config) {
        process.exitCode = 1;
        return;
      }

      const workflow = new ReverseValidateWorkflow();
      const result = await workflow.execute({
        projectName: name,
        projectPath,
        config,
      });

      if (result.error) {
        printError(result.error);
        process.exitCode = 1;
        return;
      }

      for (const check of result.checks ?? []) {
        const icon = check.passed
          ? "✅"
          : check.severity === "error"
            ? "❌"
            : "⚠️ ";
        const detail = check.detail ? ` — ${check.detail}` : "";
        console.log(`  ${icon} ${check.name}${detail}`);
      }

      console.log("");
      console.log(
        `Progreso: ${result.completedPhases} / ${result.totalPhases} (${result.completionPercent}%)`,
      );
      console.log(
        `Errores: ${result.errors} · Advertencias: ${result.warnings}`,
      );

      if (!result.success) {
        printError(`Validación fallida (${result.errors} error(es))`);
        process.exitCode = 1;
        return;
      }

      printSuccess("Validación exitosa");
    });
}
