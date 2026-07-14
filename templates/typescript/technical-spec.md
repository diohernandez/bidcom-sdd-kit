---
schema_version: "3.0.0"
feature_name: "{{featureName}}"
phase: "technical"
created_at: "{{createdAt}}"
created_by: "{{createdBy}}"
stack_detected:
  framework: "{{framework}}"
  language: "{{language}}"
  styling: "{{styling}}"
architecture_pattern: "pending"
domain: "{{domain}}"
contributors: []
---

# Especificación Técnica: {{featureName}}

## 1. Arquitectura y Patrones de Diseño
### 1.1 Patrón Principal
_¿Container/Presentational? Custom Hooks? State Machines?_

**Justificación** [Google Eng Practices: Design - Simplicity]:
_Explica por qué este patrón reduce complejidad y mejora mantenibilidad_

### 1.2 Diagrama de Componentes
```
[Componente A] --> [Componente B]
      |
      v
[Componente C]
```

## 2. Estructura de Archivos
```
src/
├── components/
│   └── [feature]/
│       ├── [Component].tsx
│       └── index.ts
├── hooks/
│   └── use[Feature].ts
└── core/
    ├── entities/
    │   └── [Entity].ts
    ├── adapters/
    │   └── [Repository].ts
    └── interactors/
        └── [UseCase].ts
```

## 3. Interfaces y Tipos
### 3.1 Entidades de Dominio
```typescript
interface [Entity] {
  id: string;
  // ...
}
```

### 3.2 Props de Componentes
```typescript
interface [Component]Props {
  // ...
}
```

### 3.3 Custom Hooks
```typescript
interface Use[Feature]Return {
  // ...
}

const use[Feature] = (): Use[Feature]Return => {
  // ...
}
```

## 4. Gestión de Estado
### 4.1 Estado Local vs Global
_¿Dónde vive el estado? ¿Por qué?_

**Justificación** [Google Eng Practices: Design - State Management]:
_Explica la decisión de centralización o distribución del estado_

### 4.2 Flujo de Datos
```
[User Action] → [Handler] → [State Update] → [Re-render]
```

## 5. Estrategia de Testing
### 5.1 Unit Tests (Jest)
- [ ] Test 1: [Descripción]
- [ ] Test 2: [Descripción]

### 5.2 E2E Tests (Cypress)
- [ ] Test 1: [Descripción]
- [ ] Test 2: [Descripción]

### 5.3 Storybook Stories
- [ ] Story 1: [Variante]
- [ ] Story 2: [Variante]

## 6. Consideraciones de Performance
- [ ] Optimización 1
- [ ] Optimización 2

## 7. Accesibilidad (a11y)
- [ ] Requisito 1
- [ ] Requisito 2

## 8. Dependencias Externas
- [ ] Dependencia 1
- [ ] Dependencia 2
