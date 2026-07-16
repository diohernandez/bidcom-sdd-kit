# CLI Reference

`sdd` es la interfaz de línea de comandos de `sdd-kit`. Todos los comandos se ejecutan desde el directorio raíz del proyecto objetivo (donde vive `.sdd/config.yml`).

---

## Uso general

```bash
sdd <comando> [argumentos] [opciones]
```

### Opciones globales

| Opción | Descripción |
|--------|-------------|
| `-V, --version` | Muestra la versión del paquete |
| `-h, --help` | Muestra ayuda del comando |

---

## `sdd init`

Inicializa `sdd-kit` en el proyecto actual, detectando el stack y creando `.sdd/config.yml`.

```bash
sdd init [--name <name>]
```

### Opciones

| Opción | Descripción |
|--------|-------------|
| `--name <name>` | Nombre del proyecto. Por defecto usa el nombre del directorio actual. |

### Output esperado

```
🚀 SDD KIT - Inicialización
🔍 Stack detectado: typescript (Next.js 15.3.8)
✅ sdd-kit inicializado en /ruta/.sdd/config.yml

Próximos pasos:
  • Planificar un feature: sdd plan <feature-name>
  • Analizar código existente: sdd reverse init <project-name>
  • Iniciar el servidor MCP: sdd mcp-server
```

### Errores comunes

- `El proyecto ya está inicializado (...)`: ya existe `.sdd/config.yml`.

---

## `sdd plan <feature>`

Crea la estructura de planificación para un nuevo feature en `.sdd/wip/<feature>/`.

```bash
sdd plan login-v2
```

### Argumentos

| Argumento | Descripción |
|-----------|-------------|
| `feature` | Nombre del feature, preferiblemente en kebab-case. |

### Output esperado

```
🧠 SDD KIT - Plan
✅ Feature "login-v2" creado en /ruta/.sdd/wip/login-v2

Próximos pasos:
  • Editar: /ruta/.sdd/wip/login-v2/1-functional/spec.md
  • Ejecutar: sdd validate login-v2
```

### Errores comunes

- `El feature "X" ya existe en ...`: el directorio ya fue creado.
- `El proyecto no está inicializado`: falta correr `sdd init`.

---

## `sdd build <feature>`

Verifica que un feature esté en fase `impl` y listo para empezar la implementación.

```bash
sdd build login-v2
```

### Output esperado (fase `impl`)

```
🔨 SDD KIT - Build
✅ Feature "login-v2" listo para implementación (fase: impl)

Próximos pasos:
  • Implementar siguiendo TDD: código fuente, tests unitarios, Storybook stories
  • Ejecutar: sdd validate login-v2
```

### Output si el feature no está en `impl`

```
❌ El feature está en estado "tasks". Necesitás aprobar el plan primero: sdd approve login-v2
```

---

## `sdd approve <feature>`

Aprueba el plan de un feature en fase `tasks` y lo mueve a fase `impl`.

```bash
sdd approve login-v2
```

### Output esperado

```
✅ SDD KIT - Approve
✅ Feature "login-v2" aprobado (número de aprobación: 1)
```

### Errores comunes

- `El feature "X" está en fase "Y" — solo se puede aprobar desde "tasks"`.
- `El actor "X" ya aprobó este feature`.

---

## `sdd validate <feature>`

Valida el contenido de la fase actual del feature (`funcional` o `tecnico`).

```bash
sdd validate login-v2
```

### Checks por fase

**Fase `funcional`** (`1-functional/spec.md`):

- Presencia de las secciones:
  - `## 1. Descripción del Problema`
  - `## 2. Objetivos`
  - `## 3. Requisitos Funcionales`
  - `### 3.1 Historias de Usuario`
  - `### 3.2 Criterios de Aceptación`
  - `## 4. Casos de Uso`
- Ausencia de placeholders (`_¿Qué problema...`, `- [ ] Objetivo 1`, `**Como** [rol]`, `_¿Container...`).
- Cobertura de requisitos: cada `R-NNN` debe estar mencionado en al menos una tarea de `task-list.md`.

**Fase `tecnico`** (`2-technical/spec.md`):

