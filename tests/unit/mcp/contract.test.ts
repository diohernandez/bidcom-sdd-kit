import { describe, it, expect } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import {
  buildContractFromState,
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

  describe("buildContractFromState", () => {
    it("builds a contract from state.json and gate-result.json", async () => {
      const projectPath = await fs.mkdtemp(
        path.join(os.tmpdir(), "sdd-kit-contract-"),
      );
      const featurePath = path.join(projectPath, ".sdd", "wip", "checkout-flow");
      await fs.ensureDir(featurePath);
      await fs.writeJson(path.join(featurePath, "state.json"), {
        schema_version: "3.0.0",
        feature_name: "checkout-flow",
        state: "impl",
        created_at: "2026-07-15T00:00:00Z",
        created_by: "diohernandez",
        created_by_email: "",
        last_updated: "2026-07-15T00:00:00Z",
        stack_detected: { language: "typescript" },
        domain: "dev-tools",
        contributors: [],
        knowledge_lineage: [],
        transitions: [],
        approvals: [],
        requirement_changes: [],
        specs_baseline: { mode: null, note: null, capabilities: [] },
        gates: { functional: null, technical: null, tasks: null },
        archive: {
          archived: false,
          archived_at: null,
          archive_path: null,
          merged_capabilities: [],
        },
        extra: {},
      });
      await fs.writeJson(path.join(featurePath, "gate-result.json"), {
        gate: "impl",
        passed: false,
        exit_code: 2,
        checks: [
          { name: "build", passed: false, detail: "build failed" },
          { name: "tests", passed: true },
        ],
      });

      const contract = await buildContractFromState(featurePath, "checkout-flow");

      expect(contract.state).toBe("impl");
      expect(contract.next_action?.command).toBe("sdd build checkout-flow");
      expect(contract.blockers).toEqual([
        { gate: "impl", check: "build", detail: "build failed" },
      ]);

      await fs.remove(projectPath);
    });
  });
});
