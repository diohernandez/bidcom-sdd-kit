import path from "node:path";
import fs from "fs-extra";

const MAX_ATTEMPTS = 50;
const SLEEP_MS = 100;

export class StateLockError extends Error {
  constructor(lockDir: string) {
    super(
      `No se pudo obtener el lock de estado en ${lockDir} (otra operación en curso)`,
    );
    this.name = "StateLockError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isProcessAlive(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function acquireDirLock(
  dir: string,
  options: { maxAttempts?: number; sleepMs?: number } = {},
): Promise<() => Promise<void>> {
  const lockDir = path.join(dir, ".state.lock");
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const sleepMs = options.sleepMs ?? SLEEP_MS;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await fs.mkdir(lockDir);
      await fs.writeFile(path.join(lockDir, "pid"), String(process.pid));
      return async () => {
        await fs.remove(lockDir);
      };
    } catch {
      // Lock posiblemente obsoleto: si el proceso que lo tomó ya no existe,
      // forzarlo (equivale a kill -0 del bash).
      try {
        const pidFile = path.join(lockDir, "pid");
        if (await fs.pathExists(pidFile)) {
          const holderPid = Number(await fs.readFile(pidFile, "utf-8"));
          if (
            Number.isFinite(holderPid) &&
            !(await isProcessAlive(holderPid))
          ) {
            await fs.remove(lockDir);
            continue;
          }
        }
      } catch {
        // Ignorar errores al leer pid; seguir esperando.
      }

      if (attempt < maxAttempts) {
        await sleep(sleepMs);
      }
    }
  }

  throw new StateLockError(lockDir);
}

export async function releaseDirLock(dir: string): Promise<void> {
  const lockDir = path.join(dir, ".state.lock");
  await fs.remove(lockDir);
}

export async function withDirLock<T>(
  dir: string,
  fn: () => Promise<T>,
): Promise<T> {
  const release = await acquireDirLock(dir);
  try {
    return await fn();
  } finally {
    await release();
  }
}
