import path from "node:path";
import { fileExists } from "../../../utils/fs.js";
import { State } from "../../state/State.js";
import type { SddConfig } from "../../../types/config.js";

export interface ApproveOptions {
  featureName: string;
  projectPath: string;
  config: SddConfig;
  actor: string;
  email?: string;
  comment?: string;
}

export interface ApproveResult {
  success: boolean;
  approvalNumber?: number;
  error?: string;
}

export class ApproveWorkflow {
  async execute(options: ApproveOptions): Promise<ApproveResult> {
    const { featureName, projectPath, config, actor, email, comment } = options;
    const featurePath = path.join(projectPath, config.wipPath, featureName);

    if (!(await fileExists(featurePath))) {
      return {
        success: false,
        error: `El feature "${featureName}" no existe en ${featurePath}`,
      };
    }

    const state = new State(featurePath);
    if (!(await state.exists())) {
      return {
        success: false,
        error: `No se encontró state.json para "${featureName}"`,
      };
    }

    const data = await state.load();
    if (data.state !== "tasks") {
      return {
        success: false,
        error: `El feature "${featureName}" está en fase "${data.state}" — solo se puede aprobar desde "tasks"`,
      };
    }

    const approvalNumber = await state.recordApproval({
      actor,
      email,
      comment: comment ?? "Aprobación del plan",
    });

    if (approvalNumber === -1) {
      return {
        success: false,
        error: `El actor "${actor}" ya aprobó este feature`,
      };
    }

    await state.transition({
      from: "tasks",
      to: "impl",
      actor,
      reason: "Aprobación del plan técnico y lista de tareas",
    });

    return { success: true, approvalNumber };
  }
}
