import { describe, it, expect } from '@jest/globals'
import { TemplateLoader } from '../../src/services/templates/TemplateLoader.js'
import { TemplateRenderer } from '../../src/services/templates/TemplateRenderer.js'

describe('templates (real files shipped with the package)', () => {
  const loader = new TemplateLoader()
  const renderer = new TemplateRenderer()

  it('loads the full typescript dev-workflow template set', async () => {
    const actualSet = await loader.loadForStack({ language: 'typescript' })

    expect(actualSet.constitution.content).toContain('# Constitución del Proyecto')
    expect(actualSet.functionalSpec.content).toContain('# Especificación Funcional')
    expect(actualSet.technicalSpec.content).toContain('# Especificación Técnica')
    expect(actualSet.taskList.content).toContain('# Lista de Tareas')
    expect(actualSet.meta.content).toContain('# Feature')
  })

  it('falls back to the generic dev-workflow template set for an unsupported language', async () => {
    const actualSet = await loader.loadForStack({ language: 'go' })

    expect(actualSet.constitution.content).toContain('# Constitución del Proyecto')
    expect(actualSet.technicalSpec.content).toContain('# Especificación Técnica')
  })

  it.each([
    ['reverse/stack', '# Stack Tecnológico'],
    ['reverse/architecture', '# Arquitectura'],
    ['reverse/integration', '# Integración de Frameworks'],
    ['reverse/components', '# Estructura de Componentes'],
    ['reverse/data-flow', '# Flujo de Datos'],
    ['reverse/testing', '# Estrategia de Testing'],
  ])('loads the typescript reverse-workflow template "%s"', async (templateName, expectedHeading) => {
    const actualTemplate = await loader.load('typescript', templateName)

    expect(actualTemplate.content).toContain(expectedHeading)
  })

  it('renders a loaded template by substituting its declared variables', async () => {
    const template = await loader.load('typescript', 'meta')

    const actualContent = renderer.render(template, {
      featureName: 'demo-feature',
      state: 'funcional',
      createdAt: '2026-07-14T00:00:00Z',
      createdBy: 'diohernandez',
      createdByEmail: 'dionisio.hernandez@bidcom.com.ar',
      framework: 'Next.js 15.3.8',
      language: 'typescript',
      styling: 'Tailwind CSS 4',
      domain: 'dev-tools',
    })

    expect(actualContent).toContain('feature_name: "demo-feature"')
    expect(actualContent).not.toMatch(/\{\{\s*\w+\s*\}\}/)
  })
})
