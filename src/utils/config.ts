import path from "node:path";
import fs from "fs-extra";
import YAML from "yaml";
import { DEFAULT_CONFIG } from "../types/config.js";
import type { SddConfig } from "../types/config.js";

export function getConfigPath(projectPath: string): string {
  return path.join(projectPath, ".sdd", "config.yml");
}

export async function loadConfig(projectPath: string): Promise<SddConfig> {
  const configPath = getConfigPath(projectPath);
  const raw = await fs.readFile(configPath, "utf-8");
  const parsed = (YAML.parse(raw) ?? {}) as Partial<SddConfig>;

  return {
    ...DEFAULT_CONFIG,
    ...parsed,
    mcp: { ...DEFAULT_CONFIG.mcp, ...parsed.mcp },
    mutation: { ...DEFAULT_CONFIG.mutation, ...parsed.mutation },
    telemetry: { ...DEFAULT_CONFIG.telemetry, ...parsed.telemetry },
  } as SddConfig;
}

export async function saveConfig(
  projectPath: string,
  config: SddConfig,
): Promise<void> {
  const configPath = getConfigPath(projectPath);
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeFile(configPath, YAML.stringify(config), "utf-8");
}
