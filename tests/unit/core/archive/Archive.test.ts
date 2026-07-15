import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { archiveFeature } from "../../../../src/core/archive/Archive.js";
import { State } from "../../../../src/core/state/State.js";
import { writeSpec } from "../../../../src/core/specs/SpecStore.js";
import { writeDelta } from "../../../../src/core/specs/DeltaMerge.js";
import type { CapabilitySpec, CapabilityDelta } from "../../../../src/core/specs/types.js";

async function createFeatureInImpl(
  projectPath: string,
  featureName: string,
): Promise<void> {
  const featurePath = path.join(projectPath, ".sdd", "wip", featureName);
  await fs.ensureDir(featurePath);
  await new State(featurePath).init({
    featureName,
    createdBy: "diohernandez",
    createdByEmail: "dionisio.hernandez@bidcom.com.ar",
      stackDetected: {
        language: "typescript",
        framework: "nextjs",
        testing: { unit: ["jest"] },
      },
  });
  await new State(featurePath).transition({
    from: "funcional",
    to: "tecnico",
    actor: "diohernandez",
    reason: "Spec funcional aprobada",
  });
  await new State(featurePath).transition({
    from: "tecnico",
    to: "tasks",
    actor: "diohernandez",
    reason: "Spec técnica aprobada",
  });
  await new State(featurePath).transition({
    from: "tasks",
    to: "impl",
    actor: "diohernandez",
    reason: "Plan aprobado",
  });
}

describe("core/archive/Archive", () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-archive-"),
    );
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  const inputSpec: CapabilitySpec = {
    type: "capability-spec",
    capability: "header",
    title: "Header",
    tags: ["header"],
    timestamp: "2026-07-13T00:00:00Z",
    origin: "baseline",
    requirements: [
      {
        id: "R-001",
        title: "Buscador en desktop",
        body: "En desktop se ve.",
        scenarios: [],
      },
    ],
  };

  const inputDelta: CapabilityDelta = {
    type: "capability-delta",
    capability: "header",
    change_ref: "checkout-flow",
    added: [
      {
        id: "R-002",
        title: "Buscador colapsado en mobile",
        body: "En mobile se oculta.",
        scenarios: [],
      },
    ],
    modified: [],
    removed: [],
  };

  it("archives a feature from impl and merges its deltas", async () => {
    await createFeatureInImpl(projectPath, "checkout-flow");
    await writeSpec(projectPath, inputSpec);
    await writeDelta(
      path.join(projectPath, ".sdd", "wip", "checkout-flow"),
      inputDelta,
    );

    const result = await archiveFeature({
      featureName: "checkout-flow",
      projectPath,
      wipPath: ".sdd/wip",
      archivePath: ".sdd/archive",
      specsPath: "specs",
      backupPath: ".sdd/backups",
    });

    expect(result.success).toBe(true);
    expect(result.mergedCapabilities).toEqual(["header"]);

    const archivedSpec = await fs.readFile(
      path.join(projectPath, ".sdd", "archive", "checkout-flow", "state.json"),
      "utf-8",
    );
    expect(JSON.parse(archivedSpec).state).toBe("done");

    const updatedSpec = await fs.readFile(
      path.join(projectPath, "specs", "header", "spec.md"),
      "utf-8",
    );
    expect(updatedSpec).toContain("R-002");

    expect(
      await fs.pathExists(
        path.join(projectPath, ".sdd", "wip", "checkout-flow"),
      ),
    ).toBe(false);
    expect(
      await fs.pathExists(
        path.join(projectPath, ".sdd", "archive", "checkout-flow"),
      ),
    ).toBe(true);
  });

  it("creates a snapshot of specs before merging", async () => {
    await createFeatureInImpl(projectPath, "checkout-flow");
    await writeSpec(projectPath, inputSpec);
    await writeDelta(
      path.join(projectPath, ".sdd", "wip", "checkout-flow"),
      inputDelta,
    );

    const result = await archiveFeature({
      featureName: "checkout-flow",
      projectPath,
      wipPath: ".sdd/wip",
      archivePath: ".sdd/archive",
      specsPath: "specs",
      backupPath: ".sdd/backups",
    });

    expect(result.snapshotPath).toBeDefined();
    expect(await fs.pathExists(result.snapshotPath!)).toBe(true);
  });

  it("generates specs/index.md and specs/log.md", async () => {
    await createFeatureInImpl(projectPath, "checkout-flow");
    await writeSpec(projectPath, inputSpec);
    await writeDelta(
      path.join(projectPath, ".sdd", "wip", "checkout-flow"),
      inputDelta,
    );

    await archiveFeature({
      featureName: "checkout-flow",
      projectPath,
      wipPath: ".sdd/wip",
      archivePath: ".sdd/archive",
      specsPath: "specs",
      backupPath: ".sdd/backups",
    });

    const index = await fs.readFile(
      path.join(projectPath, "specs", "index.md"),
      "utf-8",
    );
    expect(index).toContain("Capability Index");
    expect(index).toContain("header");

    const log = await fs.readFile(
      path.join(projectPath, "specs", "log.md"),
      "utf-8",
    );
    expect(log).toContain("checkout-flow");
    expect(log).toContain("header");
  });

  it("fails when the feature is not in impl", async () => {
    const featurePath = path.join(projectPath, ".sdd", "wip", "checkout-flow");
    await fs.ensureDir(featurePath);
    await new State(featurePath).init({
      featureName: "checkout-flow",
      createdBy: "diohernandez",
      stackDetected: {
        language: "typescript",
        framework: "nextjs",
        testing: { unit: ["jest"] },
      },
    });

    const result = await archiveFeature({
      featureName: "checkout-flow",
      projectPath,
      wipPath: ".sdd/wip",
      archivePath: ".sdd/archive",
      specsPath: "specs",
      backupPath: ".sdd/backups",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/impl/);
  });

  it("fails when the feature does not exist", async () => {
    const result = await archiveFeature({
      featureName: "missing",
      projectPath,
      wipPath: ".sdd/wip",
      archivePath: ".sdd/archive",
      specsPath: "specs",
      backupPath: ".sdd/backups",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no existe/);
  });
});
