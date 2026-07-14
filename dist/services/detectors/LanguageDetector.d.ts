import type { Language } from '../../types/stack.js';
export declare class LanguageDetector {
    detect(projectPath: string): Promise<Language>;
}
