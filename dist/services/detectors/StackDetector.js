import { LanguageDetector } from './LanguageDetector.js';
import { FrameworkDetector } from './FrameworkDetector.js';
import { TestingDetector } from './TestingDetector.js';
export class StackDetector {
    languageDetector;
    frameworkDetector;
    testingDetector;
    constructor(languageDetector = new LanguageDetector(), frameworkDetector = new FrameworkDetector(), testingDetector = new TestingDetector()) {
        this.languageDetector = languageDetector;
        this.frameworkDetector = frameworkDetector;
        this.testingDetector = testingDetector;
    }
    async detect(projectPath) {
        const language = await this.languageDetector.detect(projectPath);
        const framework = await this.frameworkDetector.detect(projectPath, language);
        const testing = await this.testingDetector.detect(projectPath, language);
        const stack = { language };
        if (framework)
            stack.framework = framework;
        if (testing.unit || testing.e2e || testing.visual)
            stack.testing = testing;
        return stack;
    }
}
//# sourceMappingURL=StackDetector.js.map