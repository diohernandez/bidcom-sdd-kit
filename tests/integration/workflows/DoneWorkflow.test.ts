import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { DoneWorkflow } from "../../../src/core/workflows/dev/DoneWorkflow.js";
import { State } from "../../../src/core/state/State.js";
import { writeDelta } from "../../../src/core/specs/DeltaMerge.js";
import type { CapabilityDelta } from "../../../src/core/specs/types.js";
import type { SddConfig } from "../../../src/types/config.js";

describe("core/workflows/dev/DoneWorkflow", () => {
  let projectPath: string;
  let config: SddConfig;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-done-"),
    );
    config = {
      sddPath: ".sdd",
      wipPath: ".sdd/wip",
      reversePath: ".sdd/reverse",
      knowledgePath: ".sdd/knowledge",
      specsPath: "specs",
      archivePath: ".sdd/archive",
      locale: "es",
      projectName: "my-app",
      stack: { language: "typescript" },
      mutation: { enforce: false, threshold: 60 },
      telemetry: { enabled: false, runsFile: "" },
    };
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  const inputDelta: CapabilityDelta = {
    type: "capability-delta",
    capability: "header",
    change_ref: "checkout-flow",
    added: [
      {
        id: "R-001",
        title: "Buscador en desktop",
        body: "En desktop se ve.",
        scenarios: [],
      },
    ],
    modified: [],
    removed: [],
  };

  async function createFeatureInImpl(featureName: string): Promise<void> {
    const featurePath = path.join(projectPath, config.wipPath, featureName);
    await fs.ensureDir(featurePath);
    const state = new State(featurePath);
    await state.init({
      featureName,
      createdBy: "diohernandez",
      stackDetected: {
        language: "typescript",
        framework: "nextjs",
        testing: { unit: ["jest"] },
      },
    });
    await state.transition({
      from: "funcional",
      to: "tecnico",

      reason: "Spec funcional aprobada",
    });
    await state.transition({
      from: "tecnico",
      to: "tasks",

      reason: "Spec técnica aprobada",
    });
    await state.transition({
      from: "tasks",
      to: "impl",

      reason: "Plan aprobado",
    });
  }

  it("archives a feature in impl and merges its delta", async () => {
    await createFeatureInImpl("checkout-flow");
    await writeDelta(
      path.join(projectPath, config.wipPath, "checkout-flow"),
      inputDelta,
    );

    const workflow = new DoneWorkflow();
    const result = await workflow.execute({
      featureName: "checkout-flow",
      projectPath,
      config,

    });

    expect(result.success).toBe(true);
    expect(result.mergedCapabilities).toEqual(["header"]);
    expect(
      await fs.pathExists(
        path.join(projectPath, config.archivePath, "checkout-flow"),
      ),
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(projectPath, config.wipPath, "checkout-flow"),
      ),
    ).toBe(false);
  });

  it("fails when the feature is not in impl", async () => {
    const featurePath = path.join(projectPath, config.wipPath, "checkout-flow");
    await fs.ensureDir(featurePath);
    await new State(featurePath).init({
      featureName: "checkout-flow",
      createdBy: "diohernandez",
      stackDetected: { language: "typescript" },
    });

    const workflow = new DoneWorkflow();
    const result = await workflow.execute({
      featureName: "checkout-flow",
      projectPath,
      config,

    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/impl/);
  });
});
