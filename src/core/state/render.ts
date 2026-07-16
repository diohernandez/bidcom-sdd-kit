import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../utils/fs.js";
import type { StateData, StateTransition, StateApproval } from "./types.js";

function escapeTableCell(value: string | undefined): string {
  return (value ?? "").replace(/\|/g, "\\|");
}

function renderContributors(data: StateData): string {
  if (data.contributors.length === 0) {
    return "contributors: []";
  }
  const lines: string[] = ["contributors:"];
  for (const contributor of data.contributors) {
    lines.push(`  - name: "${contributor.name ?? ""}"`);
    lines.push(`    email: "${contributor.email ?? ""}"`);
    const roles = Array.isArray(contributor.roles) ? contributor.roles : [];
    if (roles.length === 0) {
      lines.push("    roles: []");
    } else {
      lines.push("    roles:");
      for (const role of roles) {
        lines.push(`      - "${role}"`);
      }
    }
    const phases = Array.isArray(contributor.phases) ? contributor.phases : [];
    if (phases.length === 0) {
      lines.push("    phases: []");
    } else {
      lines.push("    phases:");
      for (const phase of phases) {
        lines.push(`      - "${phase}"`);
      }
    }
    lines.push(`    joined_at: "${contributor.joined_at ?? ""}"`);
  }
  return lines.join("\n");
}

function renderApprovalsFrontmatter(data: StateData): string {
  if (data.approvals.length === 0) {
    return "approvals: []";
  }
  const lines: string[] = ["approvals:"];
  for (const approval of data.approvals) {
    lines.push(`  - approved_by: "${approval.approved_by}"`);
    lines.push(`    at: "${approval.at}"`);
    lines.push(`    from_state: "${approval.from_state}"`);
    lines.push(`    to_state: "${approval.to_state}"`);
  }
  return lines.join("\n");
}

function renderExtra(data: StateData): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data.extra)) {
    if (key === "body_sections" || key === "legacy_frontmatter_approvals") {
      continue;
    }
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - "${String(item)}"`);
      }
    } else if (typeof value === "number" || typeof value === "boolean") {
      lines.push(`${key}: ${String(value)}`);
    } else {
      lines.push(`${key}: "${String(value)}"`);
    }
  }
  return lines.join("\n");
}

function renderTransitions(transitions: StateTransition[]): string {
  const lines: string[] = [
    "## Historial de Transiciones",
    "| Fecha | De | A | Autor | Razón |",
    "|-------|----|----|-------|-------|",
  ];
  for (const t of transitions) {
    const at = t.at;
    const from = t.from;
    const to = t.to;
    const by = escapeTableCell(t.by);
    const reason = escapeTableCell(t.reason);
    lines.push(`| ${at} | ${from} | ${to} | ${by} | ${reason} |`);
  }
  return lines.join("\n");
}

function renderApprovalsBody(
  featureName: string,
  approvals: StateApproval[],
): string {
  const lines: string[] = ["## Firmas de Aprobación"];
  if (approvals.length === 0) {
    lines.push("_Pendiente de firmas_");
  } else {
    lines.push("| Fecha | Feature | Autor | Fase |");
    lines.push("|-------|---------|-------|------|");
    for (const a of approvals) {
      lines.push(
        `| ${a.at} | ${featureName} | ${a.approved_by} | ${a.from_state} → ${a.to_state} |`,
      );
    }
  }
  return lines.join("\n");
}

function renderRequirementChanges(data: StateData): string {
  if (data.requirement_changes.length === 0) {
    return "";
  }
  const lines: string[] = [
    "",
    "## Cambios de Requisitos Post-Aprobación",
    "| Fecha | Componente | Cambio | Justificación |",
    "|-------|------------|--------|----------------|",
  ];
  for (const rc of data.requirement_changes) {
    const at = rc.at;
    const component = escapeTableCell(rc.component);
    const change = escapeTableCell(rc.change);
    const justification = escapeTableCell(rc.justification);
    lines.push(`| ${at} | ${component} | ${change} | ${justification} |`);
  }
  return lines.join("\n");
}

function renderBodySections(data: StateData): string {
  const bodySections = Array.isArray(data.extra.body_sections)
    ? data.extra.body_sections
    : [];
  if (bodySections.length === 0) {
    return "";
  }
  const lines: string[] = [];
  for (const section of bodySections) {
    const heading = section.heading ?? "";
    const markdown = section.markdown ?? "";
    lines.push("");
    lines.push(`## ${heading}`);
    lines.push(markdown);
  }
  return lines.join("\n");
}

export async function renderMetaMd(featurePath: string): Promise<void> {
  const statePath = path.join(featurePath, "state.json");
  const metaPath = path.join(featurePath, "meta.md");

  if (!(await fileExists(statePath))) {
    throw new Error(`No existe ${statePath}`);
  }

  const data = (await fs.readJson(statePath)) as StateData;

  const frontmatter: string[] = [
    "---",
    `schema_version: "${data.schema_version}"`,
    `feature_name: "${data.feature_name}"`,
    `state: "${data.state}"`,
    `created_at: "${data.created_at}"`,
    `created_by: "${data.created_by}"`,
    `created_by_email: "${data.created_by_email}"`,
  ];

  if (data.completed_at) {
    frontmatter.push(`completed_at: "${data.completed_at}"`);
  }

  frontmatter.push(`last_updated: "${data.last_updated}"`);
  frontmatter.push("stack_detected:");
  frontmatter.push(`  framework: "${data.stack_detected.framework ?? ""}"`);
  frontmatter.push(`  language: "${data.stack_detected.language ?? ""}"`);
  frontmatter.push(`  styling: "${data.stack_detected.styling ?? ""}"`);
  frontmatter.push("  testing:");
  frontmatter.push(
    `    unit: "${data.stack_detected.testing?.unit?.join(", ") ?? ""}"`,
  );
  frontmatter.push(
    `    e2e: "${data.stack_detected.testing?.e2e?.join(", ") ?? ""}"`,
  );
  frontmatter.push(
    `    visual: "${data.stack_detected.testing?.visual?.join(", ") ?? ""}"`,
  );
  frontmatter.push(`  ui_library: "${data.stack_detected.ui_library ?? ""}"`);
  frontmatter.push(`domain: "${data.domain}"`);
  frontmatter.push(renderContributors(data));
  frontmatter.push("knowledge_lineage: []");
  frontmatter.push(renderApprovalsFrontmatter(data));

  if (data.specs_baseline.mode) {
    frontmatter.push(`specs_baseline: "${data.specs_baseline.note ?? ""}"`);
  }

  const extraYaml = renderExtra(data);
  if (extraYaml) {
    frontmatter.push(extraYaml);
  }

  frontmatter.push("---");
  frontmatter.push("");
  frontmatter.push(`# Feature: ${data.feature_name}`);
  frontmatter.push("");
  frontmatter.push("## Estado Actual");
  frontmatter.push(`**Estado**: ${data.state}`);
  frontmatter.push("");
  frontmatter.push(renderTransitions(data.transitions));
  frontmatter.push("");
  frontmatter.push(renderApprovalsBody(data.feature_name, data.approvals));
  frontmatter.push(renderRequirementChanges(data));
  frontmatter.push(renderBodySections(data));

  await fs.writeFile(metaPath, frontmatter.join("\n"));
}
