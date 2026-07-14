import path from 'node:path';
export function resolveSddPath(projectPath, config) {
    return path.join(projectPath, config.sddPath);
}
export function resolveWipPath(projectPath, config) {
    return path.join(projectPath, config.wipPath);
}
export function resolveReversePath(projectPath, config) {
    return path.join(projectPath, config.reversePath);
}
export function resolveSpecsPath(projectPath, config) {
    return path.join(projectPath, config.specsPath);
}
export function resolveArchivePath(projectPath, config) {
    return path.join(projectPath, config.archivePath);
}
//# sourceMappingURL=paths.js.map