- Presencia de:
  - `## 1. Arquitectura y Patrones de Diseño`
  - `## 2. Estructura de Archivos`
  - `## 3. Interfaces y Tipos`
  - `## 4. Gestión de Estado`
  - `## 5. Estrategia de Testing`
- Ausencia de placeholders en el patrón principal.
- Cobertura de requisitos funcionales.

**Fase `impl`** (`3-tasks/task-list.md` + implementation):

- Progreso de tareas completadas vs. totales.
- `gate-result.json` con al menos un análisis exitoso.
- Tests, lint, types y build según el stack.

### Output esperado

```
✅ SDD KIT - Validate
  ✅ section:## 1. Descripción del Problema
  ✅ section:## 2. Objetivos
  ...
✅ Feature "login-v2" válido (fase: funcional)
```

### Códigos de salida

| Código | Significado |
|--------|-------------|
| `0` | Validación exitosa |
| `1` | Error de ejecución |
| `2` | Validación fallida con errores críticos |
| `3` | Validación pasada con advertencias |

---

## `sdd analyze <feature>`

Analiza el estado de un feature en fase `impl` y produce un resumen determinístico basado en `state.json` y `gate-result.json`.

```bash
sdd analyze login-v2
```

### Output esperado

```
📊 SDD KIT - Analyze
📋 Feature: login-v2
   Fase: impl
   Progreso: 5 / 8 tareas
   Gate: 1 aprobado, 0 rechazado
   Status: in-progress
```

### Códigos de salida

| Código | Significado |
|--------|-------------|
| `0` | Feature completado y aprobado |
| `2` | Feature fallido o no aprobado |
| `1` | Error de ejecución |

---

## `sdd done <feature>`

Marca un feature como completado y lo archiva en `.sdd/archive/<feature>/`.

```bash
sdd done login-v2
```

### Output esperado

```
🎉 SDD KIT - Done
✅ Feature "login-v2" completado y archivado en .sdd/archive/login-v2
```

### Prerequisitos

- El feature debe estar en fase `impl`.
- Debe existir `gate-result.json` con al menos una aprobación y ningún rechazo.
- Debe tener todas las tareas completadas.

---

## `sdd archive <feature>`

Mueve manualmente un feature a `.sdd/archive/<feature>/`, sin importar su estado.

```bash
sdd archive login-v2
```

> Útil para descartar features o limpiar WIP. No ejecuta validaciones.

---

## `sdd specs-search <feature>`

Busca menciones de `R-NNN` en el spec funcional y el task-list, y reporta requisitos sin tareas asociadas.

```bash
sdd specs-search login-v2
```

### Output esperado

```
🔍 SDD KIT - Specs Search
📋 Feature: login-v2
  ✅ R-001 — cubierto por T1.1
  ✅ R-002 — cubierto por T2.1
  ❌ R-007 — sin tareas asociadas
```

---

## `sdd status [feature]`

Muestra el estado de un feature específico o un resumen de todos los features en `.sdd/wip/`.

```bash
sdd status           # todos los features
sdd status login-v2  # un feature puntual
```

### Output de un feature

```
📊 SDD KIT - Status
📋 Feature: login-v2
   Estado: funcional
   Creado: 2026-07-14T19:37:08Z por diohernandez
   Tareas: 2 / 8
```

### Output de todos los features

```
📊 SDD KIT - Status
  • login-v2 (funcional)
  • checkout-v1 (tecnico)

Resumen por estado:
  funcional: 1
  tecnico: 1
```

---

## `sdd reverse init <name>`

Inicializa un proyecto de ingeniería inversa en `.sdd/reverse/<name>/`.

```bash
sdd reverse init legacy-app
```

### Output esperado

```
🔍 SDD KIT - Reverse Init
✅ Proyecto "legacy-app" inicializado en /ruta/.sdd/reverse/legacy-app

Próximos pasos:
  • Revisar y personalizar la constitución: /ruta/.sdd/reverse/legacy-app/constitution.md
  • Analizar el stack tecnológico: sdd reverse analyze stack --project legacy-app
  • Ver el estado del análisis: sdd reverse status --project legacy-app
```

