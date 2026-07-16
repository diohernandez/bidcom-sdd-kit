# MCP Reference

`sdd-kit` expone un servidor MCP (Model Context Protocol) que permite a Claude Desktop, OpenCode Desktop u otros clientes compatibles ejecutar workflows de Spec-Driven Development e inspeccionar el estado del proyecto sin salir del chat.

---

## Configuración

El servidor se inicia con:

```bash
sdd mcp-server
```

Usa `stdio` como transporte, por lo que el cliente MCP debe spawnear el proceso y comunicarse por stdin/stdout.

### Claude Desktop

Editá `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

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

La configuración es análoga; OpenCode detecta servidores MCP registrados en su configuración de escritorio:

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

> El servidor lee el proyecto desde el `cwd` del proceso. Si no se especifica `cwd`, el `projectPath` será el directorio desde el cual se spawneara `sdd`.

---

## Tools

Las tools son acciones que mutan o evalúan el estado del proyecto.

### `sdd_plan`

Crea la estructura de planificación para un feature.

**Input schema**

```json
{
  "featureName": "login-v2"
}
```

**Output**

Devuelve el contrato JSON `{ state, next_action, blockers }`.

```json
{
  "state": "funcional",
  "next_action": {
    "command": "sdd validate login-v2",
    "description": "Validar la especificación funcional"
  },
  "blockers": []
}
```

### `sdd_build`

Verifica que el feature esté listo para implementación.

**Input schema**

```json
{
  "featureName": "login-v2"
}
```

**Output (éxito)**

```json
{
  "state": "impl",
  "next_action": {
    "command": "sdd build login-v2",
    "description": "Implementar siguiendo TDD y correr sdd validate"
  },
  "blockers": []
}
```

**Output (bloqueado en fase `tasks`)**

```json
{
  "state": "tasks",
  "next_action": {
    "command": "sdd approve login-v2",
    "description": "Aprobar el plan técnico y la lista de tareas"
  },
  "blockers": [
    {
      "gate": "build",
      "check": "precondition",
      "detail": "El feature está en estado \"tasks\". Necesitás aprobar el plan primero: sdd approve login-v2"
    }
  ]
}
```

### `sdd_approve`

Aprueba el plan de un feature y lo pasa a fase `impl`.

**Input schema**

```json
{
  "featureName": "login-v2"
}
```

**Output (éxito)**

```json
{
  "state": "impl",
  "next_action": {
    "command": "sdd build login-v2",
    "description": "Implementar siguiendo TDD y correr sdd validate"
  },
  "blockers": []
}
```

### `sdd_validate`

Corre las validaciones de contenido de la fase actual del feature.

**Input schema**

```json
{
  "featureName": "login-v2"
}
```

**Output (con fallos)**

```json
{
  "state": "funcional",
  "next_action": {
    "command": "sdd validate login-v2",
    "description": "Validar la especificación funcional"
  },
  "blockers": [
    {
      "gate": "funcional",
      "check": "section:## 2. Objetivos",
      "detail": "La sección \"## 2. Objetivos\" todavía tiene texto de placeholder"
    }
  ]
}
```

### `sdd_reverse_init`

Inicializa un proyecto de ingeniería inversa.

**Input schema**

```json
{
  "projectName": "legacy-app"
}
```

**Output (éxito)**

```json
{
  "state": "constitution",
  "next_action": {
    "command": "sdd reverse analyze stack --project legacy-app",
    "description": "Analizar el stack tecnológico"
  },
  "blockers": []
}
```

### `sdd_reverse_analyze`

Ejecuta una fase de análisis de ingeniería inversa.

**Input schema**

```json
{
  "phase": "stack",
  "projectName": "legacy-app"
}
```

Valores permitidos para `phase`: `stack`, `architecture`, `integration`, `components`, `data-flow`, `testing`.

**Opcional: `seedSpecs`**

Podés pasar un string con requisitos funcionales de referencia para guiar la arquitectura o componentes:

```json
{
  "phase": "architecture",
  "projectName": "legacy-app",
  "seedSpecs": "R-001: Login por email\nR-002: OAuth2"
}
```

**Output (éxito)**

```json
{
  "state": "stack",
  "next_action": {
    "command": "sdd reverse status --project legacy-app",
    "description": "Ver el estado del análisis"
  },
  "blockers": []
}
```

### `sdd_analyze`

Analiza un feature en fase `impl` y devuelve un resumen determinístico.

**Input schema**

```json
{
  "featureName": "login-v2"
}
```

**Output (éxito)**

```json
{
  "state": "impl",
  "next_action": {
    "command": "sdd validate login-v2",
    "description": "Continuar implementación o validar"
  },
  "blockers": []
}
```

### `sdd_done`

Marca un feature como completado y lo archiva.

**Input schema**

```json
{
  "featureName": "login-v2"
}
```

**Prerequisitos**: fase `impl`, todas las tareas completadas, `gate-result.json` aprobado y sin rechazos.

**Output (éxito)**

```json
{
  "state": "done",
  "next_action": null,
  "blockers": []
}
```

### `sdd_specs_search`

Busca cobertura de requisitos entre el spec funcional y el task-list.

**Input schema**

```json
{
  "featureName": "login-v2"
}
```

**Output (con requisitos sin cubrir)**

```json
{
  "state": "impl",
  "next_action": {
    "command": "sdd specs-search login-v2",
    "description": "Agregar tareas para cubrir los requisitos faltantes"
  },
  "blockers": [
    {
      "gate": "specs",
      "check": "R-007",
      "detail": "Requisito R-007 no está asociado a ninguna tarea"
    }
  ]
}
```

### Errores comunes a todas las tools

Si el proyecto no está inicializado, cualquier tool devuelve:

```json
{
  "state": "unknown",
  "next_action": null,
  "blockers": [
    {
      "gate": "config",
      "check": "initialized",
      "detail": "El proyecto no está inicializado. Ejecutá: sdd init"
    }
  ]
}
```

El campo `isError` de la respuesta MCP será `true` en estos casos.

---

## Resources

Las resources son lecturas de estado. No mutan el proyecto.

### `sdd://status`

