import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import {
  createDeltaMerge,
  mergeDelta,
  readDelta,
  writeDelta,
} from "../../../../src/core/specs/DeltaMerge.js";
import type {
  CapabilityDelta,
  CapabilitySpec,
} from "../../../../src/core/specs/types.js";

describe("core/specs/DeltaMerge", () => {
  let projectPath: string;
  let featurePath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-delta-merge-"),
    );
    featurePath = path.join(projectPath, ".sdd", "wip", "checkout-flow");
    await fs.ensureDir(featurePath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  function createBaseline(): CapabilitySpec {
    return {
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
          scenarios: [
            {
              title: "desktop",
              steps: ["WHEN viewport >= 768px", "THEN buscador inline"],
            },
          ],
        },
      ],
    };
  }

  it("adds a new requirement", async () => {
    const baseline = createBaseline();
    const delta: CapabilityDelta = {
      type: "capability-delta",
      capability: "header",
      change_ref: "checkout-flow",
      added: [
        {
          id: "R-002",
          title: "Buscador colapsado en mobile",
          body: "En mobile se oculta.",
          scenarios: [
            {
              title: "mobile",
              steps: ["WHEN viewport < 768px", "THEN buscador colapsado"],
            },
          ],
        },
      ],
      modified: [],
      removed: [],
    };

    const result = mergeDelta(baseline, delta);
    expect(result.changes.added).toEqual(["R-002"]);
    expect(result.spec.requirements).toHaveLength(2);
    expect(result.spec.requirements.map((r) => r.id)).toContain("R-001");
    expect(result.spec.requirements.map((r) => r.id)).toContain("R-002");
  });

  it("modifies an existing requirement", async () => {
    const baseline = createBaseline();
    const delta: CapabilityDelta = {
      type: "capability-delta",
      capability: "header",
      change_ref: "checkout-flow",
      added: [],
      modified: [
        {
          id: "R-001",
          title: "Buscador en desktop y tablet",
          previousTitle: "Buscador en desktop",
          body: "En desktop y tablet se ve.",
          scenarios: [
            {
              title: "desktop/tablet",
              steps: ["WHEN viewport >= 768px", "THEN buscador inline"],
            },
          ],
        },
      ],
      removed: [],
    };

    const result = mergeDelta(baseline, delta);
    expect(result.changes.modified).toEqual(["R-001"]);
    expect(result.spec.requirements).toHaveLength(1);
    expect(result.spec.requirements[0].title).toBe(
      "Buscador en desktop y tablet",
    );
  });

  it("removes an existing requirement", async () => {
    const baseline = createBaseline();
    const delta: CapabilityDelta = {
      type: "capability-delta",
      capability: "header",
      change_ref: "checkout-flow",
      added: [],
      modified: [],
      removed: ["R-001"],
    };

    const result = mergeDelta(baseline, delta);
    expect(result.changes.removed).toEqual(["R-001"]);
    expect(result.spec.requirements).toHaveLength(0);
  });

  it("does not duplicate added requirements", async () => {
    const baseline = createBaseline();
    const delta: CapabilityDelta = {
      type: "capability-delta",
      capability: "header",
      change_ref: "checkout-flow",
      added: [baseline.requirements[0]],
      modified: [],
      removed: [],
    };

    const result = mergeDelta(baseline, delta);
    expect(result.changes.added).toEqual([]);
    expect(result.spec.requirements).toHaveLength(1);
  });

  it("writes and reads a delta file", async () => {
    const delta: CapabilityDelta = {
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

    await writeDelta(featurePath, delta);
    const actualDelta = await readDelta(featurePath, "header");
    expect(actualDelta).toBeDefined();
    expect(actualDelta?.capability).toBe("header");
    expect(actualDelta?.added).toHaveLength(1);
    expect(actualDelta?.added[0].id).toBe("R-002");
  });

  it("uses the createDeltaMerge factory", async () => {
    const deltaMerge = createDeltaMerge(featurePath);
    const delta: CapabilityDelta = {
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

    await deltaMerge.write(delta);
    const actualDelta = await deltaMerge.read("header");
    expect(actualDelta?.added[0].id).toBe("R-002");
  });
});
