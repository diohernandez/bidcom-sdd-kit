import type { SddConfig } from '../../../types/config.js';
export interface ValidateOptions {
    featureName: string;
    projectPath: string;
    config: SddConfig;
}
export interface ValidateCheck {
    name: string;
    passed: boolean;
    detail?: string;
}
export interface ValidateResult {
    success: boolean;
    phase?: string;
    checks?: ValidateCheck[];
    error?: string;
}
export declare class ValidateWorkflow {
    execute(options: ValidateOptions): Promise<ValidateResult>;
}
