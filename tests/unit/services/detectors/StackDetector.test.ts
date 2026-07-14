import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { StackDetector } from '../../../../src/services/detectors/StackDetector.js'

describe('services/detectors/StackDetector', () => {
  let inputProjectPath: string
  const detector = new StackDetector()

  beforeEach(async () => {
    inputProjectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sdd-kit-stack-'))
  })

  afterEach(async () => {
    await fs.remove(inputProjectPath)
  })

  it('combines language, framework and testing into a single DetectedStack', async () => {
    await fs.writeJson(path.join(inputProjectPath, 'package.json'), {
      dependencies: { next: '^15.3.8', react: '^19.0.0' },
      devDependencies: { jest: '^29.7.0', cypress: '^13.6.0', storybook: '^8.6.14' },
    })

    const actualStack = await detector.detect(inputProjectPath)

    expect(actualStack).toEqual({
      language: 'typescript',
      framework: 'Next.js 15.3.8',
      testing: {
        unit: ['Jest 29.7.0'],
        e2e: ['Cypress 13.6.0'],
        visual: ['Storybook 8.6.14'],
      },
    })
  })

  it('omits framework and testing when nothing was detected', async () => {
    const actualStack = await detector.detect(inputProjectPath)

    expect(actualStack).toEqual({ language: 'unknown' })
  })

  it('detects a python project with a framework and no testing tool', async () => {
    await fs.writeFile(path.join(inputProjectPath, 'requirements.txt'), 'Django==5.0.1\nrequests==2.31.0\n')

    const actualStack = await detector.detect(inputProjectPath)

    expect(actualStack).toEqual({ language: 'python', framework: 'Django' })
  })
})
