import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { Gate } from "../../../../src/core/gate/Gate.js";
import {
  gateResultPath,
  readGateResult,
} from "../../../../src/core/gate/GateResult.js";
import { runStructuralChecks } from "../../../../src/core/gate/checks/structural.js";
import type {
  GateCheck,
  GateConfig,
  GateContext,
} from "../../../../src/core/gate/types.js";

describe("core/gate/Gate", () => {
  let projectPath: string;
  let featurePath: string;
  let context: GateContext;
  const config: GateConfig = { mutation: { enforce: false, threshold: 60 } };

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "sdd-kit-gate-"));
    featurePath = path.join(projectPath, ".sdd", "wip", "checkout-flow");
    await fs.ensureDir(featurePath);
    context = {
      featureName: "checkout-flow",
      featurePath,
      projectPath,
      phase: "impl",
    };
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  async function writeValidFunctionalSpec(): Promise<void> {
    const specPath = path.join(featurePath, "1-functional", "spec.md");
    await fs.ensureDir(path.dirname(specPath));
    await fs.writeFile(
      specPath,
      [
        "## 1. Descripción del Problema",
        "El problema es real.",
        "## 2. Objetivos",
        "- [x] Objetivo completado",
        "## 3. Requisitos Funcionales",
        "### 3.1 Historias de Usuario",
        "**Como** usuario **Quiero** pagar **Para** ahorrar tiempo",
        "### 3.2 Criterios de Aceptación",
        "Criterio 1",
        "## 4. Casos de Uso",
        "Caso 1",
      ].join("\n"),
    );
  }

  it("passes structural checks for a valid functional spec", async () => {
    await writeValidFunctionalSpec();
    await fs.writeFile(path.join(featurePath, "meta.md"), "# checkout-flow");

    const gate = new Gate();
    const result = await gate.run({
      context: { ...context, phase: "funcional" },
      config,
    });

    expect(result.passed).toBe(true);
    expect(result.exit_code).toBe(0);
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  it("writes gate-result.json when writeResult is true", async () => {
    await writeValidFunctionalSpec();
    await fs.writeFile(path.join(featurePath, "meta.md"), "# checkout-flow");

    const gate = new Gate();
    await gate.run({
      context: { ...context, phase: "funcional" },
      config,
    });

    const saved = await readGateResult(featurePath);
    expect(saved).toBeDefined();
    expect(saved?.passed).toBe(true);
    expect(saved?.gate).toBe("funcional");
  });

  it("does not write gate-result.json when writeResult is false", async () => {
    await writeValidFunctionalSpec();
    await fs.writeFile(path.join(featurePath, "meta.md"), "# checkout-flow");

    const gate = new Gate();
    await gate.run({
      context: { ...context, phase: "funcional" },
      config,
      writeResult: false,
    });

    expect(await fs.pathExists(gateResultPath(featurePath))).toBe(false);
  });

  it("fails structural checks when the functional spec is missing", async () => {
    await fs.writeFile(path.join(featurePath, "meta.md"), "# checkout-flow");

    const gate = new Gate();
    const result = await gate.run({
      context: { ...context, phase: "funcional" },
      config,
    });

    expect(result.passed).toBe(false);
    expect(result.exit_code).toBe(1);
    expect(
      result.checks.some(
        (check) => check.name === "functional-spec-exists" && !check.passed,
      ),
    ).toBe(true);
  });

  it("runs build, tests and mutation checks in impl phase when all pass", async () => {
    const structural = async (): Promise<GateCheck[]> => [
      { name: "structural", passed: true },
    ];
    const build = async (): Promise<GateCheck> => ({
      name: "build",
      passed: true,
    });
    const tests = async (): Promise<GateCheck> => ({
      name: "tests",
      passed: true,
    });
    const mutation = async (): Promise<GateCheck> => ({
      name: "mutation",
      passed: true,
    });

    const gate = new Gate(structural, build, tests, mutation);
    const result = await gate.run({ context, config });

    expect(result.passed).toBe(true);
    expect(result.exit_code).toBe(0);
    expect(result.checks.map((check) => check.name)).toEqual([
      "structural",
      "build",
      "tests",
      "mutation",
    ]);
  });

  it("skips tests and mutation when build fails", async () => {
    const structural = async (): Promise<GateCheck[]> => [
      { name: "structural", passed: true },
    ];
    const build = async (): Promise<GateCheck> => ({
      name: "build",
      passed: false,
      detail: "build failed",
    });
    const tests = async (): Promise<GateCheck> => ({
      name: "tests",
      passed: true,
    });
    const mutation = async (): Promise<GateCheck> => ({
      name: "mutation",
      passed: true,
    });

    const gate = new Gate(structural, build, tests, mutation);
    const result = await gate.run({ context, config });

    expect(result.passed).toBe(false);
    expect(result.exit_code).toBe(2);
    expect(result.checks.map((check) => check.name)).toEqual([
      "structural",
      "build",
    ]);
  });

  it("skips mutation when tests fail", async () => {
    const structural = async (): Promise<GateCheck[]> => [
      { name: "structural", passed: true },
    ];
    const build = async (): Promise<GateCheck> => ({
      name: "build",
      passed: true,
    });
    const tests = async (): Promise<GateCheck> => ({
      name: "tests",
      passed: false,
      detail: "tests failed",
    });
    const mutation = async (): Promise<GateCheck> => ({
      name: "mutation",
      passed: true,
    });

    const gate = new Gate(structural, build, tests, mutation);
    const result = await gate.run({ context, config });

    expect(result.passed).toBe(false);
    expect(result.exit_code).toBe(3);
    expect(result.checks.map((check) => check.name)).toEqual([
      "structural",
      "build",
      "tests",
    ]);
  });

  it("skips build/tests/mutation checks in non-impl phases", async () => {
    await writeValidFunctionalSpec();
    await fs.writeFile(path.join(featurePath, "meta.md"), "# checkout-flow");

    const gate = new Gate();
    const result = await gate.run({
      context: { ...context, phase: "funcional" },
      config,
    });

    const names = result.checks.map((check) => check.name);
    expect(names).not.toContain("build");
    expect(names).not.toContain("tests");
    expect(names).not.toContain("mutation");
  });

  it("uses the real structural runner by default", async () => {
    await writeValidFunctionalSpec();
    await fs.writeFile(path.join(featurePath, "meta.md"), "# checkout-flow");

    const gate = new Gate(
      runStructuralChecks,
      async () => ({ name: "build", passed: true }),
      async () => ({ name: "tests", passed: true }),
      async () => ({ name: "mutation", passed: true }),
    );
    const result = await gate.run({
      context: { ...context, phase: "funcional" },
      config,
    });

    expect(result.passed).toBe(true);
    expect(
      result.checks.some((check) => check.name.startsWith("section:")),
    ).toBe(true);
  });
});
