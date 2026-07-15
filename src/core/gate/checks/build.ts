import path from "node:path";
import fs from "fs-extra";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { fileExists } from "../../../utils/fs.js";
import type { GateCheck, GateContext } from "../types.js";

const execAsync = promisify(exec);

async function readPackageScripts(
  projectPath: string,
): Promise<Record<string, string> | undefined> {
  const packageJsonPath = path.join(projectPath, "package.json");
  if (!(await fileExists(packageJsonPath))) return undefined;
  const pkg = (await fs.readJson(packageJsonPath)) as {
    scripts?: Record<string, string>;
  };
  return pkg.scripts;
}

function detectBuildCommand(
  scripts: Record<string, string> | undefined,
): string | undefined {
  if (!scripts) return undefined;
  if (scripts.build) return "build";
  if (scripts["build:prod"]) return "build:prod";
  return undefined;
}

export async function runBuildCheck(context: GateContext): Promise<GateCheck> {
  const scripts = await readPackageScripts(context.projectPath);
  const buildScript = detectBuildCommand(scripts);

  if (!buildScript) {
    return {
      name: "build",
      passed: false,
      detail: "No se detectó un script de build en package.json",
    };
  }

  try {
    await execAsync(`yarn ${buildScript}`, { cwd: context.projectPath });
    return { name: "build", passed: true };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "El build falló";
    return { name: "build", passed: false, detail };
  }
}
