import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import {
  createTelemetryEmitter,
  defaultTelemetryConfig,
} from "../../../../src/core/telemetry/Telemetry.js";

describe("core/telemetry/Telemetry", () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "sdd-kit-telemetry-"),
    );
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("appends a run to the jsonl file when enabled", async () => {
    const config = defaultTelemetryConfig();
    const emitter = createTelemetryEmitter(projectPath, config);

    await emitter.emit({
      at: "2026-07-15T00:00:00Z",
      feature: "checkout-flow",
      phase: "funcional",
      success: true,
      exit_code: 0,
      checks: [{ name: "meta.md", passed: true }],
      duration_ms: 42,
    });

    const runs = await emitter.read();
    expect(runs).toHaveLength(1);
    expect(runs[0].feature).toBe("checkout-flow");
    expect(runs[0].success).toBe(true);
  });

  it("does not write when telemetry is disabled", async () => {
    const config = { ...defaultTelemetryConfig(), enabled: false };
    const emitter = createTelemetryEmitter(projectPath, config);

    await emitter.emit({
      at: "2026-07-15T00:00:00Z",
      feature: "checkout-flow",
      phase: "funcional",
      success: true,
      exit_code: 0,
      checks: [],
      duration_ms: 0,
    });

    const runs = await emitter.read();
    expect(runs).toHaveLength(0);
  });
});
