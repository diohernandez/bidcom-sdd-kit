import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { PlanWorkflow } from '../../../src/core/workflows/dev/PlanWorkflow.js'
import { StatusWorkflow } from '../../../src/core/workflows/dev/StatusWorkflow.js'
import type { SddConfig } from '../../../src/types/config.js'

describe('core/workflows/dev/StatusWorkflow', () => {
  let inputProjectPath: string
  let inputConfig: SddConfig
  const planWorkflow = new PlanWorkflow()
  const statusWorkflow = new StatusWorkflow()

  beforeEach(async () => {
    inputProjectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sdd-kit-status-'))
    inputConfig = {
      sddPath: '.sdd',
      wipPath: '.sdd/wip',
      reversePath: '.sdd/reverse',
      knowledgePath: '.sdd/knowledge',
      specsPath: 'specs',
      archivePath: '.sdd/archive',
      locale: 'es',
      stack: { language: 'typescript', framework: 'Next.js 15.3.8' },
      projectName: 'my-app',
      mutation: { enforce: false, threshold: 60 },
      telemetry: { enabled: true, runsFile: '.sdd/telemetry/runs.jsonl' },
    }
  })

  afterEach(async () => {
    await fs.remove(inputProjectPath)
  })

  describe('single feature', () => {
    beforeEach(async () => {
      await planWorkflow.execute({
        featureName: 'checkout-flow',
        projectPath: inputProjectPath,
        config: inputConfig,
        author: { name: 'diohernandez', email: 'dionisio.hernandez@bidcom.com.ar' },
      })
    })

    it('reports the state and task counts of a freshly planned feature', async () => {
      const actualResult = await statusWorkflow.execute({
        projectPath: inputProjectPath,
        config: inputConfig,
        featureName: 'checkout-flow',
      })

      expect(actualResult.success).toBe(true)
      expect(actualResult.feature?.featureName).toBe('checkout-flow')
      expect(actualResult.feature?.state).toBe('funcional')
      expect(actualResult.feature?.createdBy).toBe('diohernandez')
      expect(actualResult.feature?.tasks).toEqual({ total: 12, done: 0 })
    })

    it('counts completed tasks once some are checked off', async () => {
      const taskListPath = path.join(
        inputProjectPath,
        '.sdd',
        'wip',
        'checkout-flow',
        '3-tasks',
        'task-list.md'
      )
      const content = await fs.readFile(taskListPath, 'utf-8')
      await fs.writeFile(
        taskListPath,
        content.replace('- [ ] **Tarea 1.1**', '- [x] **Tarea 1.1**')
      )

      const actualResult = await statusWorkflow.execute({
        projectPath: inputProjectPath,
        config: inputConfig,
        featureName: 'checkout-flow',
      })

      expect(actualResult.feature?.tasks).toEqual({ total: 12, done: 1 })
    })

    it('returns an error when the feature does not exist', async () => {
      const actualResult = await statusWorkflow.execute({
        projectPath: inputProjectPath,
        config: inputConfig,
        featureName: 'does-not-exist',
      })

      expect(actualResult.success).toBe(false)
      expect(actualResult.error).toMatch(/does-not-exist/)
    })
  })

  describe('dashboard (all features)', () => {
    it('returns an empty dashboard when no feature has been planned yet', async () => {
      const actualResult = await statusWorkflow.execute({
        projectPath: inputProjectPath,
        config: inputConfig,
      })

      expect(actualResult.success).toBe(true)
      expect(actualResult.features).toEqual([])
      expect(actualResult.summaryByState).toEqual({})
    })

    it('summarizes multiple features by state', async () => {
      await planWorkflow.execute({
        featureName: 'checkout-flow',
        projectPath: inputProjectPath,
        config: inputConfig,
        author: { name: 'diohernandez' },
      })
      await planWorkflow.execute({
        featureName: 'search-bar',
        projectPath: inputProjectPath,
        config: inputConfig,
        author: { name: 'diohernandez' },
      })
      const secondMetaPath = path.join(inputProjectPath, '.sdd', 'wip', 'search-bar', 'meta.md')
      const meta = await fs.readFile(secondMetaPath, 'utf-8')
      await fs.writeFile(secondMetaPath, meta.replace('state: "funcional"', 'state: "tecnico"'))

      const actualResult = await statusWorkflow.execute({
        projectPath: inputProjectPath,
        config: inputConfig,
      })

      expect(actualResult.success).toBe(true)
      expect(actualResult.summaryByState).toEqual({ funcional: 1, tecnico: 1 })
      expect(actualResult.features?.map((f) => f.featureName).sort()).toEqual([
        'checkout-flow',
        'search-bar',
      ])
    })
  })
})
