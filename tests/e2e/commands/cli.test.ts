import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { createProgram } from "../../../src/cli/createProgram.js";

interface CliRunResult {
  exitCode: number | undefined;
  stdout: string;
  stderr: string;
}

async function runCli(args: string[]): Promise<CliRunResult> {
  const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  const errorSpy = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
  process.exitCode = undefined;

  try {
    await createProgram().parseAsync(["node", "sdd", ...args]);
  } catch (error) {
    if (!(error instanceof Error) || !("exitCode" in error)) throw error;
  }

  const stdout = logSpy.mock.calls.map((call) => call.join(" ")).join("\n");
  const stderr = errorSpy.mock.calls.map((call) => call.join(" ")).join("\n");
  const exitCode = process.exitCode as number | undefined;

  logSpy.mockRestore();
  errorSpy.mockRestore();
  process.exitCode = undefined;

  return { exitCode, stdout, stderr };
}

describe("cli", () => {
  let projectPath: string;
  let originalCwd: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "sdd-kit-cli-e2e-"));
    originalCwd = process.cwd();
    process.chdir(projectPath);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(projectPath);
  });

  it("runs any command against an uninitialized project and fails with a clear error", async () => {
    const result = await runCli(["status"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/no está inicializado/);
  });

  it("init creates .sdd/config.yml and reports the detected stack", async () => {
    await fs.writeJson(path.join(projectPath, "package.json"), {
      dependencies: { next: "^15.0.0" },
    });

    const result = await runCli(["init"]);

    expect(result.exitCode).toBeUndefined();
    expect(
      await fs.pathExists(path.join(projectPath, ".sdd", "config.yml")),
    ).toBe(true);
    expect(result.stdout).toMatch(/typescript/);
  });

  it("init fails when the project is already initialized", async () => {
    await runCli(["init"]);
    const result = await runCli(["init"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/ya está inicializado/);
  });

  it("drives plan -> validate -> build -> status for a dev feature", async () => {
    await runCli(["init"]);

    const planResult = await runCli(["plan", "checkout-flow"]);
    expect(planResult.exitCode).toBeUndefined();
    expect(
      await fs.pathExists(
        path.join(projectPath, ".sdd", "wip", "checkout-flow", "meta.md"),
      ),
    ).toBe(true);

    const validateResult = await runCli(["validate", "checkout-flow"]);
    expect(validateResult.exitCode).toBe(1);
    expect(validateResult.stdout).toMatch(/❌/);

    const buildResult = await runCli(["build", "checkout-flow"]);
    expect(buildResult.exitCode).toBe(1);
    expect(buildResult.stderr).toMatch(/fase actual/);

    const statusResult = await runCli(["status"]);
    expect(statusResult.exitCode).toBeUndefined();
    expect(statusResult.stdout).toMatch(/checkout-flow/);

    const singleStatusResult = await runCli(["status", "checkout-flow"]);
    expect(singleStatusResult.exitCode).toBeUndefined();
    expect(singleStatusResult.stdout).toMatch(/Estado: funcional/);
  });

  it("plan fails with a clear error for a feature that already exists", async () => {
    await runCli(["init"]);
    await runCli(["plan", "checkout-flow"]);
    const result = await runCli(["plan", "checkout-flow"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/ya existe/);
  });

  it("drives reverse init -> analyze -> status -> validate", async () => {
    await fs.writeJson(path.join(projectPath, "package.json"), {
      dependencies: { next: "^15.0.0" },
    });
    await runCli(["init"]);

    const initResult = await runCli(["reverse", "init", "legacy-app"]);
    expect(initResult.exitCode).toBeUndefined();

    const analyzeResult = await runCli([
      "reverse",
      "analyze",
      "stack",
      "--project",
      "legacy-app",
    ]);
    expect(analyzeResult.exitCode).toBeUndefined();
    expect(
      await fs.pathExists(
        path.join(
          projectPath,
          ".sdd",
          "reverse",
          "legacy-app",
          "1-spec",
          "spec.md",
        ),
      ),
    ).toBe(true);

    const statusResult = await runCli(["reverse", "status", "legacy-app"]);
    expect(statusResult.exitCode).toBeUndefined();
    expect(statusResult.stdout).toMatch(/Especificación funcional/);

    const validateResult = await runCli(["reverse", "validate", "legacy-app"]);
    expect(validateResult.exitCode).toBe(1);
    expect(validateResult.stdout).toMatch(/Errores:/);
  });

  it("reverse analyze rejects an unknown phase name", async () => {
    await fs.writeJson(path.join(projectPath, "package.json"), {
      dependencies: { next: "^15.0.0" },
    });
    await runCli(["init"]);
    await runCli(["reverse", "init", "legacy-app"]);

    const result = await runCli([
      "reverse",
      "analyze",
      "bogus",
      "--project",
      "legacy-app",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Fase desconocida/);
  });

  it("reverse analyze rejects a project that does not exist", async () => {
    await runCli(["init"]);

    const result = await runCli([
      "reverse",
      "analyze",
      "stack",
      "--project",
      "ghost",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/no existe/);
  });

  it("reverse status reports all projects when no name is given", async () => {
    await fs.writeJson(path.join(projectPath, "package.json"), {
      dependencies: { next: "^15.0.0" },
    });
    await runCli(["init"]);
    await runCli(["reverse", "init", "project-a"]);
    await runCli(["reverse", "init", "project-b"]);

    const result = await runCli(["reverse", "status"]);

    expect(result.exitCode).toBeUndefined();
    expect(result.stdout).toMatch(/project-a/);
    expect(result.stdout).toMatch(/project-b/);
  });

  it("status reports no features when wip is empty", async () => {
    await runCli(["init"]);

    const result = await runCli(["status"]);

    expect(result.exitCode).toBeUndefined();
    expect(result.stdout).toMatch(/No hay features en progreso/);
  });

  it("reverse status reports no projects when reverse is empty", async () => {
    await runCli(["init"]);

    const result = await runCli(["reverse", "status"]);

    expect(result.exitCode).toBeUndefined();
    expect(result.stdout).toMatch(/No hay proyectos de reverse engineering/);
  });

  it("validate fails when the feature does not exist", async () => {
    await runCli(["init"]);

    const result = await runCli(["validate", "missing-feature"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/no existe/);
  });

  it("build fails when the feature does not exist", async () => {
    await runCli(["init"]);

    const result = await runCli(["build", "missing-feature"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/no existe/);
  });

  it("build succeeds when the feature is in impl phase", async () => {
    await runCli(["init"]);
    await runCli(["plan", "ready-feature"]);
    const featurePath = path.join(projectPath, ".sdd", "wip", "ready-feature");
    const statePath = path.join(featurePath, "state.json");
    const stateContent = await fs.readJson(statePath);
    stateContent.state = "impl";
    stateContent.last_updated = "2026-07-15T00:00:00Z";
    await fs.writeJson(statePath, stateContent, { spaces: 2 });

    const result = await runCli(["build", "ready-feature"]);

    expect(result.exitCode).toBeUndefined();
    expect(result.stdout).toMatch(/listo para implementación/);
  });

  it("reverse validate fails when the project does not exist", async () => {
    await runCli(["init"]);

    const result = await runCli(["reverse", "validate", "missing-project"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/no existe/);
  });

  it("reverse init fails when the project already exists", async () => {
    await fs.writeJson(path.join(projectPath, "package.json"), {
      dependencies: { next: "^15.0.0" },
    });
    await runCli(["init"]);
    await runCli(["reverse", "init", "legacy-app"]);

    const result = await runCli(["reverse", "init", "legacy-app"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/ya existe/);
  });
});
