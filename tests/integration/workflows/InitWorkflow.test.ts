import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { InitWorkflow } from '../../../src/core/workflows/dev/InitWorkflow.js'
import { loadConfig } from '../../../src/utils/config.js'

describe('core/workflows/dev/InitWorkflow', () => {
  let inputProjectPath: string
  const workflow = new InitWorkflow()

  beforeEach(async () => {
    inputProjectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sdd-kit-init-'))
  })

  afterEach(async () => {
    await fs.remove(inputProjectPath)
  })

  it('detects the stack, creates the .sdd structure and writes config.yml', async () => {
    await fs.writeJson(path.join(inputProjectPath, 'package.json'), {
      dependencies: { next: '^15.3.8', react: '^19.0.0' },
      devDependencies: { jest: '^29.7.0' },
    })

    const actualResult = await workflow.execute({ projectPath: inputProjectPath })

    expect(actualResult.success).toBe(true)
    expect(actualResult.configPath).toBe(path.join(inputProjectPath, '.sdd', 'config.yml'))

    expect(await fs.pathExists(path.join(inputProjectPath, '.sdd', 'wip'))).toBe(true)
    expect(await fs.pathExists(path.join(inputProjectPath, '.sdd', 'reverse'))).toBe(true)
    expect(await fs.pathExists(path.join(inputProjectPath, '.sdd', 'knowledge'))).toBe(true)

    const savedConfig = await loadConfig(inputProjectPath)
    expect(savedConfig.stack).toEqual({
      language: 'typescript',
      framework: 'Next.js 15.3.8',
      testing: { unit: ['Jest 29.7.0'] },
    })
    expect(savedConfig.projectName).toBe(path.basename(inputProjectPath))
  })

  it('uses the given project name instead of the directory name', async () => {
    const actualResult = await workflow.execute({
      projectPath: inputProjectPath,
      projectName: 'my-app',
    })

    expect(actualResult.success).toBe(true)
    const savedConfig = await loadConfig(inputProjectPath)
    expect(savedConfig.projectName).toBe('my-app')
  })

  it('returns the next steps for the developer', async () => {
    const actualResult = await workflow.execute({ projectPath: inputProjectPath })

    expect(actualResult.nextSteps).toEqual([
      'Planificar un feature: sdd plan <feature-name>',
      'Analizar código existente: sdd reverse init <project-name>',
      'Iniciar el servidor MCP: sdd mcp-server',
    ])
  })

  it('detects a non-typescript stack without a framework', async () => {
    await fs.writeFile(path.join(inputProjectPath, 'requirements.txt'), 'requests==2.31.0\n')

    const actualResult = await workflow.execute({ projectPath: inputProjectPath })

    expect(actualResult.success).toBe(true)
    const savedConfig = await loadConfig(inputProjectPath)
    expect(savedConfig.stack).toEqual({ language: 'python' })
  })

  it('does not overwrite an already-initialized project', async () => {
    await workflow.execute({ projectPath: inputProjectPath })

    const actualResult = await workflow.execute({ projectPath: inputProjectPath })

    expect(actualResult.success).toBe(false)
    expect(actualResult.error).toMatch(/config\.yml/)
  })
})
