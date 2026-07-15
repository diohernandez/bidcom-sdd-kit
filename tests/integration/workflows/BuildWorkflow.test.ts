import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { PlanWorkflow } from '../../../src/core/workflows/dev/PlanWorkflow.js'
import { BuildWorkflow } from '../../../src/core/workflows/dev/BuildWorkflow.js'
import { State, renderMetaMd } from '../../../src/core/state/index.js'
import type { SddConfig } from '../../../src/types/config.js'
import type { StateData } from '../../../src/core/state/types.js'

describe('core/workflows/dev/BuildWorkflow', () => {
  let inputProjectPath: string
  let inputConfig: SddConfig
  const planWorkflow = new PlanWorkflow()
  const buildWorkflow = new BuildWorkflow()

  beforeEach(async () => {
    inputProjectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sdd-kit-build-'))
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

    await planWorkflow.execute({
      featureName: 'checkout-flow',
      projectPath: inputProjectPath,
      config: inputConfig,
      author: { name: 'diohernandez' },
    })
  })

  afterEach(async () => {
    await fs.remove(inputProjectPath)
  })

  async function setPhase(phase: string): Promise<void> {
    const featurePath = path.join(inputProjectPath, '.sdd', 'wip', 'checkout-flow')
    const statePath = path.join(featurePath, 'state.json')
    const data = (await fs.readJson(statePath)) as StateData
    data.state = phase
    data.last_updated = new Date().toISOString()
    await fs.writeJson(statePath, data, { spaces: 2 })
    await renderMetaMd(featurePath)
  }

  it('returns an error when the feature does not exist', async () => {
    const actualResult = await buildWorkflow.execute({
      featureName: 'does-not-exist',
      projectPath: inputProjectPath,
      config: inputConfig,
    })

    expect(actualResult.success).toBe(false)
    expect(actualResult.error).toMatch(/does-not-exist/)
  })

  it('refuses to build a feature still in "funcional"', async () => {
    const actualResult = await buildWorkflow.execute({
      featureName: 'checkout-flow',
      projectPath: inputProjectPath,
      config: inputConfig,
    })

    expect(actualResult.success).toBe(false)
    expect(actualResult.phase).toBe('funcional')
    expect(actualResult.error).toMatch(/planificaci/i)
  })

  it('refuses to build a feature whose plan is not approved yet ("tasks")', async () => {
    await setPhase('tasks')

    const actualResult = await buildWorkflow.execute({
      featureName: 'checkout-flow',
      projectPath: inputProjectPath,
      config: inputConfig,
    })

    expect(actualResult.success).toBe(false)
    expect(actualResult.phase).toBe('tasks')
    expect(actualResult.error).toMatch(/aprobar/i)
  })

  it('succeeds with next steps once the feature is in "impl"', async () => {
    await setPhase('impl')

    const actualResult = await buildWorkflow.execute({
      featureName: 'checkout-flow',
      projectPath: inputProjectPath,
      config: inputConfig,
    })

    expect(actualResult.success).toBe(true)
    expect(actualResult.phase).toBe('impl')
    expect(actualResult.nextSteps).toEqual(
      expect.arrayContaining([expect.stringMatching(/sdd validate checkout-flow/)])
    )
  })
})
