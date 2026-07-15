import path from "node:path";
import fs from "fs-extra";
import { fileExists } from "../../utils/fs.js";
import { State } from "../state/State.js";
import { createSpecStore } from "../specs/SpecStore.js";
import { createDeltaMerge } from "../specs/DeltaMerge.js";
import { createSpecsSnapshot, pruneSnapshots } from "./Snapshot.js";
import { generateSpecsIndex, appendSpecsLog } from "./SpecsIndex.js";
import type { StateData } from "../state/types.js";
import type { ArchiveOptions, ArchiveResult } from "./types.js";

export async function archiveFeature(
  options: ArchiveOptions,
): Promise<ArchiveResult> {
  const {
    featureName,
    projectPath,
    wipPath,
    archivePath,
    specsPath,
    backupPath,
  } = options;

  const featureWipPath = path.join(projectPath, wipPath, featureName);
  const featureArchivePath = path.join(projectPath, archivePath, featureName);
  const absoluteSpecsPath = path.join(projectPath, specsPath);
  const absoluteBackupPath = path.join(projectPath, backupPath);

  if (!(await fileExists(featureWipPath))) {
    return {
      success: false,
      featureName,
      archivedAt: "",
      archivePath: featureArchivePath,
      error: `El feature "${featureName}" no existe en ${featureWipPath}`,
    };
  }

  const wipState = new State(featureWipPath);
  if (!(await wipState.exists())) {
    return {
      success: false,
      featureName,
      archivedAt: "",
      archivePath: featureArchivePath,
      error: `No se pudo leer state.json para "${featureName}"`,
    };
  }

  const state = await wipState.load();

  if (state.state !== "impl") {
    return {
      success: false,
      featureName,
      archivedAt: "",
      archivePath: featureArchivePath,
      error: `El feature "${featureName}" está en fase "${state.state}" — solo se puede archivar desde "impl"`,
    };
  }

  const snapshotPath = await createSpecsSnapshot(
    absoluteSpecsPath,
    absoluteBackupPath,
  );
  await pruneSnapshots(absoluteBackupPath);

  const specStore = createSpecStore(projectPath);
  const deltaMerge = createDeltaMerge(featureWipPath);
  const deltaDir = path.join(featureWipPath, "delta");
  const mergedCapabilities: string[] = [];

  if (await fileExists(deltaDir)) {
    const deltaFiles = await fs.readdir(deltaDir);
    for (const deltaFile of deltaFiles) {
      if (!deltaFile.endsWith(".md")) continue;
      const capability = deltaFile.replace(/\.md$/, "");
      const delta = await deltaMerge.read(capability);
      if (!delta) continue;

      const baseline = (await specStore.read(capability)) ?? {
        type: "capability-spec" as const,
        capability,
        title: capability,
        tags: [],
        timestamp: new Date().toISOString(),
        origin: "feature" as const,
        requirements: [],
      };

      const result = deltaMerge.merge(baseline, delta);
      await specStore.write(result.spec);
      mergedCapabilities.push(capability);
    }
  }

  await fs.ensureDir(path.dirname(featureArchivePath));
  if (await fileExists(featureArchivePath)) {
    await fs.remove(featureArchivePath);
  }
  await fs.move(featureWipPath, featureArchivePath);

  const archivedAt = new Date().toISOString();
  const nextState: StateData = {
    ...state,
    state: "done",
    last_updated: archivedAt,
    archive: {
      archived: true,
      archived_at: archivedAt,
      archive_path: featureArchivePath,
      merged_capabilities: mergedCapabilities,
    },
  };
  await new State(featureArchivePath).save(nextState);

  await generateSpecsIndex(projectPath, specsPath);
  await appendSpecsLog(projectPath, specsPath, {
    feature: featureName,
    archivedAt,
    capabilities: mergedCapabilities,
  });

  return {
    success: true,
    featureName,
    archivedAt,
    archivePath: featureArchivePath,
    snapshotPath,
    mergedCapabilities,
  };
}
