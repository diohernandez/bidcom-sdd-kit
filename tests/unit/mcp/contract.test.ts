import { describe, it, expect } from "@jest/globals";
import {
  contractResult,
  nextActionForDevPhase,
  notInitializedContract,
} from "../../../src/mcp/contract.js";

function parseContract(result: ReturnType<typeof contractResult>) {
  const [content] = result.content as Array<{ type: "text"; text: string }>;
  return JSON.parse(content.text);
}

describe("contract", () => {
  describe("nextActionForDevPhase", () => {
    it("returns null when the phase is unknown", () => {
      expect(nextActionForDevPhase(undefined, "checkout-flow")).toBeNull();
      expect(nextActionForDevPhase("bogus", "checkout-flow")).toBeNull();
    });

    it("returns the static next action for each phase of the lifecycle", () => {
      expect(nextActionForDevPhase("funcional", "checkout-flow")).toEqual({
        command: "sdd validate checkout-flow",
        description: "Validar la especificación funcional",
      });
      expect(nextActionForDevPhase("tecnico", "checkout-flow")).toEqual({
        command: "sdd validate checkout-flow",
        description: "Validar la especificación técnica",
      });
      expect(nextActionForDevPhase("tasks", "checkout-flow")).toEqual({
        command: "sdd approve checkout-flow",
        description: "Aprobar el plan técnico y la lista de tareas",
      });
      expect(nextActionForDevPhase("impl", "checkout-flow")).toEqual({
        command: "sdd build checkout-flow",
        description: "Implementar siguiendo TDD y correr sdd validate",
      });
    });
  });

  describe("contractResult", () => {
    it("serializes the contract as JSON text content", () => {
      const result = contractResult({
        state: "funcional",
        next_action: null,
        blockers: [],
      });

      expect(result.isError).toBe(false);
      expect(parseContract(result)).toEqual({
        state: "funcional",
        next_action: null,
        blockers: [],
      });
    });

    it("marks the result as an error when requested", () => {
      const result = contractResult(
        { state: "unknown", next_action: null, blockers: [] },
        true,
      );
      expect(result.isError).toBe(true);
    });
  });

  describe("notInitializedContract", () => {
    it("reports an initialized:false blocker", () => {
      const result = notInitializedContract();
      const parsed = parseContract(result);

      expect(result.isError).toBe(true);
      expect(parsed.state).toBe("unknown");
      expect(parsed.next_action).toBeNull();
      expect(parsed.blockers).toEqual([
        {
          gate: "config",
          check: "initialized",
          detail: expect.stringContaining("sdd init"),
        },
      ]);
    });
  });
});
