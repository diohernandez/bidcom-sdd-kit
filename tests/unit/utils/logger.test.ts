import { describe, it, expect, jest, afterEach } from '@jest/globals'
import { info, success, warn, error } from '../../../src/utils/logger.js'

describe('utils/logger', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('info logs the message to stdout', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    info('detecting stack')

    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy.mock.calls[0]?.[0]).toContain('detecting stack')
  })

  it('success logs the message to stdout', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    success('done')

    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy.mock.calls[0]?.[0]).toContain('done')
  })

  it('warn logs the message to stderr', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    warn('careful')

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain('careful')
  })

  it('error logs the message to stderr', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    error('boom')

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0]?.[0]).toContain('boom')
  })
})
