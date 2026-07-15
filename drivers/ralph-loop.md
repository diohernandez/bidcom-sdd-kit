# Driver: Ralph Loop

## Propósito

Orquestador de agentes diseñado para iteraciones cortas y revisión continua. Inspirado en el ciclo de pensamiento crítico de Ralph: planificar, ejecutar, validar, reflexionar.

## Cuándo usarlo

- Features que requieren múltiples iteraciones de refinamiento.
- Cuando el gate falla repetidamente y se necesita diagnóstico sistemático.
- Proyectos donde la calidad de la especificación es más importante que la velocidad.

## Modelos por fase (default)

| Fase | Modelo sugerido | Razón |
|------|-----------------|-------|
| `functional` | `opus` | Necesita comprensión profunda del problema y usuarios. |
| `technical` | `opus` | Arquitectura y trade-offs requieren razonamiento complejo. |
| `tasks` | `sonnet` | Equilibrio entre velocidad y precisión en la planificación. |
| `impl` | `sonnet` | Generación de código con contexto amplio. |
| `validate` | `haiku` | Rápido, económico, repetible. |

## Trigger rules de delegación

1. **Antes de escribir código**: el driver debe llamar a `sdd plan` y `sdd validate`.
2. **Después de cada commit**: ejecutar `sdd validate` y `sdd analyze`.
3. **Si el gate falla 2 veces seguidas**: pausar, pedir aclaración al humano, no iterar ciego.
4. **Antes de mergear**: `sdd validate` debe pasar con exit code 0.

## Recuperación de errores

- Si `sdd validate` devuelve exit code 1 (estructural): revisar specs y deltas.
- Si devuelve 2 (build): revisar dependencias y scripts.
- Si devuelve 3 (tests): agregar o corregir tests antes de continuar.
- Si devuelve 4 (mutation): evaluar si el threshold es realista o los tests son insuficientes.

## Anti-patrones

- No usar el driver para saltear el gate.
- No pedir al modelo que "decida" si un gate pasa: el motor decide, el driver orquesta.
