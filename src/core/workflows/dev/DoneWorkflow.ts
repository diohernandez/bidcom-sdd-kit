import path from "node:path";
import { fileExists } from "../../../utils/fs.js";
import { State } from "../../state/State.js";
import { archiveFeature } from "../../archive/index.js";
import type { SddConfig } from "../../../types/config.js";
import type { ArchiveResult } from "../../archive/types.js";

export interface DoneOptions {
  featureName: string;
  projectPath: string;
  config: SddConfig;
}

export interface DoneResult extends ArchiveResult {
  approvalNumber?: number;
}

export class DoneWorkflow {
  async execute(options: DoneOptions): Promise<DoneResult> {
    const { featureName, projectPath, config } = options;
    const featurePath = path.join(projectPath, config.wipPath, featureName);

    if (!(await fileExists(featurePath))) {
      return {
        success: false,
        featureName,
        archivedAt: "",
        archivePath: path.join(projectPath, config.archivePath, featureName),
        error: `El feature "${featureName}" no existe en ${featurePath}`,
      };
    }

    const state = new State(featurePath);
    if (!(await state.exists())) {
      return {
        success: false,
        featureName,
        archivedAt: "",
        archivePath: path.join(projectPath, config.archivePath, featureName),
        error: `No se encontró state.json para "${featureName}"`,
      };
    }

    const data = await state.load();
    if (data.state !== "impl") {
      return {
        success: false,
        featureName,
        archivedAt: "",
        archivePath: path.join(projectPath, config.archivePath, featureName),
        error: `El feature "${featureName}" está en fase "${data.state}" — solo se puede cerrar desde "impl"`,
      };
    }

    const archiveResult = await archiveFeature({
      featureName,
      projectPath,
      wipPath: config.wipPath,
      archivePath: config.archivePath,
      specsPath: config.specsPath,
      backupPath: path.join(config.sddPath, "backups"),
    });

    if (!archiveResult.success) {
      return archiveResult;
    }

    return {
      ...archiveResult,
      approvalNumber: data.approvals[data.approvals.length - 1]?.number,
    };
  }
}
