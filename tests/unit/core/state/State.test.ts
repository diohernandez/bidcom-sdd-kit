import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { State, renderMetaMd } from "../../../../src/core/state/index.js";
import type { StackDetected } from "../../../../src/core/state/types.js";

async function createTempFeaturePath(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sdd-state-test-"));
  return dir;
}

const mockStack: StackDetected = {
  language: "typescript",
  framework: "Next.js 15.0.0",
  testing: { unit: ["jest"] },
};

describe("State", () => {
  let featurePath: string;

  beforeEach(async () => {
    featurePath = await createTempFeaturePath();
  });

  afterEach(async () => {
    await fs.remove(featurePath);
  });

  it("initializes state.json and meta.md", async () => {
    const state = new State(featurePath);

    await state.init({
      featureName: "login-flow",
      createdBy: "dev",
      createdByEmail: "dev@example.com",
      stackDetected: mockStack,
      domain: "auth",
    });

    expect(await fs.pathExists(path.join(featurePath, "state.json"))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(featurePath, "meta.md"))).toBe(true);

    const data = await state.load();
    expect(data.feature_name).toBe("login-flow");
    expect(data.state).toBe("funcional");
    expect(data.created_by).toBe("dev");
    expect(data.domain).toBe("auth");
    expect(data.transitions).toHaveLength(1);
    expect(data.transitions[0].to).toBe("funcional");
  });

  it("throws when initializing an existing state", async () => {
    const state = new State(featurePath);
    await state.init({
      featureName: "login-flow",
      createdBy: "dev",
      stackDetected: mockStack,
    });

    await expect(
      state.init({
        featureName: "login-flow",
        createdBy: "dev",
        stackDetected: mockStack,
      }),
    ).rejects.toThrow(/Ya existe/);
  });

  it("transitions state and updates meta.md", async () => {
    const state = new State(featurePath);
    await state.init({
      featureName: "login-flow",
      createdBy: "dev",
      stackDetected: mockStack,
    });

    await state.transition({
      from: "funcional",
      to: "tecnico",
      reason: "Spec funcional aprobado",
      actor: "lead",
    });

    const data = await state.load();
    expect(data.state).toBe("tecnico");
    expect(data.transitions).toHaveLength(2);
    expect(data.transitions[1].from).toBe("funcional");
    expect(data.transitions[1].to).toBe("tecnico");

    const meta = await fs.readFile(path.join(featurePath, "meta.md"), "utf-8");
    expect(meta).toMatch(/state: "tecnico"/);
    expect(meta).toMatch(/tecnico/);
  });

  it("throws when transition from state does not match", async () => {
    const state = new State(featurePath);
    await state.init({
      featureName: "login-flow",
      createdBy: "dev",
      stackDetected: mockStack,
    });

    await expect(
      state.transition({
        from: "tecnico",
        to: "impl",
        reason: "Intento inválido",
        actor: "lead",
      }),
    ).rejects.toThrow(/El estado actual es "funcional"/);
  });

  it("records an approval and regenerates meta.md", async () => {
    const state = new State(featurePath);
    await state.init({
      featureName: "login-flow",
      createdBy: "dev",
      stackDetected: mockStack,
    });

    await state.transition({
      from: "funcional",
      to: "tasks",
      reason: "Tareas definidas",
      actor: "dev",
    });

    const approvalNumber = await state.recordApproval({
      actor: "lead",
      email: "lead@example.com",
      comment: "Aprobación del plan",
    });

    expect(approvalNumber).toBe(1);

    const data = await state.load();
    expect(data.approvals).toHaveLength(1);
    expect(data.approvals[0].approved_by).toBe("lead");
    expect(data.approvals[0].from_state).toBe("tasks");
    expect(data.approvals[0].to_state).toBe("impl");

    const meta = await fs.readFile(path.join(featurePath, "meta.md"), "utf-8");
    expect(meta).toMatch(/lead/);
  });

  it("returns -1 when actor already approved", async () => {
    const state = new State(featurePath);
    await state.init({
      featureName: "login-flow",
      createdBy: "dev",
      stackDetected: mockStack,
    });

    await state.recordApproval({
      actor: "lead",
      comment: "Primera aprobación",
    });

    const secondApproval = await state.recordApproval({
      actor: "lead",
      comment: "Segunda aprobación",
    });

    expect(secondApproval).toBe(-1);
  });

  it("sets completed_at when transitioning to done", async () => {
    const state = new State(featurePath);
    await state.init({
      featureName: "login-flow",
      createdBy: "dev",
      stackDetected: mockStack,
    });

    await state.transition({
      from: "funcional",
      to: "done",
      reason: "Feature completada",
      actor: "dev",
    });

    const data = await state.load();
    expect(data.state).toBe("done");
    expect(data.completed_at).toBeDefined();
  });
});

describe("renderMetaMd", () => {
  let featurePath: string;

  beforeEach(async () => {
    featurePath = await createTempFeaturePath();
  });

  afterEach(async () => {
    await fs.remove(featurePath);
  });

  it("renders the expected markdown structure", async () => {
    const state = new State(featurePath);
    await state.init({
      featureName: "checkout-flow",
      createdBy: "dev",
      createdByEmail: "dev@example.com",
      stackDetected: mockStack,
      domain: "payments",
    });

    await renderMetaMd(featurePath);

    const meta = await fs.readFile(path.join(featurePath, "meta.md"), "utf-8");
    expect(meta).toMatch(/^---$/m);
    expect(meta).toMatch(/feature_name: "checkout-flow"/);
    expect(meta).toMatch(/state: "funcional"/);
    expect(meta).toMatch(/# Feature: checkout-flow/);
    expect(meta).toMatch(/## Estado Actual/);
    expect(meta).toMatch(/## Historial de Transiciones/);
    expect(meta).toMatch(/## Firmas de Aprobación/);
    expect(meta).toMatch(/_Pendiente de firmas_/);
  });
});
