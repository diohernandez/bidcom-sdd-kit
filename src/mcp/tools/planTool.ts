import path from "node:path";
import fs from "fs-extra";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { PlanWorkflow } from "../../core/workflows/dev/PlanWorkflow.js";
import { getGitActor } from "../../utils/gitActor.js";
import { loadConfig } from "../../utils/config.js";
import { fileExists } from "../../utils/fs.js";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import {
  contractResult,
  nextActionForDevPhase,
  notInitializedContract,
} from "../contract.js";

export interface PlanToolInput {
  featureName: string;
}

async function readExistingState(
  featurePath: string,
): Promise<string | undefined> {
  const metaPath = path.join(featurePath, "meta.md");
  if (!(await fileExists(metaPath))) return undefined;
  const meta = await fs.readFile(metaPath, "utf-8");
  const { data } = parseFrontmatter(meta);
  return typeof data.state === "string" ? data.state : undefined;
}

export async function runPlanTool(
  input: PlanToolInput,
  { projectPath }: { projectPath: string },
): Promise<CallToolResult> {
  const { featureName } = input;

  let config;
  try {
    config = await loadConfig(projectPath);
  } catch {
    return notInitializedContract();
  }

  const author = getGitActor({ cwd: projectPath });
  const result = await new PlanWorkflow().execute({
    featureName,
    projectPath,
    config,
    author,
  });

  if (!result.success) {
    const featurePath = path.join(projectPath, config.wipPath, featureName);
    const state = await readExistingState(featurePath);
    return contractResult(
      {
        state: state ?? "unknown",
        next_action: nextActionForDevPhase(state, featureName),
        blockers: [
          {
            gate: "plan",
            check: "precondition",
            detail: result.error ?? "No se pudo crear el plan",
          },
        ],
      },
      true,
    );
  }

  return contractResult({
    state: "funcional",
    next_action: nextActionForDevPhase("funcional", featureName),
    blockers: [],
  });
}
