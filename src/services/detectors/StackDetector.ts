import { LanguageDetector } from "./LanguageDetector.js";
import { FrameworkDetector } from "./FrameworkDetector.js";
import { TestingDetector } from "./TestingDetector.js";
import type { DetectedStack } from "../../types/stack.js";

export class StackDetector {
  constructor(
    private readonly languageDetector = new LanguageDetector(),
    private readonly frameworkDetector = new FrameworkDetector(),
    private readonly testingDetector = new TestingDetector(),
  ) {}

  async detect(projectPath: string): Promise<DetectedStack> {
    const language = await this.languageDetector.detect(projectPath);
    const framework = await this.frameworkDetector.detect(
      projectPath,
      language,
    );
    const testing = await this.testingDetector.detect(projectPath, language);

    const stack: DetectedStack = { language };
    if (framework) stack.framework = framework;
    if (testing.unit || testing.e2e || testing.visual) stack.testing = testing;

    return stack;
  }
}
