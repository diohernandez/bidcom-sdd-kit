import { LanguageDetector } from './LanguageDetector.js';
import { FrameworkDetector } from './FrameworkDetector.js';
import { TestingDetector } from './TestingDetector.js';
import type { DetectedStack } from '../../types/stack.js';
export declare class StackDetector {
    private readonly languageDetector;
    private readonly frameworkDetector;
    private readonly testingDetector;
    constructor(languageDetector?: LanguageDetector, frameworkDetector?: FrameworkDetector, testingDetector?: TestingDetector);
    detect(projectPath: string): Promise<DetectedStack>;
}
