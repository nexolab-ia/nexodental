# BRIEF-CODEX-43-B — Fix: /agenda lanza error 500 (server action invocada durante el render)

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`. Código en **español, tuteo**. Respeta `DESIGN.md`.

## Diagnóstico (confirmado)

La ruta `/agenda` da **"Application error: a server-side exception"** (digest 1449766002); el resto de la app (dashboard, settings) carga bien. La causa raíz es un patrón prohibido en Next.js:

En `app/(app)/agenda/page.tsx`, el server component llama directamente a `getAgendaAppointments(...)` **durante el render**:

```ts
export default async function AgendaPage() {
  ...
  const initialAppointments = await getAgendaAppointments(iso1, iso2);   // ← server action en render
  ...
}
```

Pero `getAgendaAppointments` está definido en un archivo `"use server"` (`features/scheduling/agenda-actions.ts`) → es una **server action**. **Next.js prohíbe ejecutar server actions durante el render de un Server Component** (solo desde formularios/event handlers del cliente o invocadas como acción). Invocarla en render lanza la excepción de servidor.

(Nota: las queries SQL subyacentes funcionan — verificado contra el pooler. El problema es exclusivamente la invocación de la server action en render.)

## Fix requerido

Separar la **consulta** de la **server action**:

1. En `features/scheduling/agenda-actions.ts`:
   - Mantener `getAgendaAppointments` publicada (con su `"use server"`) tal cual, para que el **cliente** (`agenda-client.tsx`) la siga llamando al navegar entre días/semanas.
   - (O, si prefieres, extraer la query interna.)

2. En `app/(app)/agenda/page.tsx` (server component):
   - **NO llamar a la server action en render.**
   - En su lugar, ejecutar la **misma query** directamente con `runAsTenant(sql, actor, ...)` dentro del server component, replicando exactamente la query de `getAgendaAppointments` (mismas columnas, mismo `WHERE status <> 'cancelled' AND starts_at >= ... AND starts_at < ...`, mismo `ORDER BY starts_at`). Tipar el resultado como `AgendaAppointment[]` (importar el tipo de `agenda-actions.ts`) y convertir `startsAt/endsAt` a ISO igual que la action.
   - Calcular `from/to` igual que hoy (semana actual desde `santiagoDateKeyToUtc(monday)` a `+7 días`).

Opcional y equivalente: extraer la query a una función de dominio compartida (p. ej. `loadAgendaAppointments(sql, actor, from, to)` en un módulo `domain.ts` o `queries.ts` sin `"use server"`) que tanto page.tsx como getAgendaAppointments usen — así no se duplica SQL. **Prefiere esta opción** (DRY, reduce riesgo de divergencia).

## No hacer
- NO quitar `"use server"` de `getAgendaAppointments` (el cliente la necesita como server action).
- NO tocar el cliente (`agenda-client.tsx`), el CSS ni otras páginas.
- NO cambiar la API de `getAgendaAppointments`.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. `npm run lint` + `git diff --check` OK.
3. `npm run build` OK.
4. Confirmar textualmente que page.tsx ya NO invoca ninguna server action durante el render.
5. Reportar archivos tocados.

## Nota al gatekeeper (Hermes)
Tras deploy, revalidar `/agenda` en Chromium (debe cargar "Mi Calendario" sin error 500), vista Día + Semana, y que la navegación prev/Hoy/sig sigue re-consultando sin recargar la página (eso valida que la server action del cliente sigue viva).