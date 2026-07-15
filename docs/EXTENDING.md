# Extending sdd-kit

`sdd-kit` está diseñado para ser extendido con nuevos detectores de stack, fases de análisis de ingeniería inversa y templates. Esta guía describe los puntos de extensión principales y da ejemplos concretos.

---

## Convenciones generales

- Todo el código nuevo está en `src/` y se compila con `yarn build`.
- Se siguen los principios de Clean Architecture: la lógica de negocio vive en `src/core/workflows/`, y los detalles de infraestructura (lectura de archivos, templates) en `src/services/` y `src/utils/`.
- Cada módulo exportable debe tener tests. Preferí TDD: test primero, implementación después.
- Los archivos de tests se organizan en `tests/unit/`, `tests/integration/` y `tests/e2e/` siguiendo el mismo árbol de `src/`.

---

## 1. Agregar un detector de stack

Los detectores viven en `src/services/detectors/`. `StackDetector` integra `LanguageDetector`, `FrameworkDetector` y `TestingDetector`.

### 1.1. Extender `LanguageDetector`

Para soportar un nuevo lenguaje, editá `src/types/stack.ts` y agregá el valor al union type `Language`, luego agregá la detección en `LanguageDetector.detect()`.

**Ejemplo: agregar `java`**

```typescript
// src/types/stack.ts
export type Language = 'typescript' | 'python' | 'go' | 'rust' | 'java' | 'unknown'
```

```typescript
// src/services/detectors/LanguageDetector.ts
import path from 'node:path'
import { fileExists } from '../../utils/fs.js'
import type { Language } from '../../types/stack.js'

export class LanguageDetector {
  async detect(projectPath: string): Promise<Language> {
    if (await fileExists(path.join(projectPath, 'package.json'))) return 'typescript'
    if (await fileExists(path.join(projectPath, 'requirements.txt'))) return 'python'
    if (await fileExists(path.join(projectPath, 'pyproject.toml'))) return 'python'
    if (await fileExists(path.join(projectPath, 'go.mod'))) return 'go'
    if (await fileExists(path.join(projectPath, 'Cargo.toml'))) return 'rust'
    if (await fileExists(path.join(projectPath, 'pom.xml'))) return 'java'
    if (await fileExists(path.join(projectPath, 'build.gradle'))) return 'java'
    return 'unknown'
  }
}
```

### 1.2. Extender `FrameworkDetector`

```typescript
// src/services/detectors/FrameworkDetector.ts
private async detectJavaFramework(projectPath: string): Promise<string | undefined> {
  const blob = await readJavaManifestBlob(projectPath)
  if (!blob) return undefined
  if (blob.includes('spring-boot')) return 'Spring Boot'
  if (blob.includes('jakarta.ws.rs')) return 'Jakarta REST'
  return undefined
}
```

Luego cableá la rama en `detect()`:

```typescript
if (language === 'java') return this.detectJavaFramework(projectPath)
```

### 1.3. Extender `TestingDetector`

Seguí el mismo patrón: leer manifiesto, buscar nombres de librerías conocidas, devolver un array de strings.

### 1.4. Agregar tests

```typescript
// tests/unit/services/detectors/LanguageDetector.test.ts
import { LanguageDetector } from '../../../../src/services/detectors/LanguageDetector.js'

describe('LanguageDetector', () => {
  it('detects java from pom.xml', async () => {
    const detector = new LanguageDetector()
    const language = await detector.detect('/tmp/fixtures/java-maven')
    expect(language).toBe('java')
  })
})
```

---

## 2. Agregar una fase de reverse engineering

Las fases de análisis de ingeniería inversa viven en `src/core/workflows/reverse/phases/`. Cada fase es una clase con un método `execute()` que devuelve `Promise<PhaseResult>`.

### 2.1. Separar análisis puro de renderizado

El patrón usado en `sdd-kit` es:

1. Un módulo `*Analysis.ts` con funciones puras que leen el código y devuelven datos.
2. Un `*Phase.ts` que carga el template, renderiza las variables y escribe el archivo.

**Ejemplo: nueva fase `performance`**

