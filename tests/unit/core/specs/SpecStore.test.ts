import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import {
  createSpecStore,
  readSpec,
  writeSpec,
  listCapabilities,
} from "../../../../src/core/specs/SpecStore.js";
import type { CapabilitySpec } from "../../../../src/core/specs/types.js";

describe("core/specs/SpecStore", () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "sdd-kit-specs-"));
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  const inputSpec: CapabilitySpec = {
    type: "capability-spec",
    capability: "header",
    title: "Header — navegación principal",
    tags: ["header", "navigation"],
    timestamp: "2026-07-13T00:00:00Z",
    origin: "feature",
    requirements: [
      {
        id: "R-001",
        title: "El header muestra el buscador en desktop",
        body: "En desktop el buscador es visible.",
        scenarios: [
          {
            title: "viewport >= md",
            steps: ["WHEN el viewport es >= 768px", "THEN el buscador se renderiza inline"],
          },
        ],
      },
    ],
  };

  it("writes and reads a capability spec", async () => {
    await writeSpec(projectPath, inputSpec);

    const actualSpec = await readSpec(projectPath, "header");
    expect(actualSpec).toBeDefined();
    expect(actualSpec?.capability).toBe("header");
    expect(actualSpec?.title).toBe("Header — navegación principal");
    expect(actualSpec?.requirements).toHaveLength(1);
    expect(actualSpec?.requirements[0].id).toBe("R-001");
  });

  it("returns undefined when the capability does not exist", async () => {
    const actualSpec = await readSpec(projectPath, "missing");
    expect(actualSpec).toBeUndefined();
  });

  it("lists capabilities", async () => {
    await writeSpec(projectPath, inputSpec);
    await writeSpec(projectPath, {
      ...inputSpec,
      capability: "footer",
      title: "Footer",
    });

    const capabilities = await listCapabilities(projectPath);
    expect(capabilities).toEqual(["footer", "header"]);
  });

  it("returns an empty list when specs/ does not exist", async () => {
    const capabilities = await listCapabilities(projectPath);
    expect(capabilities).toEqual([]);
  });

  it("uses the createSpecStore factory", async () => {
    const store = createSpecStore(projectPath);
    await store.write(inputSpec);

    const actualSpec = await store.read("header");
    expect(actualSpec?.capability).toBe("header");
    expect(await store.list()).toEqual(["header"]);
  });
});
