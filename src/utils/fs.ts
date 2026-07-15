import path from "node:path";
import fs from "fs-extra";

export async function fileExists(filePath: string): Promise<boolean> {
  return fs.pathExists(filePath);
}

export async function readJson<T>(filePath: string): Promise<T> {
  return fs.readJson(filePath) as Promise<T>;
}

export async function writeJson(
  filePath: string,
  data: unknown,
): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(filePath, data, { spaces: 2 });
}

export async function mkdirp(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}
