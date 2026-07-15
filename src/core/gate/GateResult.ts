import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../utils/fs.js";
import type { GateResult } from "./types.js";

export function gateResultPath(featurePath: string): string {
  return path.join(featurePath, "gate-result.json");
}

export async function readGateResult(
  featurePath: string,
): Promise<GateResult | undefined> {
  const filePath = gateResultPath(featurePath);
  if (!(await fileExists(filePath))) return undefined;
  return fs.readJson(filePath) as Promise<GateResult>;
}

export async function writeGateResult(
  featurePath: string,
  result: GateResult,
): Promise<void> {
  await fs.writeJson(gateResultPath(featurePath), result, { spaces: 2 });
}
