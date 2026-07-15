import { loadConfig } from "../utils/config.js";
import type { SddConfig } from "../types/config.js";
import { printError } from "./ui.js";

export async function requireConfig(
  projectPath: string,
): Promise<SddConfig | null> {
  try {
    return await loadConfig(projectPath);
  } catch {
    printError("El proyecto no está inicializado. Ejecutá: sdd init");
    return null;
  }
}
