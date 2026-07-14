import type { Language } from '../../types/stack.js';
export declare class FrameworkDetector {
    detect(projectPath: string, language: Language): Promise<string | undefined>;
    private detectTypeScriptFramework;
    private detectPythonFramework;
}
