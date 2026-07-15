import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../utils/fs.js";
import { parseSpec } from "./parser.js";
import { renderSpec } from "./renderer.js";
import type { CapabilitySpec } from "./types.js";

export function resolveSpecPath(projectPath: string, capability: string): string {
  return path.join(projectPath, "specs", capability, "spec.md");
}

export async function readSpec(
  projectPath: string,
  capability: string,
): Promise<CapabilitySpec | undefined> {
  const specPath = resolveSpecPath(projectPath, capability);
  if (!(await fileExists(specPath))) return undefined;
  const content = await fs.readFile(specPath, "utf-8");
  return parseSpec(content, capability);
}

export async function writeSpec(
  projectPath: string,
  spec: CapabilitySpec,
): Promise<void> {
  const specPath = resolveSpecPath(projectPath, spec.capability);
  await fs.ensureDir(path.dirname(specPath));
  await fs.writeFile(specPath, renderSpec(spec));
}

export async function listCapabilities(projectPath: string): Promise<string[]> {
  const specsPath = path.join(projectPath, "specs");
  if (!(await fileExists(specsPath))) return [];
  const entries = await fs.readdir(specsPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export interface SpecStore {
  read(capability: string): Promise<CapabilitySpec | undefined>;
  write(spec: CapabilitySpec): Promise<void>;
  list(): Promise<string[]>;
}

export function createSpecStore(projectPath: string): SpecStore {
  return {
    read: (capability) => readSpec(projectPath, capability),
    write: (spec) => writeSpec(projectPath, spec),
    list: () => listCapabilities(projectPath),
  };
}
