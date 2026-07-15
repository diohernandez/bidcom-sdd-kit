# Driver: GSD Style

## Propósito

Orquestador orientado a *Get Shit Done*: mínima fricción, máxima velocidad, sin sacrificar el gate. Ideal para features pequeñas y equipos con baja tolerancia a ceremonia.

## Cuándo usarlo

- Features P0 con scope claro y bien acotado.
- Correcciones de bugs o deuda técnica localizada.
- Equipos experimentados donde las convenciones están internalizadas.

## Modelos por fase (default)

| Fase | Modelo sugerido | Razón |
|------|-----------------|-------|
| `functional` | `sonnet` | Suficiente para historias de usuario claras. |
| `technical` | `sonnet` | Diseño pragmático sin sobre-ingeniería. |
| `tasks` | `haiku` | Lista rápida de pasos. |
| `impl` | `sonnet` | Código con buen balance costo/calidad. |
| `validate` | `haiku` | Gate económico y repetible. |

## Trigger rules de delegación

1. **Inicio**: `sdd plan` → revisión humana opcional si la feature es < 3 archivos.
2. **Durante impl**: cada vez que se tocan ≥2 archivos no triviales, correr `sdd validate`.
3. **Cierre**: `sdd validate` + `sdd analyze` + commit.
4. **Post-push/PR**: `sdd validate` en CI con el mismo config.

## Heurísticas de velocidad

- Si la feature toca ≤2 archivos y no cambia la API pública, permitir saltar la fase `tasks`.
- Si el gate pasa en el primer intento, no solicitar revisión humana obligatoria.
- Priorizar corrección de errores de lint/type sobre optimizaciones.

## Anti-patrones

- No omitir `sdd validate` bajo ninguna circunstancia.
- No generar deltas que no reflejen requirements reales solo para acelerar.
