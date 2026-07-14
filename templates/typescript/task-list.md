---
schema_version: "3.0.0"
feature_name: "{{featureName}}"
phase: "tasks"
created_at: "{{createdAt}}"
created_by: "{{createdBy}}"
total_tasks: 0
completed_tasks: 0
---

# Lista de Tareas: {{featureName}}

## Fase 1: Setup y Configuración
- [ ] **Tarea 1.1**: [Descripción]
  - **Archivos**: `src/...`
  - **Requirements**: R-001
  - **Dependencias**: Ninguna
  - **Criterios de Aceptación**:
    - [ ] Criterio 1
    - [ ] Criterio 2

## Fase 2: Entidades y Core (Clean Architecture)
- [ ] **Tarea 2.1**: [Descripción]
  - **Archivos**: `src/core/entities/...`
  - **Requirements**: R-002
  - **Dependencias**: Tarea 1.1
  - **Criterios de Aceptación**:
    - [ ] Criterio 1

## Fase 3: Adapters e Interactors
- [ ] **Tarea 3.1**: [Descripción]
  - **Archivos**: `src/core/adapters/...`, `src/core/interactors/...`
  - **Requirements**: R-003
  - **Dependencias**: Tarea 2.1
  - **Criterios de Aceptación**:
    - [ ] Criterio 1

## Fase 4: Componentes UI (TDD)
- [ ] **Tarea 4.1**: Escribir test unitario para [Component]
  - **Archivos**: `src/components/[feature]/__tests__/[Component].test.tsx`
  - **Requirements**: R-004
  - **Dependencias**: Tarea 3.1
  - **Criterios de Aceptación**:
    - [ ] Test falla (Red)

- [ ] **Tarea 4.2**: Implementar [Component] para pasar el test
  - **Archivos**: `src/components/[feature]/[Component].tsx`
  - **Requirements**: R-004
  - **Dependencias**: Tarea 4.1
  - **Criterios de Aceptación**:
    - [ ] Test pasa (Green)
    - [ ] Refactorizado

- [ ] **Tarea 4.3**: Crear Storybook story para [Component]
  - **Archivos**: `src/components/[feature]/[Component].stories.tsx`
  - **Requirements**: R-004
  - **Dependencias**: Tarea 4.2
  - **Criterios de Aceptación**:
    - [ ] Story visible en Storybook

## Fase 5: Custom Hooks
- [ ] **Tarea 5.1**: Escribir test para use[Feature]
  - **Archivos**: `src/hooks/__tests__/use[Feature].test.ts`
  - **Requirements**: R-005
  - **Dependencias**: Tarea 3.1
  - **Criterios de Aceptación**:
    - [ ] Test falla (Red)

- [ ] **Tarea 5.2**: Implementar use[Feature]
  - **Archivos**: `src/hooks/use[Feature].ts`
  - **Requirements**: R-005
  - **Dependencias**: Tarea 5.1
  - **Criterios de Aceptación**:
    - [ ] Test pasa (Green)

## Fase 6: Integración y Pages
- [ ] **Tarea 6.1**: Integrar componentes en página/feature
  - **Archivos**: `src/app/...` o `src/astro/pages/...`
  - **Requirements**: R-001, R-004, R-005
  - **Dependencias**: Tareas 4.2, 5.2
  - **Criterios de Aceptación**:
    - [ ] Feature funcional end-to-end

## Fase 7: E2E Tests
- [ ] **Tarea 7.1**: Escribir test E2E para flujo principal
  - **Archivos**: `cypress/e2e/[feature].cy.ts`
  - **Requirements**: R-001
  - **Dependencias**: Tarea 6.1
  - **Criterios de Aceptación**:
    - [ ] Test E2E pasa
    - [ ] APIs mockeadas

## Fase 8: Documentación y Review
- [ ] **Tarea 8.1**: Actualizar documentación
  - **Archivos**: `README.md`, `docs/...`
  - **Requirements**: Ninguno (documentación transversal)
  - **Dependencias**: Tarea 7.1
  - **Criterios de Aceptación**:
    - [ ] Documentación completa

- [ ] **Tarea 8.2**: Code review y aprobación
  - **Requirements**: Ninguno (revisión transversal)
  - **Dependencias**: Tarea 8.1
  - **Criterios de Aceptación**:
    - [ ] Aprobado por revisor
