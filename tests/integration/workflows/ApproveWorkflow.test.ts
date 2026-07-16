import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { ApproveWorkflow } from "../../../src/core/workflows/dev/ApproveWorkflow.js";
import { State } from "../../../src/core/state/State.js";
import type { SddConfig } from "../../../src/types/config.js";

describe("core/workflows/dev/ApproveWorkflow", () => {
  let projectPath: string;
  let config: SddConfig;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-approve-"),
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

  async function createFeatureInTasks(featureName: string): Promise<void> {
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
      actor: "diohernandez",
      reason: "Spec funcional aprobada",
    });
    await state.transition({
      from: "tecnico",
      to: "tasks",
      actor: "diohernandez",
      reason: "Spec técnica aprobada",
    });
  }

  it("approves a feature in tasks and moves it to impl", async () => {
    await createFeatureInTasks("checkout-flow");

    const workflow = new ApproveWorkflow();
    const result = await workflow.execute({
      featureName: "checkout-flow",
      projectPath,
      config,
      actor: "diohernandez",
      email: "dionisio.hernandez@bidcom.com.ar",
    });

    expect(result.success).toBe(true);
    expect(result.approvalNumber).toBe(1);

    const state = new State(
      path.join(projectPath, config.wipPath, "checkout-flow"),
    );
    const data = await state.load();
    expect(data.state).toBe("impl");
    expect(data.approvals).toHaveLength(1);
  });

  it("fails when the feature is not in tasks", async () => {
    const featurePath = path.join(projectPath, config.wipPath, "checkout-flow");
    await fs.ensureDir(featurePath);
    await new State(featurePath).init({
      featureName: "checkout-flow",
      createdBy: "diohernandez",
      stackDetected: { language: "typescript" },
    });

    const workflow = new ApproveWorkflow();
    const result = await workflow.execute({
      featureName: "checkout-flow",
      projectPath,
      config,
      actor: "diohernandez",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/tasks/);
  });
});
