import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { ReverseWorkflow } from '../../../src/core/workflows/reverse/ReverseWorkflow.js'
import type { SddConfig } from '../../../src/types/config.js'

describe('core/workflows/reverse/ReverseWorkflow', () => {
  let inputProjectPath: string
  let inputConfig: SddConfig
  const workflow = new ReverseWorkflow()

  beforeEach(async () => {
    inputProjectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sdd-kit-reverse-'))
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

  it('creates the full phase directory structure', async () => {
    const actualResult = await workflow.execute({
      projectName: 'bidcom-website',
      projectPath: inputProjectPath,
      config: inputConfig,
      author: { name: 'diohernandez', email: 'dionisio.hernandez@bidcom.com.ar' },
    })

    const reversePath = path.join(inputProjectPath, '.sdd', 'reverse', 'bidcom-website')
    expect(actualResult.success).toBe(true)
    expect(actualResult.reversePath).toBe(reversePath)

    for (const dir of [
      '1-spec',
      '2-architecture',
      '3-integration',
      '4-components',
      '5-data-flow',
      '6-testing',
      '7-documentation',
    ]) {
      expect(await fs.pathExists(path.join(reversePath, dir))).toBe(true)
    }
  })

  it('renders the constitution with the project metadata', async () => {
    await workflow.execute({
      projectName: 'bidcom-website',
      projectPath: inputProjectPath,
      config: inputConfig,
      author: { name: 'diohernandez' },
    })

    const constitution = await fs.readFile(
      path.join(inputProjectPath, '.sdd', 'reverse', 'bidcom-website', 'constitution.md'),
      'utf-8'
    )
    expect(constitution).toContain('# Constitución del Proyecto: bidcom-website')
    expect(constitution).toContain('| **Proyecto** | bidcom-website |')
    expect(constitution).toContain('| **Analista** | diohernandez |')
    expect(constitution).toContain('| **Estado** | draft |')
  })

  it('renders meta.md with all 7 phases still pending', async () => {
    await workflow.execute({
      projectName: 'bidcom-website',
      projectPath: inputProjectPath,
      config: inputConfig,
      author: { name: 'diohernandez' },
    })

    const meta = await fs.readFile(
      path.join(inputProjectPath, '.sdd', 'reverse', 'bidcom-website', 'meta.md'),
      'utf-8'
    )
    expect(meta).toContain('project_name: "bidcom-website"')
    expect(meta).toContain('state: "constitution"')
    expect(meta).toContain('- [ ] Fase 1: Stack Tecnológico')
    expect(meta).not.toMatch(/\{\{\s*\w+\s*\}\}/)
  })

  it('returns next steps pointing to the first analysis phase', async () => {
    const actualResult = await workflow.execute({
      projectName: 'bidcom-website',
      projectPath: inputProjectPath,
      config: inputConfig,
      author: { name: 'diohernandez' },
    })

    expect(actualResult.nextSteps).toEqual(
      expect.arrayContaining([expect.stringMatching(/sdd reverse analyze stack/)])
    )
  })

  it('does not overwrite an existing reverse-engineering project', async () => {
    await workflow.execute({
      projectName: 'bidcom-website',
      projectPath: inputProjectPath,
      config: inputConfig,
      author: { name: 'diohernandez' },
    })

    const actualResult = await workflow.execute({
      projectName: 'bidcom-website',
      projectPath: inputProjectPath,
      config: inputConfig,
      author: { name: 'diohernandez' },
    })

    expect(actualResult.success).toBe(false)
    expect(actualResult.error).toMatch(/bidcom-website/)
  })
})
