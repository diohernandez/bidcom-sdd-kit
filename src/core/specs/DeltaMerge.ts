import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../utils/fs.js";
import { parseDelta } from "./parser.js";
import { renderDelta } from "./renderer.js";
import type { CapabilityDelta, CapabilitySpec, MergeResult, Requirement } from "./types.js";

function requirementMap(requirements: Requirement[]): Map<string, Requirement> {
  return new Map(requirements.map((requirement) => [requirement.id, requirement]));
}

export function mergeDelta(
  baseline: CapabilitySpec,
  delta: CapabilityDelta,
): MergeResult {
  const current = requirementMap(baseline.requirements);
  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];

  for (const requirement of delta.added) {
    if (!current.has(requirement.id)) {
      current.set(requirement.id, requirement);
      added.push(requirement.id);
    }
  }

  for (const requirement of delta.modified) {
    if (current.has(requirement.id)) {
      current.set(requirement.id, requirement);
      modified.push(requirement.id);
    }
  }

  for (const id of delta.removed) {
    if (current.delete(id)) {
      removed.push(id);
    }
  }

  const nextRequirements = Array.from(current.values()).sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  return {
    spec: {
      ...baseline,
      timestamp: new Date().toISOString(),
      requirements: nextRequirements,
    },
    changes: { added, modified, removed },
  };
}

export async function readDelta(
  featurePath: string,
  capability: string,
): Promise<CapabilityDelta | undefined> {
  const deltaPath = path.join(featurePath, "delta", `${capability}.md`);
  if (!(await fileExists(deltaPath))) return undefined;
  const content = await fs.readFile(deltaPath, "utf-8");
  return parseDelta(content, capability);
}

export async function writeDelta(
  featurePath: string,
  delta: CapabilityDelta,
): Promise<void> {
  const deltaPath = path.join(featurePath, "delta", `${delta.capability}.md`);
  await fs.ensureDir(path.dirname(deltaPath));
  await fs.writeFile(deltaPath, renderDelta(delta));
}

export interface DeltaMerge {
  merge(baseline: CapabilitySpec, delta: CapabilityDelta): MergeResult;
  read(capability: string): Promise<CapabilityDelta | undefined>;
  write(delta: CapabilityDelta): Promise<void>;
}

export function createDeltaMerge(featurePath: string): DeltaMerge {
  return {
    merge: mergeDelta,
    read: (capability) => readDelta(featurePath, capability),
    write: (delta) => writeDelta(featurePath, delta),
  };
}
