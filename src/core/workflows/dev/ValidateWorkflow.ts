import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../../utils/fs.js";
import { parseFrontmatter } from "../../../utils/frontmatter.js";
import { Gate } from "../../../core/gate/index.js";
import type { ExitCode } from "../../../core/gate/types.js";
import type { TelemetryEmitter } from "../../../core/telemetry/index.js";
import type { SddConfig } from "../../../types/config.js";
import type { StateData } from "../../../core/state/types.js";

export interface ValidateOptions {
  featureName: string;
  projectPath: string;
  config: SddConfig;
}

export interface ValidateCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface ValidateResult {
  success: boolean;
  phase?: string;
  checks?: ValidateCheck[];
  error?: string;
  exit_code?: ExitCode;
}

export class ValidateWorkflow {
  constructor(
    private readonly gate: Gate = new Gate(),
    private readonly telemetry?: TelemetryEmitter,
  ) {}

  async execute(options: ValidateOptions): Promise<ValidateResult> {
    const { featureName, projectPath, config } = options;
    const featurePath = path.join(projectPath, config.wipPath, featureName);
    const statePath = path.join(featurePath, "state.json");
    const metaPath = path.join(featurePath, "meta.md");

    if (!(await fileExists(statePath)) && !(await fileExists(metaPath))) {
      return {
        success: false,
        error: `El feature "${featureName}" no existe (falta ${statePath})`,
      };
    }

    let phase: string | undefined;
    if (await fileExists(statePath)) {
      const data = (await fs.readJson(statePath)) as StateData;
      phase = data.state;
    } else {
      const meta = await fs.readFile(metaPath, "utf-8");
      const { data } = parseFrontmatter(meta);
      phase = typeof data.state === "string" ? data.state : undefined;
    }

    if (!phase) {
      return {
        success: false,
        error: `No se pudo determinar la fase del feature "${featureName}"`,
      };
    }

    const startTime = Date.now();
    const gateResult = await this.gate.run({
      context: {
        featureName,
        featurePath,
        projectPath,
        phase,
      },
      config: {
        mutation: config.mutation,
      },
    });
    const duration = Date.now() - startTime;

    const result: ValidateResult = {
      success: gateResult.passed,
      phase,
      checks: gateResult.checks,
      exit_code: gateResult.exit_code,
    };

    if (this.telemetry) {
      await this.telemetry.emit({
        at: new Date().toISOString(),
        feature: featureName,
        phase,
        success: result.success,
        exit_code: result.exit_code,
        checks: result.checks ?? [],
        duration_ms: duration,
      });
    }

    return result;
  }
}
