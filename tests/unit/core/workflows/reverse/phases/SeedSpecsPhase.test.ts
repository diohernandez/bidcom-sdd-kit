import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { SeedSpecsPhase } from "../../../../../../src/core/workflows/reverse/phases/SeedSpecsPhase.js";
import { readSpec } from "../../../../../../src/core/specs/SpecStore.js";

describe("core/workflows/reverse/phases/SeedSpecsPhase", () => {
  let projectPath: string;
  let reversePath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-seed-specs-"),
    );
    reversePath = path.join(projectPath, ".sdd", "reverse", "my-app");
    await fs.ensureDir(reversePath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("seeds specs from reverse phase documents", async () => {
    await fs.ensureDir(path.join(reversePath, "1-spec"));
    await fs.writeFile(
      path.join(reversePath, "1-spec", "spec.md"),
      "## TypeScript + Next.js\n\nDetalles del stack.\n\n## Tailwind CSS\n\nEstilos.",
    );

    const phase = new SeedSpecsPhase();
    const result = await phase.execute({
      projectName: "my-app",
      projectPath,
      reversePath,
      analyst: "diohernandez",
    });

    expect(result.success).toBe(true);
    expect(result.summary).toContain("stack");

    const spec = await readSpec(projectPath, "stack");
    expect(spec).toBeDefined();
    expect(spec?.origin).toBe("reverse-engineered");
    expect(spec?.requirements).toHaveLength(2);
    expect(spec?.requirements[0].id).toBe("R-001");
  });

  it("skips missing phase files", async () => {
    const phase = new SeedSpecsPhase();
    const result = await phase.execute({
      projectName: "my-app",
      projectPath,
      reversePath,
      analyst: "diohernandez",
    });

    expect(result.success).toBe(true);
    expect(result.summary).toContain("ninguna");
  });
});
