import { describe, it, expect } from "@jest/globals";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import {
  acquireDirLock,
  releaseDirLock,
  withDirLock,
  StateLockError,
} from "../../../../src/core/state/lock.js";

async function createTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "sdd-lock-test-"));
}

describe("lock", () => {
  it("acquires and releases a directory lock", async () => {
    const dir = await createTempDir();
    try {
      const release = await acquireDirLock(dir);
      expect(await fs.pathExists(path.join(dir, ".state.lock"))).toBe(true);
      await release();
      expect(await fs.pathExists(path.join(dir, ".state.lock"))).toBe(false);
    } finally {
      await fs.remove(dir);
    }
  });

  it("waits for an existing lock and then acquires it", async () => {
    const dir = await createTempDir();
    try {
      const firstRelease = await acquireDirLock(dir);

      const secondAcquirePromise = acquireDirLock(dir, {
        maxAttempts: 10,
        sleepMs: 10,
      });

      // Darle un instante a la segunda promesa para que empiece a esperar.
      await new Promise((resolve) => setTimeout(resolve, 50));
      await firstRelease();

      const secondRelease = await secondAcquirePromise;
      expect(await fs.pathExists(path.join(dir, ".state.lock"))).toBe(true);
      await secondRelease();
    } finally {
      await fs.remove(dir);
    }
  });

  it("throws StateLockError after max attempts", async () => {
    const dir = await createTempDir();
    try {
      const release = await acquireDirLock(dir);

      await expect(
        acquireDirLock(dir, { maxAttempts: 3, sleepMs: 10 }),
      ).rejects.toThrow(StateLockError);

      await release();
    } finally {
      await fs.remove(dir);
    }
  });

  it("recovers an obsolete lock from a dead process", async () => {
    const dir = await createTempDir();
    try {
      const lockDir = path.join(dir, ".state.lock");
      await fs.mkdir(lockDir);
      // Escribir un PID que no existe (PID 1 es init y siempre existe, usar uno alto improbable).
      await fs.writeFile(path.join(lockDir, "pid"), "999999");

      const release = await acquireDirLock(dir, { maxAttempts: 5, sleepMs: 10 });
      expect(await fs.readFile(path.join(lockDir, "pid"), "utf-8")).toBe(
        String(process.pid),
      );
      await release();
    } finally {
      await fs.remove(dir);
    }
  });

  it("releaseDirLock removes the lock directory", async () => {
    const dir = await createTempDir();
    try {
      await acquireDirLock(dir);
      await releaseDirLock(dir);
      expect(await fs.pathExists(path.join(dir, ".state.lock"))).toBe(false);
    } finally {
      await fs.remove(dir);
    }
  });

  it("withDirLock runs the callback and releases the lock", async () => {
    const dir = await createTempDir();
    try {
      const result = await withDirLock(dir, async () => "ok");
      expect(result).toBe("ok");
      expect(await fs.pathExists(path.join(dir, ".state.lock"))).toBe(false);
    } finally {
      await fs.remove(dir);
    }
  });

  it("withDirLock releases the lock even if the callback throws", async () => {
    const dir = await createTempDir();
    try {
      await expect(
        withDirLock(dir, async () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
      expect(await fs.pathExists(path.join(dir, ".state.lock"))).toBe(false);
    } finally {
      await fs.remove(dir);
    }
  });
});
