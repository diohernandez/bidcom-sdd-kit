import { describe, it, expect } from '@jest/globals'
import { parseFrontmatter } from '../../../src/utils/frontmatter.js'

describe('utils/frontmatter', () => {
  it('parses YAML frontmatter and separates it from the body', () => {
    const inputContent = '---\nfeature_name: "checkout-flow"\nstate: "funcional"\n---\n\n# Feature: checkout-flow\n'

    const actual = parseFrontmatter(inputContent)

    expect(actual.data).toEqual({ feature_name: 'checkout-flow', state: 'funcional' })
    expect(actual.body).toBe('\n# Feature: checkout-flow\n')
  })

  it('returns an empty data object and the original content as body when there is no frontmatter', () => {
    const inputContent = '# Just a heading\n\nSome text.\n'

    const actual = parseFrontmatter(inputContent)

    expect(actual.data).toEqual({})
    expect(actual.body).toBe(inputContent)
  })

  it('handles an empty frontmatter block', () => {
    const inputContent = '---\n---\nBody text\n'

    const actual = parseFrontmatter(inputContent)

    expect(actual.data).toEqual({})
    expect(actual.body).toBe('Body text\n')
  })
})
