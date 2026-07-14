import type { SddConfig } from '../../../types/config.js';
export interface BuildOptions {
    featureName: string;
    projectPath: string;
    config: SddConfig;
}
export interface BuildResult {
    success: boolean;
    phase?: string;
    error?: string;
    nextSteps?: string[];
}
export declare class BuildWorkflow {
    execute(options: BuildOptions): Promise<BuildResult>;
}