Devuelve el estado agregado de todos los features en `.sdd/wip/`.

**Ejemplo de contenido**

```json
{
  "success": true,
  "features": [
    {
      "featureName": "login-v2",
      "state": "funcional",
      "createdAt": "2026-07-14T19:37:08Z",
      "createdBy": "diohernandez",
      "tasks": { "total": 8, "done": 2 }
    }
  ],
  "summaryByState": {
    "funcional": 1
  }
}
```

### `sdd://reverse/{name}`

Devuelve el estado de un proyecto de reverse engineering puntual.

**Ejemplo**: `sdd://reverse/legacy-app`

```json
{
  "success": true,
  "project": {
    "summary": {
      "projectName": "legacy-app",
      "state": "constitution",
      "createdAt": "2026-07-14T19:37:08Z",
      "createdBy": "diohernandez"
    },
    "phases": [
      { "phase": "constitution", "description": "Constitución del proyecto", "completed": true },
      { "phase": "1-spec", "description": "Especificación funcional", "completed": false, "documentCount": 0 },
      ...
    ],
    "completed": 1,
    "total": 8,
    "percent": 12
  }
}
```

---

## Contrato JSON

Todas las tools devuelven un objeto con esta forma:

```typescript
interface ToolContract {
  state: string;
  next_action: {
    command: string;
    description: string;
  } | null;
  blockers: Array<{
    gate: string;
    check: string;
    detail: string;
  }>;
}
```

- `state`: fase actual del workflow (`funcional`, `tecnico`, `tasks`, `impl`, `constitution`, `stack`, etc.).
- `next_action`: siguiente comando sugerido para avanzar. Puede ser `null` si no hay un siguiente paso conocido.
- `blockers`: lista de checks que impiden avanzar. Vacía cuando todo está bien.

### Implementación actual

El contrato se construye leyendo `state.json` y `gate-result.json` reales del feature:

- `state` viene del campo `state` de `state.json`.
- `next_action` se decide a partir de la fase actual y el resultado de la última gate.
- `blockers` se extraen de `gate-result.json` (`checks` con `status: "blocked"` o `"failed"`) y de validaciones adicionales como specs search.

Esto elimina el parseo frágil de `meta.md` y garantiza que el estado visto por el agente MCP sea el mismo que el CLI.

---

## Ejemplo de sesión con Claude

```text
Usuario: planificá el feature checkout-v1

Claude: [llama a sdd_plan con { featureName: "checkout-v1" }]
        ✅ Feature creado. Estado: funcional.
        Próximo paso: sdd validate checkout-v1

Usuario: validalo

Claude: [llama a sdd_validate con { featureName: "checkout-v1" }]
        ❌ Faltan completar 2 secciones en el spec funcional.

Usuario: mostrame el estado de todos los features

Claude: [lee resource sdd://status]
        • checkout-v1 (funcional)
        • login-v2 (impl)
```

---

## Notas de seguridad

- El servidor no ejecuta código arbitrario del proyecto.
- Las tools solo leen/escriben dentro de `.sdd/`, `specs/` y archivos de manifiesto (`package.json`, `pyproject.toml`, etc.) necesarios para análisis.
- El comando `sdd mcp-server` no imprime banners ni logs en `stdout` para no romper el protocolo MCP.
