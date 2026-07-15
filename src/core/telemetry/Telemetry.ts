import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../utils/fs.js";
import type { TelemetryConfig, TelemetryRun } from "./types.js";

export function defaultTelemetryConfig(): TelemetryConfig {
  return {
    enabled: true,
    runsFile: ".sdd/telemetry/runs.jsonl",
  };
}

export function resolveRunsFile(
  projectPath: string,
  config: TelemetryConfig,
): string {
  return path.isAbsolute(config.runsFile)
    ? config.runsFile
    : path.join(projectPath, config.runsFile);
}

export async function emitTelemetryRun(
  projectPath: string,
  config: TelemetryConfig,
  run: TelemetryRun,
): Promise<void> {
  if (!config.enabled) return;

  const runsFilePath = resolveRunsFile(projectPath, config);
  await fs.ensureDir(path.dirname(runsFilePath));
  await fs.appendFile(runsFilePath, `${JSON.stringify(run)}\n`);
}

export async function readTelemetryRuns(
  projectPath: string,
  config: TelemetryConfig,
): Promise<TelemetryRun[]> {
  const runsFilePath = resolveRunsFile(projectPath, config);
  if (!(await fileExists(runsFilePath))) return [];

  const content = await fs.readFile(runsFilePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  return lines.map((line) => JSON.parse(line) as TelemetryRun);
}

export interface TelemetryEmitter {
  emit(run: TelemetryRun): Promise<void>;
  read(): Promise<TelemetryRun[]>;
}

export function createTelemetryEmitter(
  projectPath: string,
  config: TelemetryConfig,
): TelemetryEmitter {
  return {
    emit: (run) => emitTelemetryRun(projectPath, config, run),
    read: () => readTelemetryRuns(projectPath, config),
  };
}
