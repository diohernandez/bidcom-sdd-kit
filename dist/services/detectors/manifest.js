import path from 'node:path';
import fs from 'fs-extra';
import { fileExists, readJson } from '../../utils/fs.js';
export async function readNodeDependencies(projectPath) {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!(await fileExists(packageJsonPath)))
        return undefined;
    const pkg = await readJson(packageJsonPath);
    return { ...pkg.dependencies, ...pkg.devDependencies };
}
export async function readPythonManifestBlob(projectPath) {
    const pyprojectPath = path.join(projectPath, 'pyproject.toml');
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    const parts = [];
    if (await fileExists(pyprojectPath)) {
        parts.push(await fs.readFile(pyprojectPath, 'utf-8'));
    }
    if (await fileExists(requirementsPath)) {
        parts.push(await fs.readFile(requirementsPath, 'utf-8'));
    }
    return parts.length > 0 ? parts.join('\n') : undefined;
}
//# sourceMappingURL=manifest.js.map