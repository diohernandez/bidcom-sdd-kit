import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../../../utils/fs.js";
import { createSpecStore } from "../../../specs/SpecStore.js";
import type { CapabilitySpec, Requirement } from "../../../specs/types.js";
import type { PhaseResult } from "../../../../types/workflow.js";

const PHASE_FILES = [
  { capability: "stack", path: "1-spec/spec.md" },
  { capability: "architecture", path: "2-architecture/architecture.md" },
  { capability: "integration", path: "3-integration/integration.md" },
  { capability: "components", path: "4-components/structure.md" },
  { capability: "data-flow", path: "5-data-flow/general.md" },
  { capability: "testing", path: "6-testing/strategy.md" },
];

function extractHeadings(content: string): string[] {
  const lines = content.split("\n");
  const headings: string[] = [];
  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) headings.push(match[1].trim());
  }
  return headings;
}

function buildRequirements(headings: string[]): Requirement[] {
  return headings.map((heading, index) => ({
    id: `R-${String(index + 1).padStart(3, "0")}`,
    title: heading,
    body: `Línea base extraída del análisis de ingeniería inversa: ${heading}`,
    scenarios: [],
  }));
}

export interface SeedSpecsPhaseOptions {
  projectName: string;
  projectPath: string;
  reversePath: string;
  analyst: string;
}

export class SeedSpecsPhase {
  async execute(options: SeedSpecsPhaseOptions): Promise<PhaseResult> {
    const { reversePath, projectPath } = options;
    const store = createSpecStore(projectPath);
    const seededCapabilities: string[] = [];

    for (const phase of PHASE_FILES) {
      const phasePath = path.join(reversePath, phase.path);
      if (!(await fileExists(phasePath))) continue;

      const content = await fs.readFile(phasePath, "utf-8");
      const headings = extractHeadings(content);
      if (headings.length === 0) continue;

      const spec: CapabilitySpec = {
        type: "capability-spec",
        capability: phase.capability,
        title: `${phase.capability} — línea base de reverse engineering`,
        tags: [phase.capability, "reverse-engineered"],
        timestamp: new Date().toISOString(),
        origin: "reverse-engineered",
        requirements: buildRequirements(headings),
      };

      await store.write(spec);
      seededCapabilities.push(phase.capability);
    }

    return {
      success: true,
      outputPath: path.join(projectPath, "specs"),
      summary: `Capabilities sembradas: ${seededCapabilities.join(", ") || "ninguna"}`,
    };
  }
}
