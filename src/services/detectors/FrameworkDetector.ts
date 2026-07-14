import { readNodeDependencies, readPythonManifestBlob } from './manifest.js'
import { stripSemverRange } from '../../utils/semver.js'
import type { Language } from '../../types/stack.js'

const PYTHON_FRAMEWORKS = ['Django', 'Flask', 'FastAPI']

function manifestMentions(blob: string, packageName: string): boolean {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9_-])${escaped}([^a-z0-9_-]|$)`, 'i').test(blob)
}

export class FrameworkDetector {
  async detect(projectPath: string, language: Language): Promise<string | undefined> {
    if (language === 'typescript') return this.detectTypeScriptFramework(projectPath)
    if (language === 'python') return this.detectPythonFramework(projectPath)
    return undefined
  }

  private async detectTypeScriptFramework(projectPath: string): Promise<string | undefined> {
    const deps = await readNodeDependencies(projectPath)
    if (!deps) return undefined

    if (deps.next) return `Next.js ${stripSemverRange(deps.next)}`
    if (deps.astro) return `Astro ${stripSemverRange(deps.astro)}`
    if (deps.react) return `React ${stripSemverRange(deps.react)}`
    if (deps.vue) return `Vue ${stripSemverRange(deps.vue)}`
    if (deps['@angular/core']) return `Angular ${stripSemverRange(deps['@angular/core'])}`
    return undefined
  }

  private async detectPythonFramework(projectPath: string): Promise<string | undefined> {
    const blob = await readPythonManifestBlob(projectPath)
    if (!blob) return undefined

    return PYTHON_FRAMEWORKS.find((framework) => manifestMentions(blob, framework))
  }
}
