# REPORTE-CODEX-50 — Corrección de serialización JSONB

## Resultado

Se reemplazaron todas las interpolaciones con `tx.json(...)` y `sql.json(...)` por valores serializados con `JSON.stringify(...)` y casteados explícitamente con `::jsonb`.

## Archivos modificados

| Archivo | Reemplazos |
| --- | ---: |
| `app/(app)/settings/organizacion/actions.ts` | 8 |
| `app/(app)/settings/agenda-online/actions.ts` | 6 |
| `app/(app)/settings/calendario/actions.ts` | 3 |
| `app/(app)/settings/permisos/actions.ts` | 3 |
| `features/operational-insights/actions.ts` | 5 |
| `features/notifications/integration.ts` | 1 |
| `features/notifications/jobs.ts` | 2 |
| `features/csv-migration/pipeline.ts` | 3 |
| `features/csv-migration/reconcile.ts` | 1 |
| **Total** | **32** |

## Ocurrencias adicionales

No se encontraron ocurrencias fuera de los archivos enumerados en el brief.

## Verificación

- `npx tsc --noEmit`: correcto.
- `npm run lint`: correcto.
- `npm run build`: correcto. Next.js emitió únicamente la advertencia preexistente sobre la convención obsoleta de `middleware`.
- `grep -rn "tx.json(\|sql.json(" app components features lib`: cero coincidencias.
- `git diff --check`: correcto.

## Desvíos

Ninguno. No se modificó la lógica de negocio, los nombres de columnas o claves, las auditorías, los redirects ni el comportamiento del bloqueo `locked` incorporado por BRIEF-CODEX-49.

## Entrega

Los cambios quedan locales en el working tree, sin commit ni push, sobre los cambios preexistentes de BRIEF-CODEX-49.
