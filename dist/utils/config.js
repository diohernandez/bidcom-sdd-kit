import path from 'node:path';
import fs from 'fs-extra';
import YAML from 'yaml';
import { DEFAULT_CONFIG } from '../types/config.js';
export function getConfigPath(projectPath) {
    return path.join(projectPath, '.sdd', 'config.yml');
}
export async function loadConfig(projectPath) {
    const configPath = getConfigPath(projectPath);
    const raw = await fs.readFile(configPath, 'utf-8');
    const parsed = (YAML.parse(raw) ?? {});
    return {
        ...DEFAULT_CONFIG,
        ...parsed,
        mcp: { ...DEFAULT_CONFIG.mcp, ...parsed.mcp },
        mutation: { ...DEFAULT_CONFIG.mutation, ...parsed.mutation },
        telemetry: { ...DEFAULT_CONFIG.telemetry, ...parsed.telemetry },
    };
}
export async function saveConfig(projectPath, config) {
    const configPath = getConfigPath(projectPath);
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeFile(configPath, YAML.stringify(config), 'utf-8');
}
//# sourceMappingURL=config.js.map