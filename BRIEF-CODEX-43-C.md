# BRIEF-CODEX-43-C — Fix: /agenda 500 por serialización de Date en postgres.js

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`. Código en **español, tuteo**. Respeta `DESIGN.md`.

## Diagnóstico (confirmado con panel de errores de Vercel)

`/agenda` sigue dando **500 "server-side exception"** (digest 1449766002) AUN tras el fix 43-B. El panel de errores de runtime de Vercel revela la causa real:

```
TypeError: The "string" argument must be of type string or an instance of Buffer or ArrayBuffer. Received an instance of Date
code: 'ERR_INVALID_ARG_TYPE'  (routes=/agenda)
```

**postgres.js falla al serializar un objeto `Date` como parámetro** cuando lo recibe por el pooler transaccional de producción (config `prepare: false`, `connect_timeout: 5`). El stack apunta a `Function.str` del serializador de postgres.js. Esto ocurre en la query de agendas en `features/scheduling/agenda-queries.ts` (y en menor medida con objetos en settings jsonb, cluster "Received an instance of Object" en permisos/calendario).

Nota: en desarrollo local la misma query con `Date` funciona (el entorno de bundling de Vercel difiere en cómo se detecta el tipo). La solución robusta es **no pasar objetos `Date` como parámetro a postgres.js**: pasar strings ISO y castear con `::timestamptz` en el SQL.

## Fix requerido

En `features/scheduling/agenda-queries.ts`, función `loadAgendaAppointments`:

1. Cambiar la firma para recibir los rangos como **string ISO** (no `Date`):
   ```ts
   export async function loadAgendaAppointments(actor: TenantContext, startsAtIso: string, endsAtIso: string): Promise<AgendaAppointment[]>
   ```
2. En la query, sustituir `${startsAt}`/`${endsAt}` por el string con cast:
   ```ts
   AND starts_at >= ${startsAtIso}::timestamptz AND starts_at < ${endsAtIso}::timestamptz
   ```
3. Validar antes que `startsAtIso`/`endsAtIso` son fechas parseables (`!Number.isFinite(new Date(x).getTime())` → throw) y que `startsAtIso < endsAtIso` (mantener la validación de rango máx 8 días que ya existía en la server action).

En `features/scheduling/agenda-actions.ts` (`getAgendaAppointments`, server action del cliente):
- Ya recibe `from`/`to` como string ISO. Actualizar la llamada: `return loadAgendaAppointments(actor, startsAt.toISOString(), endsAt.toISOString())` (o pasar `from`/`to` directamente si ya son ISO válidos — revisar; el contrato actual hace `new Date(from)` para validar, así que pasar `.toISOString()` de esos Date es lo más limpio).

En `app/(app)/agenda/page.tsx` (server component):
- `loadAgendaAppointments` ahora espera strings ISO. Actualizar la llamada:
  ```ts
  const initialAppointments = await loadAgendaAppointments(actor, santiagoDateKeyToUtc(monday).toISOString(), santiagoDateKeyToUtc(addLocalDays(monday, 7)).toISOString());
  ```

Verifica que NO quede ningún `${algunaFecha(Date)}` como parámetro sin cast en la query de agendas ni en los update jsonb de settings (si un `${tx.json(...)}` se usa con objeto funciona; el problema es Date; los settings ya usan `tx.json` que sí serializa). Si hay algún otro Date pasado crudo a postgres.js, conviértelo a string ISO con cast o a `tx.json`.

## No hacer
- NO quitar `"use server"` de `getAgendaAppointments` (el cliente la usa).
- NO tocar `agenda-client.tsx` ni CSS.
- NO cambiar la API pública de `getAgendaAppointments(from: string, to: string)` (el cliente ya la llama con strings).

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. `npm run lint` + `git diff --check` OK.
3. `npm run build` OK.
4. Confirmar textualmente que en la query SQL de agenda NO se pasa ningún objeto `Date` crudo a postgres.js (solo strings con `::timestamptz` o `tx.json`).
5. Reportar archivos tocados.

## Nota al gatekeeper (Hermes)
Tras deploy, revalidar `/agenda` en Chromium: debe cargar "Mi Calendario" sin 500, Día + Semana, y la navegación prev/Hoy/sig re-consultando sin recargar. Confirmar también que `/settings/permisos` y `/settings/calendario` no tienen 500 al guardar (el cluster "Object" debería desaparecer).