import type { Language } from '../../types/stack.js';
import type { DetectedStackTesting } from '../../types/stack.js';
export declare class TestingDetector {
    detect(projectPath: string, language: Language): Promise<DetectedStackTesting>;
    private detectTypeScriptTesting;
    private detectPythonTesting;
}
