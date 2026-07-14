import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { TemplateLoader } from '../../../../src/services/templates/TemplateLoader.js'

describe('services/templates/TemplateLoader', () => {
  let inputTemplatesRoot: string
  let loader: TemplateLoader

  beforeEach(async () => {
    inputTemplatesRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sdd-kit-templates-'))
    await fs.ensureDir(path.join(inputTemplatesRoot, 'typescript'))
    await fs.ensureDir(path.join(inputTemplatesRoot, 'python'))
    await fs.ensureDir(path.join(inputTemplatesRoot, 'generic'))
    loader = new TemplateLoader(inputTemplatesRoot)
  })

  afterEach(async () => {
    await fs.remove(inputTemplatesRoot)
  })

  describe('load', () => {
    it('loads a template from the requested stack folder when it exists', async () => {
      await fs.writeFile(
        path.join(inputTemplatesRoot, 'typescript', 'constitution.md'),
        '# TypeScript Constitution'
      )

      const actualTemplate = await loader.load('typescript', 'constitution')

      expect(actualTemplate).toEqual({ name: 'constitution', content: '# TypeScript Constitution' })
    })

    it('falls back to generic when the stack folder does not have the template', async () => {
      await fs.writeFile(path.join(inputTemplatesRoot, 'generic', 'constitution.md'), '# Generic Constitution')

      const actualTemplate = await loader.load('python', 'constitution')

      expect(actualTemplate).toEqual({ name: 'constitution', content: '# Generic Constitution' })
    })

    it('prefers the stack-specific template over the generic fallback', async () => {
      await fs.writeFile(
        path.join(inputTemplatesRoot, 'typescript', 'constitution.md'),
        '# TypeScript Constitution'
      )
      await fs.writeFile(path.join(inputTemplatesRoot, 'generic', 'constitution.md'), '# Generic Constitution')

      const actualTemplate = await loader.load('typescript', 'constitution')

      expect(actualTemplate.content).toBe('# TypeScript Constitution')
    })

    it('rejects when neither the stack folder nor generic has the template', async () => {
      await expect(loader.load('python', 'constitution')).rejects.toThrow(/constitution/)
    })

    it('rejects when generic itself is missing the template (no further fallback)', async () => {
      await expect(loader.load('generic', 'constitution')).rejects.toThrow(/constitution/)
    })
  })

  describe('loadForStack', () => {
    beforeEach(async () => {
      const files = ['constitution', 'functional-spec', 'technical-spec', 'task-list', 'meta']
      for (const file of files) {
        await fs.writeFile(
          path.join(inputTemplatesRoot, 'typescript', `${file}.md`),
          `# TypeScript ${file}`
        )
        await fs.writeFile(path.join(inputTemplatesRoot, 'generic', `${file}.md`), `# Generic ${file}`)
      }
    })

    it('loads the full set for a typescript stack', async () => {
      const actualSet = await loader.loadForStack({ language: 'typescript' })

      expect(actualSet.constitution.content).toBe('# TypeScript constitution')
      expect(actualSet.functionalSpec.content).toBe('# TypeScript functional-spec')
      expect(actualSet.technicalSpec.content).toBe('# TypeScript technical-spec')
      expect(actualSet.taskList.content).toBe('# TypeScript task-list')
      expect(actualSet.meta.content).toBe('# TypeScript meta')
    })

    it('falls back to generic for a language without dedicated templates', async () => {
      const actualSet = await loader.loadForStack({ language: 'go' })

      expect(actualSet.constitution.content).toBe('# Generic constitution')
      expect(actualSet.meta.content).toBe('# Generic meta')
    })

    it('falls back to generic for an unknown language', async () => {
      const actualSet = await loader.loadForStack({ language: 'unknown' })

      expect(actualSet.constitution.content).toBe('# Generic constitution')
    })
  })
})
