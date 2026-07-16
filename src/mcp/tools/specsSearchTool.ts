import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { searchSpecs } from "../../core/specs/search.js";
import { loadConfig } from "../../utils/config.js";
import { contractResult, notInitializedContract } from "../contract.js";

export interface SpecsSearchToolInput {
  query: string;
}

export async function runSpecsSearchTool(
  input: SpecsSearchToolInput,
  { projectPath }: { projectPath: string },
): Promise<CallToolResult> {
  const { query } = input;

  let config;
  try {
    config = await loadConfig(projectPath);
  } catch {
    return notInitializedContract();
  }

  const results = await searchSpecs({
    projectPath,
    specsPath: config.specsPath,
    query,
  });

  return contractResult({
    state: "specs-search",
    next_action: null,
    blockers: [],
    results: results.map((result) => ({
      capability: result.capability,
      title: result.title,
      matches: result.matches,
    })),
  });
}
