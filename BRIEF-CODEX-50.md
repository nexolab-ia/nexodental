# BRIEF-CODEX-50 — Fix serialización JSONB: reemplazar tx.json/sql.json por JSON.stringify::jsonb

**Producto:** NexoDental (dental.nexolabs.cloud).
**Origen:** bug sistémico descubierto en validación gatekeeper de BRIEF-CODEX-49 (2026-09-09). Guardar configuraciones (permisos, calendario, agenda online, organización) devuelve 500 `ERR_INVALID_ARG_TYPE: The "string" argument must be of type string or an instance of Buffer or ArrayBuffer. Received an instance of Object` en el runtime real (reproducido en `next start` local y consistente con la BD: `organizations.settings` nunca ha persistido permisos/calendar/agendaOnline — están `null`).
**Reglas fijas:** implementa MONOLÍTICAMENTE, sin delegar. Código/comentarios EN ESPAÑOL. NO commitees ni pushees: deja cambios locales. NO alteres lógica de negocio ni el bloqueo `locked` de BRIEF-CODEX-49 (ya en el working tree, no tocar su comportamiento). Respeta `DESIGN.md`.

## 1. Causa raíz

`postgres.js` expone `sql.json(x)` / `tx.json(x)` que envuelven el valor en un objeto `JsonValue` interno reconocido por `instanceof`. En el bundle de Next (dev y producción), el módulo de postgres.js queda duplicado entre chunks: el wrapper creado por la copia que ejecuta la server action NO es reconocido por el constructor de queries de la otra copia → el objeto llega como parámetro plano a `Function.str` → `ERR_INVALID_ARG_TYPE` (stack: `at Function.str ... at Array.forEach`).

El patrón que SÍ funciona en este repo (verificado en producción, usado desde BRIEF-CODEX-44-C-B/C-C en adelante, ej. `app/(app)/agenda/actions.ts`, `createPatient`): NO usar el wrapper; serializar con `JSON.stringify` y castear a jsonb en SQL:

```ts
// Antes (roto):  ... || jsonb_build_object('calendar', ${tx.json(calendar)}) ...
// Después (OK):  const j = JSON.stringify(calendar); ... || jsonb_build_object('calendar', ${j}::jsonb) ...
```

## 2. Alcance — archivos y qué reemplazar

Reemplaza **TODAS** las ocurrencias de `${tx.json(...)}` y `${sql.json(...)}` por el patrón `JSON.stringify(...)::jsonb` (variable intermedia `const j = JSON.stringify(x);` cuando sea necesario para legibilidad). Aplica a valores de columnas jsonb y a argumentos de funciones jsonb (`jsonb_build_object`, operador `||`). NO uses `::jsonb` donde el destino ya sea otro tipo (revisar contexto; en los archivos listados todos los destinos son jsonb).

1. `app/(app)/settings/organizacion/actions.ts` — 8 usos (`contact`, `schedule`, auditoría `before`/`after`).
2. `app/(app)/settings/agenda-online/actions.ts` — 6 usos (`agendaOnline` en ambos UPDATEs — el nuevo bloque `!enabled` y el flujo normal — y auditoría). **OJO:** hay dos bloques casi idénticos (rama desactivada ~línea 70 y rama activada ~línea 133); corrige AMBOS.
3. `app/(app)/settings/calendario/actions.ts` — 3 usos (`calendar` + auditoría).
4. `app/(app)/settings/permisos/actions.ts` — 3 usos (`permissions` + auditoría).
5. `features/operational-insights/actions.ts` — usos de `sql.json(...)` en `storeInsight` (columnas `evidence`, `action`) y `decideInsight` (columna `action`, payload de notificación, auditoría). Nota: el archivo está minificado en pocas líneas; reformatea solo lo necesario con cuidado de no romper lógica.
6. `features/notifications/integration.ts` y `features/notifications/jobs.ts` — `sql.json(payload)` en INSERT a `notifications.payload` (jsonb).
7. `features/csv-migration/pipeline.ts` — `sql.json(input.mapping)`, `sql.json({validRows...})`, `sql.json(row.normalized as never)` (columnas `mapping`, `validation`, `normalized` jsonb).
8. `features/csv-migration/reconcile.ts` — `sql.json({reconciliation...})` (operador `||` sobre `validation` jsonb).

Verifica con grep que no quede NINGUNA ocurrencia de `tx.json(` ni `sql.json(` en esos 8 archivos (ni en el resto de `app/`, `components/`, `features/`, `lib/` — si encuentras alguna más fuera de la lista, corrígela igual y menciónala en el reporte; si es un uso legítimo no-jsonb, justifícalo).

## 3. Criterios de aceptación (gatekeeper lo verifica después)

1. `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores nuevos.
2. `grep -rn "tx.json(\|sql.json(" app components features lib` = 0 coincidencias.
3. Sin cambios de comportamiento: mismas queries (salvo el mecanismo de serialización), mismos nombres de columna/clave, misma auditoría y redirects.
4. El bloqueo `locked` de BRIEF-CODEX-49 sigue funcionando igual (cliente + servidor).

## 4. Instrucción de entrega

Deja los cambios en el working tree (sin commit, trabajando SOBRE los cambios ya presentes de BRIEF-CODEX-49). Reporta: archivos tocados, nº de ocurrencias reemplazadas por archivo, cualquier ocurrencia extra encontrada, y desvíos con justificación breve.