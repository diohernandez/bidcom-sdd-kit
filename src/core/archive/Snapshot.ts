import path from "node:path";
import fs from "fs-extra";
import * as tar from "tar";
import { fileExists } from "../../utils/fs.js";

const PIN_PREFIX = "pin-";
const KEEP_COUNT = 10;

function snapshotFileName(timestamp: string): string {
  return `specs-${timestamp}.tar.gz`;
}

export async function createSpecsSnapshot(
  specsPath: string,
  backupPath: string,
): Promise<string> {
  await fs.ensureDir(backupPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotPath = path.join(backupPath, snapshotFileName(timestamp));

  if (await fileExists(specsPath)) {
    await tar.create(
      {
        gzip: true,
        file: snapshotPath,
        cwd: path.dirname(specsPath),
      },
      [path.basename(specsPath)],
    );
  } else {
    await fs.writeFile(snapshotPath, Buffer.alloc(0));
  }

  return snapshotPath;
}

export async function pruneSnapshots(backupPath: string): Promise<void> {
  if (!(await fileExists(backupPath))) return;
  const entries = await fs.readdir(backupPath);
  const snapshots = entries
    .filter((entry) => entry.endsWith(".tar.gz"))
    .map((entry) => ({
      name: entry,
      path: path.join(backupPath, entry),
      time: fs.statSync(path.join(backupPath, entry)).mtime.getTime(),
    }));

  const pinned = snapshots.filter((snapshot) =>
    snapshot.name.startsWith(PIN_PREFIX),
  );
  const pinnedPaths = new Set(pinned.map((snapshot) => snapshot.path));
  const unpinned = snapshots
    .filter((snapshot) => !snapshot.name.startsWith(PIN_PREFIX))
    .sort((a, b) => b.time - a.time);

  const toKeep = new Set([
    ...pinnedPaths,
    ...unpinned.slice(0, KEEP_COUNT).map((snapshot) => snapshot.path),
  ]);

  for (const snapshot of snapshots) {
    if (!toKeep.has(snapshot.path)) {
      await fs.remove(snapshot.path);
    }
  }
}
