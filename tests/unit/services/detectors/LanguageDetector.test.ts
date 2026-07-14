import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { LanguageDetector } from '../../../../src/services/detectors/LanguageDetector.js'

describe('services/detectors/LanguageDetector', () => {
  let inputProjectPath: string
  const detector = new LanguageDetector()

  beforeEach(async () => {
    inputProjectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sdd-kit-lang-'))
  })

  afterEach(async () => {
    await fs.remove(inputProjectPath)
  })

  it('detects typescript when package.json is present', async () => {
    await fs.writeJson(path.join(inputProjectPath, 'package.json'), { name: 'app' })

    const actualLanguage = await detector.detect(inputProjectPath)

    expect(actualLanguage).toBe('typescript')
  })

  it('detects python when requirements.txt is present', async () => {
    await fs.writeFile(path.join(inputProjectPath, 'requirements.txt'), 'django==5.0\n')

    const actualLanguage = await detector.detect(inputProjectPath)

    expect(actualLanguage).toBe('python')
  })

  it('detects python when pyproject.toml is present', async () => {
    await fs.writeFile(path.join(inputProjectPath, 'pyproject.toml'), '[project]\nname = "app"\n')

    const actualLanguage = await detector.detect(inputProjectPath)

    expect(actualLanguage).toBe('python')
  })

  it('detects go when go.mod is present', async () => {
    await fs.writeFile(path.join(inputProjectPath, 'go.mod'), 'module example.com/app\n\ngo 1.22\n')

    const actualLanguage = await detector.detect(inputProjectPath)

    expect(actualLanguage).toBe('go')
  })

  it('detects rust when Cargo.toml is present', async () => {
    await fs.writeFile(path.join(inputProjectPath, 'Cargo.toml'), '[package]\nname = "app"\n')

    const actualLanguage = await detector.detect(inputProjectPath)

    expect(actualLanguage).toBe('rust')
  })

  it('returns unknown when no manifest is recognized', async () => {
    const actualLanguage = await detector.detect(inputProjectPath)

    expect(actualLanguage).toBe('unknown')
  })

  it('prioritizes package.json over other manifests when several are present', async () => {
    await fs.writeJson(path.join(inputProjectPath, 'package.json'), { name: 'app' })
    await fs.writeFile(path.join(inputProjectPath, 'go.mod'), 'module example.com/app\n')

    const actualLanguage = await detector.detect(inputProjectPath)

    expect(actualLanguage).toBe('typescript')
  })
})
