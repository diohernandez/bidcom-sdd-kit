import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { fileExists, readJson, writeJson, mkdirp } from '../../../src/utils/fs.js'

describe('utils/fs', () => {
  let inputTmpDir: string

  beforeEach(async () => {
    inputTmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sdd-kit-fs-'))
  })

  afterEach(async () => {
    await fs.remove(inputTmpDir)
  })

  describe('fileExists', () => {
    it('returns true when the file exists', async () => {
      const inputFilePath = path.join(inputTmpDir, 'exists.txt')
      await fs.writeFile(inputFilePath, 'content')

      const actualResult = await fileExists(inputFilePath)

      expect(actualResult).toBe(true)
    })

    it('returns false when the file does not exist', async () => {
      const inputFilePath = path.join(inputTmpDir, 'missing.txt')

      const actualResult = await fileExists(inputFilePath)

      expect(actualResult).toBe(false)
    })
  })

  describe('readJson / writeJson', () => {
    it('writes and reads back a JSON file with the original shape', async () => {
      const inputFilePath = path.join(inputTmpDir, 'data.json')
      const inputData = { featureName: 'sdd-kit', total: 59 }

      await writeJson(inputFilePath, inputData)
      const actualData = await readJson<typeof inputData>(inputFilePath)

      expect(actualData).toEqual(inputData)
    })

    it('creates missing parent directories when writing', async () => {
      const inputFilePath = path.join(inputTmpDir, 'nested', 'deep', 'data.json')

      await writeJson(inputFilePath, { ok: true })

      expect(await fileExists(inputFilePath)).toBe(true)
    })

    it('rejects when reading a JSON file that does not exist', async () => {
      const inputFilePath = path.join(inputTmpDir, 'missing.json')

      await expect(readJson(inputFilePath)).rejects.toThrow()
    })
  })

  describe('mkdirp', () => {
    it('creates nested directories that do not exist yet', async () => {
      const inputDirPath = path.join(inputTmpDir, 'a', 'b', 'c')

      await mkdirp(inputDirPath)

      const actualStat = await fs.stat(inputDirPath)
      expect(actualStat.isDirectory()).toBe(true)
    })

    it('does not throw when the directory already exists', async () => {
      await mkdirp(inputTmpDir)

      await expect(mkdirp(inputTmpDir)).resolves.not.toThrow()
    })
  })
})