```typescript
// src/core/workflows/reverse/phases/performanceAnalysis.ts
export interface PerformanceAnalysis {
  bundleSize?: string
  lazyLoadedRoutes: string[]
  notes: string[]
}

export async function analyzePerformance(projectPath: string): Promise<PerformanceAnalysis> {
  // Leer next.config.js, cypress.config.ts, etc.
  return {
    lazyLoadedRoutes: [],
    notes: ['No se detectaron rutas lazy-loaded']
  }
}
```

```typescript
// src/core/workflows/reverse/phases/PerformancePhase.ts
import path from 'node:path'
import fs from 'fs-extra'
import { TemplateLoader } from '../../../../services/templates/TemplateLoader.js'
import { TemplateRenderer } from '../../../../services/templates/TemplateRenderer.js'
import type { PhaseResult } from '../../../../types/workflow.js'
import { analyzePerformance } from './performanceAnalysis.js'

export class PerformancePhase {
  constructor(
    private readonly templateLoader = new TemplateLoader(),
    private readonly templateRenderer = new TemplateRenderer()
  ) {}

  async execute(options: {
    projectName: string
    projectPath: string
    reversePath: string
    analyst: string
  }): Promise<PhaseResult> {
    const { projectPath, reversePath, analyst, projectName } = options
    const analysis = await analyzePerformance(projectPath)

    const template = await this.templateLoader.load(
      this.templateLoader.resolveStackFolder('typescript'),
      'reverse/performance'
    )

    const rendered = this.templateRenderer.render(template, {
      projectName,
      analyst,
      analysisDate: new Date().toISOString().slice(0, 10),
      lazyLoadedRoutes: analysis.lazyLoadedRoutes.join('\n'),
      notes: analysis.notes.join('\n')
    })

    const outputPath = path.join(reversePath, '8-performance', 'report.md')
    await fs.ensureDir(path.dirname(outputPath))
    await fs.writeFile(outputPath, rendered)

    return { success: true, outputPath }
  }
}
```

### 2.2. Registrar la fase en la CLI

Editá `src/cli/commands/reverse.ts` y agregá la fase al mapa `PHASE_CLASSES`:

```typescript
import { PerformancePhase } from '../../core/workflows/reverse/phases/PerformancePhase.js'

const PHASE_CLASSES: Record<string, new () => AnalysisPhase> = {
  stack: StackPhase,
  architecture: ArchitecturePhase,
  integration: IntegrationPhase,
  components: ComponentsPhase,
  'data-flow': DataFlowPhase,
  testing: TestingPhase,
  performance: PerformancePhase,
}
```

### 2.3. Registrar la fase en MCP (opcional)

Si querés que la tool `sdd_reverse_analyze` acepte la nueva fase, actualizá el enum en `src/mcp/tools/reverseAnalyzeTool.ts`:

```typescript
export type ReverseAnalyzePhase =
  | 'stack'
  | 'architecture'
  | 'integration'
  | 'components'
  | 'data-flow'
  | 'testing'
  | 'performance'
```

Y agregá `performance: PerformancePhase` en `PHASE_CLASSES`.

### 2.4. Agregar el template

Creá el archivo `templates/typescript/reverse/performance.md` y, si aplica, `templates/generic/reverse/performance.md` como fallback.

---

## 3. Agregar templates

Los templates usan sustitución simple de variables `{{variable}}`.

### 3.1. Estructura de carpetas

```
templates/
├── typescript/
│   ├── constitution.md
│   ├── functional-spec.md
│   ├── technical-spec.md
│   ├── task-list.md
│   ├── meta.md
│   └── reverse/
│       ├── constitution.md
│       ├── meta.md
│       ├── stack.md
│       └── ...
├── generic/
│   └── ...
└── python/
    └── ...
```

### 3.2. Variables disponibles

**Dev workflow** (`PlanWorkflow`):

| Variable | Origen |
|----------|--------|
| `{{featureName}}` | argumento del comando |
| `{{createdAt}}` | `new Date().toISOString()` |
| `{{createdBy}}` | git actor name |
| `{{createdByEmail}}` | git actor email |
| `{{language}}` | `config.stack.language` |
| `{{framework}}` | `config.stack.framework` |
| `{{styling}}` | `config.stack.styling` |
| `{{domain}}` | `config.domain` |
| `{{state}}` | `'funcional'` |

