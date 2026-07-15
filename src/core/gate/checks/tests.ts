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

function detectTestCommand(
  scripts: Record<string, string> | undefined,
): string | undefined {
  if (!scripts) return undefined;
  if (scripts.test) return "test";
  return undefined;
}

export async function runTestsCheck(context: GateContext): Promise<GateCheck> {
  const scripts = await readPackageScripts(context.projectPath);
  const testScript = detectTestCommand(scripts);

  if (!testScript) {
    return {
      name: "tests",
      passed: false,
      detail: "No se detectó un script de test en package.json",
    };
  }

  try {
    await execAsync(`yarn ${testScript}`, { cwd: context.projectPath });
    return { name: "tests", passed: true };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Los tests fallaron";
    return { name: "tests", passed: false, detail };
  }
}
