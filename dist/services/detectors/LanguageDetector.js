import path from 'node:path';
import { fileExists } from '../../utils/fs.js';
export class LanguageDetector {
    async detect(projectPath) {
        if (await fileExists(path.join(projectPath, 'package.json')))
            return 'typescript';
        if (await fileExists(path.join(projectPath, 'requirements.txt')))
            return 'python';
        if (await fileExists(path.join(projectPath, 'pyproject.toml')))
            return 'python';
        if (await fileExists(path.join(projectPath, 'go.mod')))
            return 'go';
        if (await fileExists(path.join(projectPath, 'Cargo.toml')))
            return 'rust';
        return 'unknown';
    }
}
//# sourceMappingURL=LanguageDetector.js.map