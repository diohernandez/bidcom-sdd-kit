import { parseFrontmatter } from "../../utils/frontmatter.js";
import type {
  CapabilityDelta,
  CapabilitySpec,
  Requirement,
  Scenario,
} from "./types.js";

interface ParsedRequirement {
  id: string;
  title: string;
  previousTitle?: string;
  body: string;
}

function parseRequirementHeading(line: string): ParsedRequirement | undefined {
  const match = line.match(
    /^####\s+Requirement:\s+(R-\d+)\s+(?:\(antes:\s*"([^"]+)"\)\s+)?[—-]\s+(.*)$/,
  );
  if (!match) return undefined;
  return {
    id: match[1],
    previousTitle: match[2],
    title: match[3].trim(),
    body: "",
  };
}

function parseScenarioHeading(line: string): string | undefined {
  const match = line.match(/^#####\s+Scenario:\s+(.*)$/);
  return match ? match[1].trim() : undefined;
}

function splitRequirements(content: string): ParsedRequirement[] {
  const lines = content.split("\n");
  const requirements: ParsedRequirement[] = [];
  let current: ParsedRequirement | undefined;
  const buffer: string[] = [];

  function flush(): void {
    if (current) {
      current.body = buffer.join("\n").trim();
      requirements.push(current);
    }
  }

  for (const line of lines) {
    const parsed = parseRequirementHeading(line);
    if (parsed) {
      flush();
      current = parsed;
      buffer.length = 0;
    } else if (current) {
      buffer.push(line);
    }
  }
  flush();

  return requirements;
}

function parseScenarios(body: string): Scenario[] {
  const lines = body.split("\n");
  const scenarios: Scenario[] = [];
  let current: Scenario | undefined;
  const buffer: string[] = [];

  function flush(): void {
    if (current) {
      current.steps = buffer
        .join("\n")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      scenarios.push(current);
    }
  }

  for (const line of lines) {
    const scenarioTitle = parseScenarioHeading(line);
    if (scenarioTitle) {
      flush();
      current = { title: scenarioTitle, steps: [] };
      buffer.length = 0;
    } else if (current) {
      buffer.push(line);
    }
  }
  flush();

  return scenarios;
}

function buildRequirement(parsed: ParsedRequirement): Requirement {
  const scenarios = parseScenarios(parsed.body);
  const requirement: Requirement = {
    id: parsed.id,
    title: parsed.title,
    body: parsed.body,
    scenarios,
  };
  if (parsed.previousTitle) {
    requirement.previousTitle = parsed.previousTitle;
  }
  return requirement;
}

export function parseSpec(content: string, capability: string): CapabilitySpec {
  const { data, body } = parseFrontmatter(content);

  return {
    type: "capability-spec",
    capability,
    title: String(data.title ?? ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    timestamp: String(data.timestamp ?? new Date().toISOString()),
    origin: String(data.origin ?? "baseline") as CapabilitySpec["origin"],
    requirements: splitRequirements(body).map(buildRequirement),
  };
}

function extractSection(
  content: string,
  heading: string,
): string {
  const lines = content.split("\n");
  const startIndex = lines.findIndex((line) =>
    line.trim().toLowerCase().startsWith(heading.toLowerCase()),
  );
  if (startIndex === -1) return "";

  const rest = lines.slice(startIndex + 1);
  const nextHeadingIndex = rest.findIndex((line) =>
    /^##\s/.test(line.trim()),
  );
  const sectionLines =
    nextHeadingIndex === -1 ? rest : rest.slice(0, nextHeadingIndex);
  return sectionLines.join("\n").trim();
}

function parseRequirementList(sectionContent: string): Requirement[] {
  return splitRequirements(sectionContent).map(buildRequirement);
}

function parseRemovedList(sectionContent: string): string[] {
  const removed: string[] = [];
  const lines = sectionContent.split("\n");
  for (const line of lines) {
    const match = line.match(/^-\s+(R-\d+)(?:\s+—\s+.*)?$/);
    if (match) removed.push(match[1]);
  }
  return removed;
}

export function parseDelta(
  content: string,
  capability: string,
): CapabilityDelta {
  const { data, body } = parseFrontmatter(content);

  const addedSection = extractSection(body, "## ADDED Requirements");
  const modifiedSection = extractSection(body, "## MODIFIED Requirements");
  const removedSection = extractSection(body, "## REMOVED Requirements");

  return {
    type: "capability-delta",
    capability,
    change_ref: String(data.change_ref ?? ""),
    status: data.status ? String(data.status) : undefined,
    added: parseRequirementList(addedSection),
    modified: parseRequirementList(modifiedSection),
    removed: parseRemovedList(removedSection),
  };
}
