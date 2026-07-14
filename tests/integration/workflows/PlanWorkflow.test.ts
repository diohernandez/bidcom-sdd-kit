import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { PlanWorkflow } from '../../../src/core/workflows/dev/PlanWorkflow.js'
import type { SddConfig } from '../../../src/types/config.js'

describe('core/workflows/dev/PlanWorkflow', () => {
  let inputProjectPath: string
  let inputConfig: SddConfig
  const workflow = new PlanWorkflow()

  beforeEach(async () => {
    inputProjectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sdd-kit-plan-'))
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
      domain: 'dev-tools',
      mutation: { enforce: false, threshold: 60 },
      telemetry: { enabled: true, runsFile: '.sdd/telemetry/runs.jsonl' },
    }
  })

  afterEach(async () => {
    await fs.remove(inputProjectPath)
  })

  it('creates the full feature structure with rendered templates', async () => {
    const actualResult = await workflow.execute({
      featureName: 'checkout-flow',
      projectPath: inputProjectPath,
      config: inputConfig,
      author: { name: 'diohernandez', email: 'dionisio.hernandez@bidcom.com.ar' },
    })

    const featurePath = path.join(inputProjectPath, '.sdd', 'wip', 'checkout-flow')
    expect(actualResult.success).toBe(true)
    expect(actualResult.featurePath).toBe(featurePath)

    const functionalSpec = await fs.readFile(
      path.join(featurePath, '1-functional', 'spec.md'),
      'utf-8'
    )
    expect(functionalSpec).toContain('feature_name: "checkout-flow"')
    expect(functionalSpec).toContain('# Especificación Funcional: checkout-flow')
    expect(functionalSpec).toContain('framework: "Next.js 15.3.8"')
    expect(functionalSpec).not.toMatch(/\{\{\s*\w+\s*\}\}/)

    const technicalSpec = await fs.readFile(
      path.join(featurePath, '2-technical', 'spec.md'),
      'utf-8'
    )
    expect(technicalSpec).toContain('# Especificación Técnica: checkout-flow')
    expect(technicalSpec).not.toMatch(/\{\{\s*\w+\s*\}\}/)

    const taskList = await fs.readFile(path.join(featurePath, '3-tasks', 'task-list.md'), 'utf-8')
    expect(taskList).toContain('# Lista de Tareas: checkout-flow')
    expect(taskList).not.toMatch(/\{\{\s*\w+\s*\}\}/)

    const meta = await fs.readFile(path.join(featurePath, 'meta.md'), 'utf-8')
    expect(meta).toContain('# Feature: checkout-flow')
    expect(meta).toContain('state: "funcional"')
    expect(meta).toContain('created_by_email: "dionisio.hernandez@bidcom.com.ar"')
    expect(meta).not.toMatch(/\{\{\s*\w+\s*\}\}/)
  })

  it('returns the next steps for the developer', async () => {
    const actualResult = await workflow.execute({
      featureName: 'checkout-flow',
      projectPath: inputProjectPath,
      config: inputConfig,
      author: { name: 'diohernandez' },
    })

    expect(actualResult.nextSteps).toEqual([
      `Editar: ${path.join(inputProjectPath, '.sdd', 'wip', 'checkout-flow')}/1-functional/spec.md`,
      'Ejecutar: sdd validate checkout-flow',
    ])
  })

  it('falls back to the generic templates for a non-typescript stack', async () => {
    const actualResult = await workflow.execute({
      featureName: 'ingest-job',
      projectPath: inputProjectPath,
      config: { ...inputConfig, stack: { language: 'go' } },
      author: { name: 'diohernandez' },
    })

    const functionalSpec = await fs.readFile(
      path.join(actualResult.featurePath as string, '1-functional', 'spec.md'),
      'utf-8'
    )
    expect(functionalSpec).toContain('# Especificación Funcional: ingest-job')
    expect(functionalSpec).toContain('framework: "no detectado"')
  })

  it('does not overwrite an existing feature', async () => {
    await workflow.execute({
      featureName: 'checkout-flow',
      projectPath: inputProjectPath,
      config: inputConfig,
      author: { name: 'diohernandez' },
    })

    const actualResult = await workflow.execute({
      featureName: 'checkout-flow',
      projectPath: inputProjectPath,
      config: inputConfig,
      author: { name: 'diohernandez' },
    })

    expect(actualResult.success).toBe(false)
    expect(actualResult.error).toMatch(/checkout-flow/)
  })
})
