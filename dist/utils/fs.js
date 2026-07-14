import path from 'node:path';
import fs from 'fs-extra';
export async function fileExists(filePath) {
    return fs.pathExists(filePath);
}
export async function readJson(filePath) {
    return fs.readJson(filePath);
}
export async function writeJson(filePath, data) {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJson(filePath, data, { spaces: 2 });
}
export async function mkdirp(dirPath) {
    await fs.ensureDir(dirPath);
}
//# sourceMappingURL=fs.js.map