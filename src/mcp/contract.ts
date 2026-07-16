import path from "node:path";
import fs from "fs-extra";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { fileExists } from "../utils/fs.js";
import { readGateResult } from "../core/gate/GateResult.js";
import type { StateData } from "../core/state/types.js";

export interface NextAction {
  command: string;
  description: string;
}

export interface ToolBlocker {
  gate: string;
  check: string;
  detail: string;
}

export interface ToolContract {
  state: string;
  next_action: NextAction | null;
  blockers: ToolBlocker[];
  [key: string]: unknown;
}

export function contractResult(
  contract: ToolContract,
  isError = false,
): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(contract, null, 2) }],
    isError,
  };
}

export function notInitializedContract(): CallToolResult {
  return contractResult(
    {
      state: "unknown",
      next_action: null,
      blockers: [
        {
          gate: "config",
          check: "initialized",
          detail: "El proyecto no está inicializado. Ejecutá: sdd init",
        },
      ],
    },
    true,
  );
}

const DEV_NEXT_ACTIONS: Record<string, (featureName: string) => NextAction> = {
  funcional: (featureName) => ({
    command: `sdd validate ${featureName}`,
    description: "Validar la especificación funcional",
  }),
  tecnico: (featureName) => ({
    command: `sdd validate ${featureName}`,
    description: "Validar la especificación técnica",
  }),
  tasks: (featureName) => ({
    command: `sdd approve ${featureName}`,
    description: "Aprobar el plan técnico y la lista de tareas",
  }),
  impl: (featureName) => ({
    command: `sdd build ${featureName}`,
    description: "Implementar siguiendo TDD y correr sdd validate",
  }),
  done: (featureName) => ({
    command: `sdd archive ${featureName}`,
    description: "El feature ya está archivado",
  }),
};

/** Tabla estática derivada de la máquina de estados lineal `funcional→tecnico→tasks→impl→done`. */
export function nextActionForDevPhase(
  phase: string | undefined,
  featureName: string,
): NextAction | null {
  if (!phase) return null;
  return DEV_NEXT_ACTIONS[phase]?.(featureName) ?? null;
}

async function readState(featurePath: string): Promise<StateData | undefined> {
  const statePath = path.join(featurePath, "state.json");
  if (!(await fileExists(statePath))) return undefined;
  return fs.readJson(statePath) as Promise<StateData>;
}

export async function buildContractFromState(
  featurePath: string,
  featureName: string,
): Promise<ToolContract> {
  const state = await readState(featurePath);
  const phase = state?.state ?? "unknown";
  const gateResult = await readGateResult(featurePath);

  const blockers: ToolBlocker[] =
    gateResult?.checks
      .filter((check) => !check.passed)
      .map((check) => ({
        gate: phase,
        check: check.name,
        detail: check.detail ?? "No pasó la validación",
      })) ?? [];

  return {
    state: phase,
    next_action: nextActionForDevPhase(phase, featureName),
    blockers,
  };
}
