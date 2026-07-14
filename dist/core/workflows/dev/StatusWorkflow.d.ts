import type { SddConfig } from '../../../types/config.js';
export interface TaskCounts {
    total: number;
    done: number;
}
export interface FeatureSummary {
    featureName: string;
    state?: string;
    createdAt?: string;
    createdBy?: string;
    tasks?: TaskCounts;
}
export interface StatusOptions {
    projectPath: string;
    config: SddConfig;
    featureName?: string;
}
export interface StatusResult {
    success: boolean;
    feature?: FeatureSummary;
    features?: FeatureSummary[];
    summaryByState?: Record<string, number>;
    error?: string;
}
export declare class StatusWorkflow {
    execute(options: StatusOptions): Promise<StatusResult>;
}
