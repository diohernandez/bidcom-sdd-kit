import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../utils/fs.js";
import { withDirLock } from "./lock.js";
import { renderMetaMd } from "./render.js";
import type {
  StateApproval,
  StateApprovalOptions,
  StateData,
  StateInitOptions,
  StateTransition,
  StateTransitionOptions,
} from "./types.js";

export class State {
  constructor(private readonly featurePath: string) {}

  private get statePath(): string {
    return path.join(this.featurePath, "state.json");
  }

  async exists(): Promise<boolean> {
    return fileExists(this.statePath);
  }

  async load(): Promise<StateData> {
    if (!(await this.exists())) {
      throw new Error(`No existe ${this.statePath}`);
    }
    return fs.readJson(this.statePath) as Promise<StateData>;
  }

  async save(data: StateData): Promise<void> {
    await fs.writeJson(this.statePath, data, { spaces: 2 });
  }

  async init(options: StateInitOptions): Promise<void> {
    if (await this.exists()) {
      throw new Error(`Ya existe ${this.statePath}`);
    }

    const now = new Date().toISOString();
    const data: StateData = {
      schema_version: "3.0.0",
      feature_name: options.featureName,
      state: "funcional",
      created_at: now,
      created_by: options.createdBy,
      created_by_email: options.createdByEmail ?? "",
      last_updated: now,
      stack_detected: options.stackDetected,
      domain: options.domain ?? "pending",
      contributors: [],
      knowledge_lineage: [],
      transitions: [
        {
          at: now,
          from: "-",
          to: "funcional",
          by: options.createdBy,
          reason: "Inicialización del feature",
        },
      ],
      approvals: [],
      requirement_changes: [],
      specs_baseline: { mode: null, note: null, capabilities: [] },
      gates: { functional: null, technical: null, tasks: null },
      archive: {
        archived: false,
        archived_at: null,
        archive_path: null,
        merged_capabilities: [],
      },
      extra: {},
    };

    await this.save(data);
    await renderMetaMd(this.featurePath);
  }

  async transition(options: StateTransitionOptions): Promise<void> {
    await withDirLock(this.featurePath, async () => {
      const data = await this.load();

      if (data.state !== options.from) {
        throw new Error(
          `El estado actual es "${data.state}", se esperaba "${options.from}" — no se aplica la transición a "${options.to}"`,
        );
      }

      const now = new Date().toISOString();
      const transition: StateTransition = {
        at: now,
        from: options.from,
        to: options.to,
        by: options.actor,
        reason: options.reason,
      };

      data.state = options.to;
      data.last_updated = now;
      data.transitions.push(transition);

      if (options.to === "done") {
        data.completed_at = now;
      }

      await this.save(data);
      await renderMetaMd(this.featurePath);
    });
  }

  async recordApproval(options: StateApprovalOptions): Promise<number> {
    return withDirLock(this.featurePath, async () => {
      const data = await this.load();

      const alreadyApproved = data.approvals.some(
        (approval) => approval.approved_by === options.actor,
      );
      if (alreadyApproved) {
        return -1;
      }

      const now = new Date().toISOString();
      const approval: StateApproval = {
        number: data.approvals.length + 1,
        approved_by: options.actor,
        email: options.email ?? "",
        at: now,
        from_state: data.state,
        to_state: "impl",
        comment: options.comment,
      };

      data.approvals.push(approval);
      data.last_updated = now;

      await this.save(data);
      await renderMetaMd(this.featurePath);

      return approval.number;
    });
  }
}
