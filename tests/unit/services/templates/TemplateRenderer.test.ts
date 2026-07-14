import { describe, it, expect } from '@jest/globals'
import { TemplateRenderer } from '../../../../src/services/templates/TemplateRenderer.js'
import type { Template } from '../../../../src/types/template.js'

describe('services/templates/TemplateRenderer', () => {
  const renderer = new TemplateRenderer()

  it('substitutes a single variable', () => {
    const inputTemplate: Template = { name: 'greeting', content: 'Hello {{name}}!' }

    const actualContent = renderer.render(inputTemplate, { name: 'sdd-kit' })

    expect(actualContent).toBe('Hello sdd-kit!')
  })

  it('substitutes multiple occurrences of the same variable', () => {
    const inputTemplate: Template = { name: 'repeat', content: '{{name}} and {{name}} again' }

    const actualContent = renderer.render(inputTemplate, { name: 'x' })

    expect(actualContent).toBe('x and x again')
  })

  it('tolerates whitespace inside the mustache delimiters', () => {
    const inputTemplate: Template = { name: 'spaced', content: 'Hi {{ name }}!' }

    const actualContent = renderer.render(inputTemplate, { name: 'sdd-kit' })

    expect(actualContent).toBe('Hi sdd-kit!')
  })

  it('leaves a placeholder untouched when no matching variable is provided', () => {
    const inputTemplate: Template = { name: 'missing', content: 'Hello {{unknownVar}}!' }

    const actualContent = renderer.render(inputTemplate, { name: 'sdd-kit' })

    expect(actualContent).toBe('Hello {{unknownVar}}!')
  })

  it('stringifies non-string variable values', () => {
    const inputTemplate: Template = { name: 'count', content: 'Total: {{total}}' }

    const actualContent = renderer.render(inputTemplate, { total: 59 })

    expect(actualContent).toBe('Total: 59')
  })
})
