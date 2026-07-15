import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

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
}

/**
 * Implementación interina de `[FASE5 T5.3]` (T7.6 del task-list): el contrato real se deriva
 * de `state.json`/`gate-result.json` (Fase 11, `src/core/state|gate/`), que todavía no existen.
 * Acá se deriva del mismo dato que ya leen ValidateWorkflow/StatusWorkflow (frontmatter de
 * `meta.md` + `checks[]`) — se reemplaza cuando T11.1/T11.2 aterricen.
 */
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
};

/** Tabla estática derivada de la máquina de estados lineal `funcional→tecnico→tasks→impl→done`. */
export function nextActionForDevPhase(
  phase: string | undefined,
  featureName: string,
): NextAction | null {
  if (!phase) return null;
  return DEV_NEXT_ACTIONS[phase]?.(featureName) ?? null;
}
