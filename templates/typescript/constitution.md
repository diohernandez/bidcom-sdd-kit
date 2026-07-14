# Constitución del Proyecto: {{projectName}}

## 📋 Metadata

| Campo | Valor |
|-------|-------|
| Proyecto | {{projectName}} |
| Fecha | {{date}} |
| Autor | {{author}} |
| Estado | {{status}} |

## 🎯 Propósito

Esta constitución establece los principios no negociables que gobiernan el desarrollo de features en este proyecto bajo Spec-Driven Development. Se aplica a toda la secuencia `funcional → tecnico → tasks → impl → done`.

## 📜 Artículos de la Constitución

### Artículo I: Principio de Completitud

Ninguna fase (`funcional`, `tecnico`, `tasks`) se da por cerrada con placeholders sin completar. El gate estructural (`sdd validate`) lo verifica antes de permitir la transición de estado.

**Gate de Validación**:
- [ ] ¿Todas las secciones requeridas están completas?
- [ ] ¿No quedan placeholders (`[...]`, `TODO`) sin resolver?

### Artículo II: Principio de Trazabilidad

Toda historia de usuario de la especificación funcional se traduce en al menos un Requirement formal (`R-NNN`) en el delta técnico, y todo Requirement se traduce en al menos una tarea. `sdd analyze` valida esta cadena de forma determinística.

### Artículo III: Principio de Ejecutabilidad

La especificación técnica y la lista de tareas deben ser suficientemente concretas para que una implementación (humana o de un agente de IA) pueda ejecutarlas sin inventar decisiones de arquitectura no documentadas.

### Artículo IV: Principio de Claridad

El lenguaje de las especificaciones prioriza ser entendible por cualquier miembro del equipo, no solo por quien las escribió.

### Artículo V: Principio de Consistencia

La implementación sigue los estándares de código y arquitectura ya establecidos en el proyecto (ver `AGENTS.md`), no introduce convenciones nuevas sin justificación explícita.

### Artículo VI: Principio de Pragmatismo

Se prioriza la solución más simple que cumple los Requirements por sobre la más elegante en abstracto. No se diseña para necesidades hipotéticas.

### Artículo VII: Principio de Gate Determinístico

`sdd validate` corre sin ninguna llamada a un LLM: es 100% determinístico y reproducible en CI. La IA participa en la autoría y orquestación, nunca en decidir si el gate pasa.

## 🎯 Criterios de Éxito

- Toda feature que llega a `done` pasó los 4 gates (`funcional`, `tecnico`, `tasks`, `impl`) sin excepciones manuales.
- `specs/` refleja siempre el estado vivo real del sistema, sin deriva respecto al código.

## 🔄 Proceso de Enmienda

Cambios a esta constitución requieren una entrada en el historial de cambios y no aplican retroactivamente a features ya archivadas.

## 📝 Historial de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| {{date}} | Creación inicial | {{author}} |
