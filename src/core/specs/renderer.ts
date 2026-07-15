import type { CapabilityDelta, CapabilitySpec, Requirement, Scenario } from "./types.js";

function renderFrontmatter(data: Record<string, unknown>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((item) => `"${item}"`).join(", ")}]`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function renderScenario(scenario: Scenario): string {
  const lines = [`##### Scenario: ${scenario.title}`];
  for (const step of scenario.steps) {
    lines.push(`- ${step}`);
  }
  return lines.join("\n");
}

function renderRequirement(requirement: Requirement): string {
  const lines = [
    `#### Requirement: ${requirement.id} — ${requirement.title}`,
    requirement.body,
  ];
  for (const scenario of requirement.scenarios) {
    lines.push(renderScenario(scenario));
  }
  return lines.join("\n").trim();
}

export function renderSpec(spec: CapabilitySpec): string {
  const frontmatter = renderFrontmatter({
    type: spec.type,
    title: spec.title,
    tags: spec.tags,
    timestamp: spec.timestamp,
    origin: spec.origin,
  });

  const lines = [frontmatter, ""];
  for (const requirement of spec.requirements) {
    lines.push(renderRequirement(requirement));
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function renderDelta(delta: CapabilityDelta): string {
  const frontmatter = renderFrontmatter({
    type: delta.type,
    capability: delta.capability,
    change_ref: delta.change_ref,
    ...(delta.status ? { status: delta.status } : {}),
  });

  const lines = [frontmatter, "", "## ADDED Requirements", ""];
  for (const requirement of delta.added) {
    lines.push(renderRequirement(requirement));
    lines.push("");
  }

  lines.push("## MODIFIED Requirements", "");
  for (const requirement of delta.modified) {
    const previous =
      "previousTitle" in requirement && requirement.previousTitle
        ? ` (antes: "${requirement.previousTitle}")`
        : "";
    lines.push(
      renderRequirement({ ...requirement, title: `${requirement.title}${previous}` }),
    );
    lines.push("");
  }

  lines.push("## REMOVED Requirements", "");
  if (delta.removed.length === 0) {
    lines.push("(ninguno)");
  } else {
    for (const id of delta.removed) {
      lines.push(`- ${id}`);
    }
  }
  lines.push("");

  return lines.join("\n").trimEnd() + "\n";
}
