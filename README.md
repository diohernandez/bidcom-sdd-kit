# sdd-kit

> Spec-Driven Development Toolkit — CLI + MCP server for Claude Code and OpenCode, with reverse-engineering support for existing codebases.

`sdd-kit` convierte los workflows manuales de especificación, planificación, implementación e ingeniería inversa en un paquete ejecutable tanto desde terminal como desde agentes de IA compatibles con MCP.

---

## Qué incluye

- **CLI unificada** (`sdd`) para init, plan, build, validate, status y reverse.
- **MCP Server** con tools y resources para Claude Desktop / OpenCode Desktop.
- **Detección automática de stack** TypeScript/Python/Go/Rust.
- **Templates** para especificaciones funcionales, técnicas, listas de tareas y documentación de ingeniería inversa.
- **Validadores** de contenido para cada fase del workflow.

---

## Instalación

### Desde npm (cuando se publique)

```bash
npm install -g sdd-kit
```

### Desde el repo local

```bash
git clone <repo-url> bidcom-sdd-kit
cd bidcom-sdd-kit
yarn install
yarn build
```

Para usar el binario localmente sin instalar globalmente:

```bash
node ./bin/sdd.js --help
```

---

## Requisitos

- Node.js >= 18.0.0
- Yarn >= 4 (usando `nodeLinker: node-modules`)

---

## Quick start

### 1. Inicializar un proyecto

```bash
cd mi-proyecto
sdd init [--name mi-proyecto]
```

Crea la estructura `.sdd/` con `config.yml`, y detecta el stack automáticamente.

### 2. Planificar un feature

```bash
sdd plan login-v2
```

Genera:

```
.sdd/wip/login-v2/
├── meta.md
├── 1-functional/spec.md
├── 2-technical/spec.md
└── 3-tasks/task-list.md
```

Editá los specs y la lista de tareas, luego validá:

```bash
sdd validate login-v2
```

### 3. Pasar a implementación

Cuando el plan esté aprobado (fase `impl`):

```bash
sdd build login-v2
sdd validate login-v2
```

### 4. Ingeniería inversa de un proyecto existente

```bash
sdd reverse init legacy-app
sdd reverse analyze stack --project legacy-app
sdd reverse analyze architecture --project legacy-app
sdd reverse status --project legacy-app
sdd reverse validate legacy-app
```

---

## Configuración MCP

### Claude Desktop

Agregá este servidor en `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sdd-kit": {
      "command": "sdd",
      "args": ["mcp-server"],
      "cwd": "/ruta/al/proyecto"
    }
  }
}
```

### OpenCode Desktop

```json
{
  "mcpServers": {
    "sdd-kit": {
      "command": "sdd",
      "args": ["mcp-server"]
    }
  }
}
```

> El comando `sdd mcp-server` no debe escribir nada en stdout fuera del protocolo JSON-RPC. No levanta banners ni logs.

Más detalles en [`docs/MCP.md`](docs/MCP.md).

---

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `yarn build` | Compila TypeScript a `dist/` |
| `yarn dev` | Compila en modo watch |
| `yarn test` | Ejecuta tests con Jest (ESM) |
| `yarn test:coverage` | Ejecuta tests con cobertura |
| `yarn lint` | Corre ESLint sobre `src/` |
| `yarn lint:fix` | Auto-arregla problemas de lint |
| `yarn format` | Formatea con Prettier |
| `yarn format:check` | Verifica formato sin modificar |

---

## Estructura del proyecto

```
sdd-kit/
├── bin/sdd.js              # Entry point CLI
├── src/
│   ├── cli/                # Comandos y UI de terminal
│   ├── core/workflows/     # Lógica de negocio (init, plan, build, validate, reverse)
│   ├── services/           # Detectors, analyzers, templates
│   ├── mcp/                # MCP server, tools y resources
│   ├── types/              # Tipos TypeScript
│   └── utils/              # Utilidades (fs, config, frontmatter, git)
├── templates/              # Templates por stack (typescript, generic, python, go)
├── tests/                  # Tests unitarios, integración y e2e
└── docs/                   # Documentación del proyecto
```

---

## Documentación

- [`docs/CLI.md`](docs/CLI.md) — Referencia completa de comandos.
- [`docs/MCP.md`](docs/MCP.md) — Configuración y contrato de tools/resources.
- [`docs/EXTENDING.md`](docs/EXTENDING.md) — Cómo agregar detectores, analyzers y templates.

---

## Estado del proyecto

`sdd-kit` está en desarrollo activo. Las Fases 1–7 del plan (setup, estructura, detección de stack, templates, workflows, CLI y MCP server) están implementadas y testeadas. Ver `.bidcom/wip/sdd-kit/3-tasks/task-list.md` en el repo `website` para el estado detallado del plan.

---

## Licencia

UNLICENSED — Uso interno de Bidcom.
