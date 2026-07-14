import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { getConfigPath, loadConfig, saveConfig } from '../../../src/utils/config.js'
import type { SddConfig } from '../../../src/types/config.js'

describe('utils/config', () => {
  let inputProjectPath: string

  beforeEach(async () => {
    inputProjectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sdd-kit-config-'))
  })

  afterEach(async () => {
    await fs.remove(inputProjectPath)
  })

  it('getConfigPath points to .sdd/config.yml under the project path', () => {
    const actualPath = getConfigPath(inputProjectPath)

    expect(actualPath).toBe(path.join(inputProjectPath, '.sdd', 'config.yml'))
  })

  it('saveConfig then loadConfig round-trips the same values', async () => {
    const inputConfig: SddConfig = {
      sddPath: '.sdd',
      wipPath: '.sdd/wip',
      reversePath: '.sdd/reverse',
      knowledgePath: '.sdd/knowledge',
      specsPath: 'specs',
      archivePath: '.sdd/archive',
      locale: 'es',
      stack: { language: 'typescript', framework: 'Next.js 15.3.8' },
      projectName: 'my-app',
      mcp: { enabled: true },
      mutation: { enforce: false, threshold: 60 },
      telemetry: { enabled: true, runsFile: '.sdd/telemetry/runs.jsonl' },
    }

    await saveConfig(inputProjectPath, inputConfig)
    const actualConfig = await loadConfig(inputProjectPath)

    expect(actualConfig).toEqual(inputConfig)
  })

  it('loadConfig fills in missing fields with DEFAULT_CONFIG', async () => {
    const configPath = getConfigPath(inputProjectPath)
    await fs.ensureDir(path.dirname(configPath))
    await fs.writeFile(
      configPath,
      'projectName: my-app\nstack:\n  language: typescript\nlocale: en\n'
    )

    const actualConfig = await loadConfig(inputProjectPath)

    expect(actualConfig.projectName).toBe('my-app')
    expect(actualConfig.locale).toBe('en')
    expect(actualConfig.sddPath).toBe('.sdd')
    expect(actualConfig.mutation).toEqual({ enforce: false, threshold: 60 })
    expect(actualConfig.telemetry).toEqual({
      enabled: true,
      runsFile: '.sdd/telemetry/runs.jsonl',
    })
  })

  it('loadConfig rejects when no config file exists', async () => {
    await expect(loadConfig(inputProjectPath)).rejects.toThrow()
  })
})
