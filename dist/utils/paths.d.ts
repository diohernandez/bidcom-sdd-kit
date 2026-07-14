import type { SddConfig } from '../types/config.js';
type PathConfig = Pick<SddConfig, 'sddPath' | 'wipPath' | 'reversePath' | 'specsPath' | 'archivePath'>;
export declare function resolveSddPath(projectPath: string, config: PathConfig): string;
export declare function resolveWipPath(projectPath: string, config: PathConfig): string;
export declare function resolveReversePath(projectPath: string, config: PathConfig): string;
export declare function resolveSpecsPath(projectPath: string, config: PathConfig): string;
export declare function resolveArchivePath(projectPath: string, config: PathConfig): string;
export {};
