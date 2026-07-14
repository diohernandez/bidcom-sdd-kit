import { describe, it, expect } from '@jest/globals'
import path from 'node:path'
import {
  resolveSddPath,
  resolveWipPath,
  resolveReversePath,
  resolveSpecsPath,
  resolveArchivePath,
} from '../../../src/utils/paths.js'
import { DEFAULT_CONFIG } from '../../../src/types/config.js'

describe('utils/paths', () => {
  const inputProjectPath = '/repo/my-app'

  it('resolveSddPath joins the project path with config.sddPath', () => {
    const actualPath = resolveSddPath(inputProjectPath, DEFAULT_CONFIG)

    expect(actualPath).toBe(path.join(inputProjectPath, '.sdd'))
  })

  it('resolveWipPath joins the project path with config.wipPath', () => {
    const actualPath = resolveWipPath(inputProjectPath, DEFAULT_CONFIG)

    expect(actualPath).toBe(path.join(inputProjectPath, '.sdd', 'wip'))
  })

  it('resolveReversePath joins the project path with config.reversePath', () => {
    const actualPath = resolveReversePath(inputProjectPath, DEFAULT_CONFIG)

    expect(actualPath).toBe(path.join(inputProjectPath, '.sdd', 'reverse'))
  })

  it('resolveSpecsPath joins the project path with config.specsPath (sibling of src/)', () => {
    const actualPath = resolveSpecsPath(inputProjectPath, DEFAULT_CONFIG)

    expect(actualPath).toBe(path.join(inputProjectPath, 'specs'))
  })

  it('resolveArchivePath joins the project path with config.archivePath', () => {
    const actualPath = resolveArchivePath(inputProjectPath, DEFAULT_CONFIG)

    expect(actualPath).toBe(path.join(inputProjectPath, '.sdd', 'archive'))
  })

  it('honors custom paths from a non-default config', () => {
    const inputConfig = { ...DEFAULT_CONFIG, sddPath: '.custom-sdd', wipPath: '.custom-sdd/wip' }

    expect(resolveSddPath(inputProjectPath, inputConfig)).toBe(
      path.join(inputProjectPath, '.custom-sdd')
    )
    expect(resolveWipPath(inputProjectPath, inputConfig)).toBe(
      path.join(inputProjectPath, '.custom-sdd', 'wip')
    )
  })
})
