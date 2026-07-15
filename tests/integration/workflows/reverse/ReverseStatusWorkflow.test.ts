import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { ReverseStatusWorkflow } from "../../../../src/core/workflows/reverse/ReverseStatusWorkflow.js";
import { ReverseWorkflow } from "../../../../src/core/workflows/reverse/ReverseWorkflow.js";
import type { SddConfig } from "../../../../src/types/config.js";

describe("core/workflows/reverse/ReverseStatusWorkflow", () => {
  let projectPath: string;
  let config: SddConfig;
  const workflow = new ReverseStatusWorkflow();

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-reverse-status-"),
    );
    config = {
      sddPath: ".sdd",
      wipPath: ".sdd/wip",
      reversePath: ".sdd/reverse",
      knowledgePath: ".sdd/knowledge",
      specsPath: "specs",
      archivePath: ".sdd/archive",
      locale: "es",
      stack: { language: "typescript", framework: "Next.js 15.3.8" },
      projectName: "my-app",
      mutation: { enforce: false, threshold: 60 },
      telemetry: { enabled: true, runsFile: ".sdd/telemetry/runs.jsonl" },
    };
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("reports the project does not exist", async () => {
    const actualResult = await workflow.execute({
      projectPath,
      config,
      projectName: "ghost",
    });

    expect(actualResult.success).toBe(false);
    expect(actualResult.error).toMatch(/ghost/);
  });

  it("reports a freshly initialized project as only the constitution phase pending", async () => {
    await new ReverseWorkflow().execute({
      projectName: "bidcom-website",
      projectPath,
      config,
      author: { name: "diohernandez" },
    });

    const actualResult = await workflow.execute({
      projectPath,
      config,
      projectName: "bidcom-website",
    });

    expect(actualResult.success).toBe(true);
    expect(actualResult.project?.summary.state).toBe("constitution");
    expect(
      actualResult.project?.phases.find((p) => p.phase === "constitution")
        ?.completed,
    ).toBe(true);
    expect(
      actualResult.project?.phases.find((p) => p.phase === "1-spec")?.completed,
    ).toBe(false);
    expect(actualResult.project?.completed).toBe(1);
    expect(actualResult.project?.total).toBe(8);
    expect(actualResult.project?.percent).toBe(12);
  });

  it("counts markdown documents per phase and marks it completed once any exist", async () => {
    await new ReverseWorkflow().execute({
      projectName: "bidcom-website",
      projectPath,
      config,
      author: { name: "diohernandez" },
    });
    const specDir = path.join(
      projectPath,
      ".sdd",
      "reverse",
      "bidcom-website",
      "1-spec",
    );
    await fs.writeFile(path.join(specDir, "spec.md"), "# Stack");

    const actualResult = await workflow.execute({
      projectPath,
      config,
      projectName: "bidcom-website",
    });

    const specPhase = actualResult.project?.phases.find(
      (p) => p.phase === "1-spec",
    );
    expect(specPhase?.completed).toBe(true);
    expect(specPhase?.documentCount).toBe(1);
    expect(actualResult.project?.completed).toBe(2);
  });

  it("lists all projects with a summary by state when no projectName is given", async () => {
    await new ReverseWorkflow().execute({
      projectName: "project-a",
      projectPath,
      config,
      author: { name: "diohernandez" },
    });
    await new ReverseWorkflow().execute({
      projectName: "project-b",
      projectPath,
      config,
      author: { name: "diohernandez" },
    });

    const actualResult = await workflow.execute({ projectPath, config });

    expect(actualResult.success).toBe(true);
    expect(actualResult.projects).toHaveLength(2);
    expect(actualResult.summaryByState).toEqual({ constitution: 2 });
  });

  it("returns an empty list when the reverse base path does not exist", async () => {
    const actualResult = await workflow.execute({ projectPath, config });

    expect(actualResult).toEqual({
      success: true,
      projects: [],
      summaryByState: {},
    });
  });
});