### Estructura generada

```
.sdd/reverse/legacy-app/
├── constitution.md
├── meta.md
├── 1-spec/
├── 2-architecture/
├── 3-integration/
├── 4-components/
├── 5-data-flow/
├── 6-testing/
└── 7-documentation/
```

---

## `sdd reverse analyze <phase> --project <name>`

Ejecuta una fase de análisis de ingeniería inversa.

```bash
sdd reverse analyze stack --project legacy-app
sdd reverse analyze architecture --project legacy-app
sdd reverse analyze integration --project legacy-app
sdd reverse analyze components --project legacy-app
sdd reverse analyze data-flow --project legacy-app
sdd reverse analyze testing --project legacy-app
```

### Fases disponibles

| Fase | Archivo generado |
|------|------------------|
| `stack` | `1-spec/spec.md` |
| `architecture` | `2-architecture/architecture.md` |
| `integration` | `3-integration/integration.md` |
| `components` | `4-components/structure.md` |
| `data-flow` | `5-data-flow/general.md` |
| `testing` | `6-testing/strategy.md` |

### Opciones

| Opción | Descripción |
|--------|-------------|
| `--project <name>` | **Requerido.** Nombre del proyecto de reverse engineering. |

### Output esperado

```
🔎 SDD KIT - Reverse Analyze
✅ Fase "stack" completada: /ruta/.sdd/reverse/legacy-app/1-spec/spec.md
  Ecosistema detectado: typescript
```

---

## `sdd reverse status [name]`

Muestra el progreso de un análisis de reverse engineering o la lista de todos los proyectos.

```bash
sdd reverse status           # todos
sdd reverse status legacy-app # uno
```

### Output de un proyecto

```
📊 SDD KIT - Reverse Status
📋 Proyecto: legacy-app
   Estado: constitution
   Creado: 2026-07-14T19:37:08Z por diohernandez

  ✅ Constitución del proyecto
  ❌ Especificación funcional (0 documentos)
  ❌ Arquitectura técnica (0 documentos)
  ...

Progreso: 1 / 8 (12%)
```

---

## `sdd reverse validate <name>`

Valida la completitud del análisis de reverse engineering.

```bash
sdd reverse validate legacy-app
```

### Checks

- Existencia y contenido de `constitution.md`.
- Los 7 archivos de fase (`1-spec/spec.md`, `2-architecture/architecture.md`, etc.).
- `7-documentation/glossary.md` con al menos 10 términos.
- `7-documentation/onboarding.md` con un paso 1 reconocible.
- Al menos 20 ejemplos de código en bloques `typescript`, `tsx` o `javascript`.
- Placeholders sin completar (errores o advertencias según el caso).

### Output esperado

```
✅ SDD KIT - Reverse Validate
  ✅ Constitución
  ✅ Especificación funcional
  ⚠️  Arquitectura técnica — tiene placeholders sin completar
  ...

Progreso: 6 / 7 (85%)
Errores: 0 · Advertencias: 1
✅ Validación exitosa
```

---

## `sdd mcp-server`

Inicia el servidor MCP por stdio. No imprime banners ni logs en stdout.

```bash
sdd mcp-server
```

> Usado por Claude Desktop u OpenCode Desktop. No está pensado para invocación directa por humanos.

Más detalles en [`MCP.md`](MCP.md).

---

## Estado de comandos no implementados

| Comando | Estado |
|---------|--------|
| `sdd init --stack <stack>` | No soportado. El stack siempre se auto-detecta. |
| `sdd resume` | No soportado. Reanudar un feature se hace manualmente editando `state.json` o `meta.md`. |

---

## Convenciones

- Los nombres de feature y proyectos de reverse engineering usan **kebab-case**.
- Todos los comandos que requieren un proyecto inicializado devuelven un error claro si falta `.sdd/config.yml`.
- Los códigos de salida siguen la convención Unix:
  - `0` éxito.
  - `1` error de ejecución.
  - `2` validación/análisis fallido.
  - `3` validación pasada con advertencias.
- `state.json` es la fuente de verdad del estado; `meta.md` es una vista legible generada automáticamente.
