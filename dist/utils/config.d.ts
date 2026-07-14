import type { SddConfig } from '../types/config.js';
export declare function getConfigPath(projectPath: string): string;
export declare function loadConfig(projectPath: string): Promise<SddConfig>;
export declare function saveConfig(projectPath: string, config: SddConfig): Promise<void>;
