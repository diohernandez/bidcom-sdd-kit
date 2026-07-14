import path from 'node:path'
import { fileExists } from '../../utils/fs.js'
import type { Language } from '../../types/stack.js'

export class LanguageDetector {
  async detect(projectPath: string): Promise<Language> {
    if (await fileExists(path.join(projectPath, 'package.json'))) return 'typescript'
    if (await fileExists(path.join(projectPath, 'requirements.txt'))) return 'python'
    if (await fileExists(path.join(projectPath, 'pyproject.toml'))) return 'python'
    if (await fileExists(path.join(projectPath, 'go.mod'))) return 'go'
    if (await fileExists(path.join(projectPath, 'Cargo.toml'))) return 'rust'
    return 'unknown'
  }
}
