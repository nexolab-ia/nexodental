# BRIEF-CODEX-43-D — Fix: getAgendaAppointments falla al navegar (startsAt.toISOString is not a function)

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`. Código en **español, tuteo**. Respeta `DESIGN.md`.

## Diagnóstico (confirmado con panel de errores de Vercel + Chromium)

La vista `/agenda` ya carga sin 500 (fix 43-C resolvió el error de `Date` en la query). PERO al **navegar** (cambiar de día/semana), la server action del cliente falla con:

```
TypeError: a.startsAt.toISOString is not a function  (routes=/agenda, digest 338602887)
at _.map  →  dentro de loadAgendaAppointments
```

**Por qué:** en `features/scheduling/agenda-queries.ts`, `loadAgendaAppointments` hace
`rows.map((row) => ({ ...row, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString() }))`.
Cuando el rango consultado **tiene citas**, `row.startsAt` NO es un objeto `Date` válido en el runtime de producción (el pooler/transpilador entrega el valor timestamptz de otra forma) → `.toISOString` no existe. La carga inicial (semana actual sin citas → 0 filas) no entra al map, por eso esa primera carga sí funciona y la navegación a días con citas revienta.

## Fix requerido (mínimo)

En `features/scheduling/agenda-queries.ts`, dentro de `loadAgendaAppointments`, el `map` final debe convertir las fechas con **`new Date(...)`** (acepta tanto `Date` como string ISO parseable) en vez de llamar `.toISOString()` directamente:

```ts
return rows.map((row) => ({
  ...row,
  startsAt: new Date(row.startsAt).toISOString(),
  endsAt: new Date(row.endsAt).toISOString(),
}));
```

También como defensa, castear en el SELECT las columnas a texto (opcional pero recomendado para blindar en runtime): `starts_at::text AS "startsAt"` y `ends_at::text AS "endsAt"` seguido del mismo `new Date(...)` del map. Si eliges el cast a `::text`, `row.startsAt` será `"2026-09-04 13:00:00+00"` y `new Date("2026-09-04 13:00:00+00")` lo parsea; verificar formato. **Prefiere el cast `::text` + `new Date`** para no depender del tipo que entregue el driver.

Mantén el resto del archivo igual (firma de strings ISO, validación, cast `::timestamptz` en el `WHERE` ya implementado en 43-C).

## No hacer
- NO tocar `agenda-client.tsx`, CSS ni la API pública de `getAgendaAppointments`.
- NO alterar la validación del rango.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. `npm run lint` + `git diff --check` OK.
3. `npm run build` OK.
4. Confirmar que el `map` de `loadAgendaAppointments` usa `new Date(...)` (o cast a texto) en lugar de `.toISOString()` directo sobre el row.
5. Reportar archivos tocados.

## Nota al gatekeeper (Hermes)
Tras deploy, revalidar en Chromium: /agenda carga, **navegar prev/Hoy/sig a un rango CON citas** (p. ej. 3-4 de septiembre, que tienen citas seed) debe pintar los bloques sin error, en Día y Semana, y cambiar profesional/box sin romper.