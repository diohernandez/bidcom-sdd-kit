import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { TestingDetector } from '../../../../src/services/detectors/TestingDetector.js'

describe('services/detectors/TestingDetector', () => {
  let inputProjectPath: string
  const detector = new TestingDetector()

  beforeEach(async () => {
    inputProjectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sdd-kit-testing-'))
  })

  afterEach(async () => {
    await fs.remove(inputProjectPath)
  })

  describe('typescript', () => {
    it('detects Jest, Cypress and Storybook together', async () => {
      await fs.writeJson(path.join(inputProjectPath, 'package.json'), {
        devDependencies: { jest: '^29.7.0', cypress: '^13.6.0', storybook: '^8.6.14' },
      })

      const actualTesting = await detector.detect(inputProjectPath, 'typescript')

      expect(actualTesting).toEqual({
        unit: ['Jest 29.7.0'],
        e2e: ['Cypress 13.6.0'],
        visual: ['Storybook 8.6.14'],
      })
    })

    it('detects Vitest and Playwright', async () => {
      await fs.writeJson(path.join(inputProjectPath, 'package.json'), {
        devDependencies: { vitest: '^1.2.0', playwright: '^1.41.0' },
      })

      const actualTesting = await detector.detect(inputProjectPath, 'typescript')

      expect(actualTesting).toEqual({
        unit: ['Vitest 1.2.0'],
        e2e: ['Playwright 1.41.0'],
      })
    })

    it('returns an empty object when no testing tool is detected', async () => {
      await fs.writeJson(path.join(inputProjectPath, 'package.json'), {
        devDependencies: { typescript: '^5.4.0' },
      })

      const actualTesting = await detector.detect(inputProjectPath, 'typescript')

      expect(actualTesting).toEqual({})
    })

    it('returns an empty object when package.json does not exist', async () => {
      const actualTesting = await detector.detect(inputProjectPath, 'typescript')

      expect(actualTesting).toEqual({})
    })
  })

  describe('python', () => {
    it('detects pytest from requirements.txt', async () => {
      await fs.writeFile(path.join(inputProjectPath, 'requirements.txt'), 'pytest==8.0.0\n')

      const actualTesting = await detector.detect(inputProjectPath, 'python')

      expect(actualTesting).toEqual({ unit: ['pytest'] })
    })

    it('returns an empty object when no manifest is present', async () => {
      const actualTesting = await detector.detect(inputProjectPath, 'python')

      expect(actualTesting).toEqual({})
    })
  })

  describe('other languages', () => {
    it('returns an empty object for go', async () => {
      const actualTesting = await detector.detect(inputProjectPath, 'go')

      expect(actualTesting).toEqual({})
    })
  })
})
