import path from "node:path";
import fs from "fs-extra";
import { fileExists, readJson } from "../../utils/fs.js";

export interface NodePackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function readNodeDependencies(
  projectPath: string,
): Promise<Record<string, string> | undefined> {
  const packageJsonPath = path.join(projectPath, "package.json");
  if (!(await fileExists(packageJsonPath))) return undefined;

  const pkg = await readJson<NodePackageManifest>(packageJsonPath);
  return { ...pkg.dependencies, ...pkg.devDependencies };
}

export async function readPythonManifestBlob(
  projectPath: string,
): Promise<string | undefined> {
  const pyprojectPath = path.join(projectPath, "pyproject.toml");
  const requirementsPath = path.join(projectPath, "requirements.txt");

  const parts: string[] = [];
  if (await fileExists(pyprojectPath)) {
    parts.push(await fs.readFile(pyprojectPath, "utf-8"));
  }
  if (await fileExists(requirementsPath)) {
    parts.push(await fs.readFile(requirementsPath, "utf-8"));
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}
