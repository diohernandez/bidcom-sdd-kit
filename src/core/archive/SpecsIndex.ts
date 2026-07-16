import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../utils/fs.js";
import { createSpecStore } from "../specs/SpecStore.js";

export interface SpecsLogEntry {
  feature: string;
  archivedAt: string;
  capabilities: string[];
}

export async function generateSpecsIndex(
  projectPath: string,
  specsPath: string,
): Promise<void> {
  const store = createSpecStore(projectPath);
  const capabilities = await store.list();
  const indexPath = path.join(projectPath, specsPath, "index.md");
  await fs.ensureDir(path.dirname(indexPath));

  const lines = [
    "---",
    "type: capability-index",
    `generated_at: "${new Date().toISOString()}"`,
    "---",
    "",
    "# Capability Index",
    "",
  ];

  for (const capability of capabilities) {
    const spec = await store.read(capability);
    if (!spec) continue;
    lines.push(
      `- [${spec.title}](${capability}/spec.md) — \`${capability}\` (${spec.requirements.length} requirements)`,
    );
  }

  lines.push("");
  await fs.writeFile(indexPath, lines.join("\n"));
}

export async function appendSpecsLog(
  projectPath: string,
  specsPath: string,
  entry: SpecsLogEntry,
): Promise<void> {
  const logPath = path.join(projectPath, specsPath, "log.md");
  await fs.ensureDir(path.dirname(logPath));
  const previous = (await fileExists(logPath))
    ? await fs.readFile(logPath, "utf-8")
    : "# Specs Log\n\n";

  const capabilitiesText =
    entry.capabilities.length > 0
      ? entry.capabilities.join(", ")
      : "(ninguna capability modificada)";

  const line =
    `- **${entry.archivedAt}** — feature \`${entry.feature}\` archivado — capabilities: ${capabilitiesText}`;

  await fs.writeFile(logPath, `${previous.trimEnd()}\n${line}\n\n`);
}
