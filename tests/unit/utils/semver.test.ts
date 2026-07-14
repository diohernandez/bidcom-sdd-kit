import { describe, it, expect } from '@jest/globals'
import { stripSemverRange } from '../../../src/utils/semver.js'

describe('utils/semver', () => {
  it('strips a leading caret', () => {
    expect(stripSemverRange('^15.3.8')).toBe('15.3.8')
  })

  it('strips a leading tilde', () => {
    expect(stripSemverRange('~29.7.0')).toBe('29.7.0')
  })

  it('leaves a plain version untouched', () => {
    expect(stripSemverRange('5.4.0')).toBe('5.4.0')
  })

  it('leaves range specifiers other than ^/~ untouched', () => {
    expect(stripSemverRange('>=18.0.0')).toBe('>=18.0.0')
  })
})
