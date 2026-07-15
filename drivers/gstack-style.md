# Driver: gstack Style

## Propósito

Orquestador conservador y profundo, pensado para cambios que afectan la arquitectura o interfaces críticas. Prioriza el análisis previo y la documentación sobre la velocidad de entrega.

## Cuándo usarlo

- Cambios transversales que tocan ≥4 archivos o múltiples capas.
- Refactorings de core, cambios de framework, o migraciones.
- Features que introducen nuevas capabilities en `specs/`.

## Modelos por fase (default)

| Fase | Modelo sugerido | Razón |
|------|-----------------|-------|
| `functional` | `opus` | Entender completamente el problema y usuarios. |
| `technical` | `opus` | Diseño arquitectónico con múltiples alternativas. |
| `tasks` | `opus` | Planificación detallada con trazabilidad. |
| `impl` | `sonnet` | Implementación cuidadosa, iterativa. |
| `validate` | `sonnet` | Revisión crítica del gate y análisis de cobertura. |

## Trigger rules de delegación

1. **Inicio**: `sdd reverse init` o `sdd plan` + aprobación humana obligatoria.
2. **Durante diseño**: generar `delta/` completo antes de tocar código.
3. **Durante impl**: cada archivo nuevo o modificado debe tener ≥1 test unitario.
4. **Pre-merge**: `sdd validate` + `sdd analyze` + revisión de mutation score.
5. **Post-merge**: `sdd archive` para mergear deltas a `specs/`.

## Heurísticas de profundidad

- Si no se entiende el impacto en ≥3 capabilities, detenerse y hacer `sdd reverse analyze`.
- Si el delta introduce ≥5 requirements, dividir la feature.
- Si el mutation score cae >10%, invertir en tests antes de continuar.

## Anti-patrones

- No empezar a codear antes de tener `delta/` aprobado.
- No archivar una feature sin mergear sus deltas a `specs/`.
