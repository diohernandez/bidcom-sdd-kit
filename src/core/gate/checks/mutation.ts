import path from "node:path";
import fs from "fs-extra";
import type { GateCheck, GateContext, GateConfig } from "../types.js";

interface StrykerReport {
  mutationScore?: number;
}

async function readMutationScore(projectPath: string): Promise<number | null> {
  const reportPath = path.join(
    projectPath,
    "reports",
    "mutation",
    "mutation.json",
  );
  if (!(await fs.pathExists(reportPath))) return null;
  const report = (await fs.readJson(reportPath)) as StrykerReport;
  return report.mutationScore ?? null;
}

export async function runMutationCheck(
  context: GateContext,
  config: GateConfig,
): Promise<GateCheck> {
  if (!config.mutation.enforce) {
    return {
      name: "mutation",
      passed: true,
      detail: "mutation.enforce es false — el gate no rompe por score bajo",
    };
  }

  const score = await readMutationScore(context.projectPath);
  if (score === null) {
    return {
      name: "mutation",
      passed: false,
      detail: "No se encontró el reporte de mutation testing (reports/mutation/mutation.json)",
    };
  }

  if (score < config.mutation.threshold) {
    return {
      name: "mutation",
      passed: false,
      detail: `Mutation score ${score}% es menor al threshold ${config.mutation.threshold}%`,
    };
  }

  return {
    name: "mutation",
    passed: true,
    detail: `Mutation score ${score}% (threshold: ${config.mutation.threshold}%)`,
  };
}
