import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { analyzeFeature } from "../../../../src/core/analyze/Analyzer.js";
import { writeDelta } from "../../../../src/core/specs/DeltaMerge.js";
import type { CapabilityDelta } from "../../../../src/core/specs/types.js";

describe("core/analyze/Analyzer", () => {
  let projectPath: string;
  let featurePath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-analyze-"),
    );
    featurePath = path.join(projectPath, ".sdd", "wip", "checkout-flow");
    await fs.ensureDir(path.join(featurePath, "1-functional"));
    await fs.ensureDir(path.join(featurePath, "3-tasks"));
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

  it("reports valid coverage when every requirement has tasks and vice versa", async () => {
    await fs.writeFile(
      path.join(featurePath, "1-functional", "spec.md"),
      "**Como** comprador **Quiero** buscar productos **Para** encontrarlos rápido",
    );
    await fs.writeFile(
      path.join(featurePath, "3-tasks", "task-list.md"),
      [
        "| ID | Tarea | Estimación |",
        "|----|-------|------------|",
        "| T1 | Implementar buscador desktop | 2h |",
        "**Requirements**: R-001",
        "| T2 | Implementar buscador mobile | 2h |",
        "**Requirements**: R-002",
      ].join("\n"),
    );
    await writeDelta(featurePath, inputDelta);

    const report = await analyzeFeature({
      featureName: "checkout-flow",
      projectPath,
      wipPath: ".sdd/wip",
      specsPath: "specs",
    });

    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.stories).toHaveLength(1);
    expect(report.requirements).toEqual(["R-001", "R-002"]);
    expect(report.tasks).toHaveLength(2);
  });

  it("reports an orphan requirement when it has no tasks", async () => {
    await fs.writeFile(
      path.join(featurePath, "1-functional", "spec.md"),
      "**Como** comprador **Quiero** buscar productos **Para** encontrarlos rápido",
    );
    await fs.writeFile(
      path.join(featurePath, "3-tasks", "task-list.md"),
      [
        "| ID | Tarea | Estimación |",
        "|----|-------|------------|",
        "| T1 | Implementar buscador desktop | 2h |",
        "**Requirements**: R-001",
      ].join("\n"),
    );
    await writeDelta(featurePath, inputDelta);

    const report = await analyzeFeature({
      featureName: "checkout-flow",
      projectPath,
      wipPath: ".sdd/wip",
      specsPath: "specs",
    });

    expect(report.valid).toBe(false);
    expect(report.issues).toEqual([
      {
        type: "requirement-orphan",
        id: "R-002",
        detail: "El requirement R-002 no tiene ninguna tarea asignada",
      },
    ]);
  });

  it("reports an orphan task when it has no requirements", async () => {
    await fs.writeFile(
      path.join(featurePath, "1-functional", "spec.md"),
      "**Como** comprador **Quiero** buscar productos **Para** encontrarlos rápido",
    );
    await fs.writeFile(
      path.join(featurePath, "3-tasks", "task-list.md"),
      [
        "| ID | Tarea | Estimación |",
        "|----|-------|------------|",
        "| T1 | Implementar buscador desktop | 2h |",
        "**Requirements**: R-001",
        "| T2 | Documentar API | 1h |",
      ].join("\n"),
    );
    await writeDelta(featurePath, inputDelta);

    const report = await analyzeFeature({
      featureName: "checkout-flow",
      projectPath,
      wipPath: ".sdd/wip",
      specsPath: "specs",
    });

    expect(report.valid).toBe(false);
    expect(report.issues.some((issue) => issue.type === "task-orphan")).toBe(true);
  });

  it("reports unknown requirements referenced by tasks", async () => {
    await fs.writeFile(
      path.join(featurePath, "1-functional", "spec.md"),
      "**Como** comprador **Quiero** buscar productos **Para** encontrarlos rápido",
    );
    await fs.writeFile(
      path.join(featurePath, "3-tasks", "task-list.md"),
      [
        "| ID | Tarea | Estimación |",
        "|----|-------|------------|",
        "| T1 | Implementar buscador desktop | 2h |",
        "**Requirements**: R-001, R-099",
      ].join("\n"),
    );
    await writeDelta(featurePath, inputDelta);

    const report = await analyzeFeature({
      featureName: "checkout-flow",
      projectPath,
      wipPath: ".sdd/wip",
      specsPath: "specs",
    });

    expect(report.valid).toBe(false);
    expect(report.issues.some((issue) => issue.type === "task-unknown-requirement")).toBe(true);
  });
});
