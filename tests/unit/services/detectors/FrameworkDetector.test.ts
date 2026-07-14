import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { FrameworkDetector } from '../../../../src/services/detectors/FrameworkDetector.js'

describe('services/detectors/FrameworkDetector', () => {
  let inputProjectPath: string
  const detector = new FrameworkDetector()

  beforeEach(async () => {
    inputProjectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sdd-kit-framework-'))
  })

  afterEach(async () => {
    await fs.remove(inputProjectPath)
  })

  describe('typescript', () => {
    it('detects Next.js with its version', async () => {
      await fs.writeJson(path.join(inputProjectPath, 'package.json'), {
        dependencies: { next: '^15.3.8', react: '^19.0.0' },
      })

      const actualFramework = await detector.detect(inputProjectPath, 'typescript')

      expect(actualFramework).toBe('Next.js 15.3.8')
    })

    it('prefers Next.js over Astro and React when several are present', async () => {
      await fs.writeJson(path.join(inputProjectPath, 'package.json'), {
        dependencies: { next: '^15.3.8', astro: '^6.1.10', react: '^19.0.0' },
      })

      const actualFramework = await detector.detect(inputProjectPath, 'typescript')

      expect(actualFramework).toBe('Next.js 15.3.8')
    })

    it('detects Astro when Next.js is absent', async () => {
      await fs.writeJson(path.join(inputProjectPath, 'package.json'), {
        dependencies: { astro: '^6.1.10' },
      })

      const actualFramework = await detector.detect(inputProjectPath, 'typescript')

      expect(actualFramework).toBe('Astro 6.1.10')
    })

    it('detects React when Next.js and Astro are absent', async () => {
      await fs.writeJson(path.join(inputProjectPath, 'package.json'), {
        dependencies: { react: '^19.0.0' },
      })

      const actualFramework = await detector.detect(inputProjectPath, 'typescript')

      expect(actualFramework).toBe('React 19.0.0')
    })

    it('detects Vue', async () => {
      await fs.writeJson(path.join(inputProjectPath, 'package.json'), {
        dependencies: { vue: '^3.4.0' },
      })

      const actualFramework = await detector.detect(inputProjectPath, 'typescript')

      expect(actualFramework).toBe('Vue 3.4.0')
    })

    it('detects Angular', async () => {
      await fs.writeJson(path.join(inputProjectPath, 'package.json'), {
        dependencies: { '@angular/core': '^17.0.0' },
      })

      const actualFramework = await detector.detect(inputProjectPath, 'typescript')

      expect(actualFramework).toBe('Angular 17.0.0')
    })

    it('returns undefined when no known framework dependency is present', async () => {
      await fs.writeJson(path.join(inputProjectPath, 'package.json'), {
        dependencies: { lodash: '^4.17.21' },
      })

      const actualFramework = await detector.detect(inputProjectPath, 'typescript')

      expect(actualFramework).toBeUndefined()
    })

    it('returns undefined when package.json does not exist', async () => {
      const actualFramework = await detector.detect(inputProjectPath, 'typescript')

      expect(actualFramework).toBeUndefined()
    })
  })

  describe('python', () => {
    it('detects Django from requirements.txt', async () => {
      await fs.writeFile(path.join(inputProjectPath, 'requirements.txt'), 'Django==5.0.1\n')

      const actualFramework = await detector.detect(inputProjectPath, 'python')

      expect(actualFramework).toBe('Django')
    })

    it('detects Flask from pyproject.toml', async () => {
      await fs.writeFile(
        path.join(inputProjectPath, 'pyproject.toml'),
        '[project]\nname = "app"\ndependencies = ["flask"]\n'
      )

      const actualFramework = await detector.detect(inputProjectPath, 'python')

      expect(actualFramework).toBe('Flask')
    })

    it('detects FastAPI', async () => {
      await fs.writeFile(path.join(inputProjectPath, 'requirements.txt'), 'fastapi==0.110.0\n')

      const actualFramework = await detector.detect(inputProjectPath, 'python')

      expect(actualFramework).toBe('FastAPI')
    })

    it('returns undefined when no known framework is present', async () => {
      await fs.writeFile(path.join(inputProjectPath, 'requirements.txt'), 'requests==2.31.0\n')

      const actualFramework = await detector.detect(inputProjectPath, 'python')

      expect(actualFramework).toBeUndefined()
    })
  })

  describe('other languages', () => {
    it('returns undefined for go', async () => {
      const actualFramework = await detector.detect(inputProjectPath, 'go')

      expect(actualFramework).toBeUndefined()
    })

    it('returns undefined for unknown', async () => {
      const actualFramework = await detector.detect(inputProjectPath, 'unknown')

      expect(actualFramework).toBeUndefined()
    })
  })
})