**Reverse workflow** (`ReverseWorkflow`):

| Variable | Origen |
|----------|--------|
| `{{projectName}}` | argumento del comando |
| `{{date}}` / `{{analysisDate}}` | fecha actual |
| `{{analyst}}` | git actor name |
| `{{createdAt}}` | fecha actual |
| `{{createdBy}}` | git actor name |
| `{{createdByEmail}}` | git actor email |
| `{{status}}` | `'draft'` |
| `{{state}}` | `'constitution'` |

### 3.3. Ejemplo de template nuevo

```markdown
<!-- templates/typescript/reverse/performance.md -->
# 8. Performance — {{projectName}}

Analista: {{analyst}}  
Fecha: {{analysisDate}}

## 1. Rutas lazy-loaded

{{lazyLoadedRoutes}}

## 2. Notas

{{notes}}
```

---

## 4. Agregar un comando CLI

Para agregar un comando nuevo, seguí el patrón de los comandos existentes:

1. Creá el archivo en `src/cli/commands/<comando>.ts`.
2. Exportá una función `register<Nombre>Command(program: Command)`.
3. Importala y registrála en `src/cli/createProgram.ts`.

### Ejemplo: `sdd hello`

```typescript
// src/cli/commands/hello.ts
import type { Command } from 'commander'

export function registerHelloCommand(program: Command): void {
  program
    .command('hello')
    .description('Saludo de ejemplo')
    .action(() => {
      console.log('Hola desde sdd-kit')
    })
}
```

```typescript
// src/cli/createProgram.ts
import { registerHelloCommand } from './commands/hello.js'

registerHelloCommand(program)
```

---

## 5. Agregar una tool MCP

Para exponer una nueva acción via MCP:

1. Implementá la lógica en `src/mcp/tools/<nombre>Tool.ts`.
2. Registrá la tool en `src/mcp/server.ts`.
3. Documentá el input/output en `docs/MCP.md`.

### Ejemplo: `sdd_hello`

```typescript
// src/mcp/tools/helloTool.ts
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export interface HelloToolInput {
  name: string
}

export async function runHelloTool(input: HelloToolInput): Promise<CallToolResult> {
  return {
    content: [{ type: 'text', text: `Hola ${input.name}` }],
    isError: false
  }
}
```

```typescript
// src/mcp/server.ts
import { runHelloTool } from './tools/helloTool.js'

server.registerTool(
  'sdd_hello',
  {
    description: 'Saludo de ejemplo',
    inputSchema: { name: z.string() }
  },
  (args) => runHelloTool(args)
)
```

---

## 6. Tests

- **Unitarios**: probar funciones puras y clases in-memory (ej. `*Analysis.ts`, `TemplateRenderer`).
- **Integración**: probar workflows contra un directorio temporal.
- **E2E**: probar la CLI vía `createProgram()` in-process o spawnear `node ./bin/sdd.js`.

### Fixture mínimo para un test de integración

```typescript
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'

async function createTempProject(): Promise<string> {
  const dir = path.join(os.tmpdir(), `sdd-test-${Date.now()}`)
  await fs.ensureDir(dir)
  await fs.writeJson(path.join(dir, 'package.json'), { name: 'test-project' })
  return dir
}
```

---

## 7. Cosas a evitar

- No pongas lógica de negocio en `src/cli/commands/`. Los comandos solo parsean argumentos, llaman al workflow y renderizan output.
- No hagas `console.log` en `src/cli/commands/mcpServer.ts`: corrompe el protocolo MCP.
- No agregues dependencias pesadas sin considerar el bundle. `sdd-kit` se instala globalmente.
- No asumas que el proyecto está en `typescript`: usá el stack detectado para elegir templates y analyzers.

---

## 8. Recursos útiles

- `src/types/stack.ts` — tipos de stack.
- `src/types/workflow.ts` — `PhaseResult` y `WorkflowResult`.
- `src/services/templates/TemplateLoader.ts` — carga de templates con fallback a `generic/`.
- `src/core/workflows/reverse/phases/StackPhase.ts` — referencia de fase de reverse.
- `tests/integration/workflows/` — ejemplos de tests de workflows reales.
