import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { PlanWorkflow } from '../../../src/core/workflows/dev/PlanWorkflow.js'
import { ValidateWorkflow } from '../../../src/core/workflows/dev/ValidateWorkflow.js'
import type { SddConfig } from '../../../src/types/config.js'

describe('core/workflows/dev/ValidateWorkflow', () => {
  let inputProjectPath: string
  let inputConfig: SddConfig
  const planWorkflow = new PlanWorkflow()
  const validateWorkflow = new ValidateWorkflow()

  beforeEach(async () => {
    inputProjectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sdd-kit-validate-'))
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

  it('fails a freshly planned feature still in "funcional" (template placeholders untouched)', async () => {
    const actualResult = await validateWorkflow.execute({
      featureName: 'checkout-flow',
      projectPath: inputProjectPath,
      config: inputConfig,
    })

    expect(actualResult.success).toBe(false)
    expect(actualResult.phase).toBe('funcional')
    expect(actualResult.checks?.some((check) => !check.passed)).toBe(true)
  })

  it('passes once the functional spec placeholders are filled in', async () => {
    const specPath = path.join(
      inputProjectPath,
      '.sdd',
      'wip',
      'checkout-flow',
      '1-functional',
      'spec.md'
    )
    let content = await fs.readFile(specPath, 'utf-8')
    content = content
      .replace('_¿Qué problema resuelve este feature?_', 'Los usuarios no pueden pagar en una sola pantalla.')
      .replace('- [ ] Objetivo 1\n- [ ] Objetivo 2', '- [x] Permitir pago en un paso')
      .replace(
        '**Como** [rol]  \n**Quiero** [acción]  \n**Para** [beneficio]',
        '**Como** comprador  \n**Quiero** pagar en un paso  \n**Para** ahorrar tiempo'
      )
    await fs.writeFile(specPath, content)

    const actualResult = await validateWorkflow.execute({
      featureName: 'checkout-flow',
      projectPath: inputProjectPath,
      config: inputConfig,
    })

    expect(actualResult.success).toBe(true)
    expect(actualResult.checks?.every((check) => check.passed)).toBe(true)
  })

  it('validates the technical spec once the feature is in "tecnico"', async () => {
    const metaPath = path.join(inputProjectPath, '.sdd', 'wip', 'checkout-flow', 'meta.md')
    const meta = await fs.readFile(metaPath, 'utf-8')
    await fs.writeFile(metaPath, meta.replace('state: "funcional"', 'state: "tecnico"'))

    const actualResult = await validateWorkflow.execute({
      featureName: 'checkout-flow',
      projectPath: inputProjectPath,
      config: inputConfig,
    })

    expect(actualResult.phase).toBe('tecnico')
    expect(actualResult.success).toBe(false)
    expect(actualResult.checks?.some((check) => !check.passed)).toBe(true)
  })

  it('returns an error when the feature does not exist', async () => {
    const actualResult = await validateWorkflow.execute({
      featureName: 'does-not-exist',
      projectPath: inputProjectPath,
      config: inputConfig,
    })

    expect(actualResult.success).toBe(false)
    expect(actualResult.error).toMatch(/does-not-exist/)
  })

  it('returns an error for a phase without content validation defined yet', async () => {
    const metaPath = path.join(inputProjectPath, '.sdd', 'wip', 'checkout-flow', 'meta.md')
    const meta = await fs.readFile(metaPath, 'utf-8')
    await fs.writeFile(metaPath, meta.replace('state: "funcional"', 'state: "impl"'))

    const actualResult = await validateWorkflow.execute({
      featureName: 'checkout-flow',
      projectPath: inputProjectPath,
      config: inputConfig,
    })

    expect(actualResult.success).toBe(false)
    expect(actualResult.error).toMatch(/impl/)
  })
})
