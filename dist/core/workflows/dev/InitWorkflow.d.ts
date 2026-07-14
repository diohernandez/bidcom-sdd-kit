import { StackDetector } from '../../../services/detectors/StackDetector.js';
import type { SddConfig } from '../../../types/config.js';
export interface InitOptions {
    projectPath: string;
    projectName?: string;
}
export interface InitResult {
    success: boolean;
    configPath?: string;
    config?: SddConfig;
    nextSteps?: string[];
    error?: string;
}
export declare class InitWorkflow {
    private readonly stackDetector;
    constructor(stackDetector?: StackDetector);
    execute(options: InitOptions): Promise<InitResult>;
}
