# BRIEF-CODEX-47 — Aplicar bloqueos de agenda al calendario (días tachados con motivo)

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + CSS en `app/globals.css`. Código en **español, tuteo** (nunca voseo), fechas es-CL, zona Chile. Respeta `DESIGN.md`.

## Contexto

La pantalla de **Bloqueos de agenda** (Settings → Bloqueos, brief 46) ya crea registros en la tabla `agenda_blocks`. Ahora falta **aplicarlos al calendario**: los días/horarios bloqueados deben **tacharse en el grid de la agenda** ("Mi Calendario") con un patrón rayado diagonal + etiqueta del motivo, igual a la imagen de referencia: el día completo bloqueado se ve con sombreado rayado y el texto del motivo (ej. "Reunión", "No disponible") + rango horario (ej. "10:00 - 20:00 (600 min)").

**Lee `DESIGN.md` primero y respétalo.**

## Diagnóstico (verificado en código)

1. **Tabla `agenda_blocks`** (brief 46): `scope` (`clinic`|`box`), `box_id` (null si clinic), `reason` (`meeting|training|procedure|permission|holiday|maintenance|other`), `starts_on`/`ends_on` (date), `all_day`, `starts_at`/`ends_at` (time, null si all_day), `description`. RLS tenant con read para todos los roles activos.
2. **`app/(app)/agenda/page.tsx`** (server component) carga profesionales, boxes, availability, patients, convenios, sessionTypes, y **`initialAppointments`** (semana actual). Para aplicar bloqueos: **cargar también los `agenda_blocks` del rango** (`starts_on <= rangoFin AND ends_on >= rangoInicio`) y pasarlos al `<AgendaClient>`.
3. **`AgendaClient`** (`features/scheduling/agenda-client.tsx`) renderiza lanes por día (`.agenda-day-lane`) y pinta citas posicionadas. Además hoy muestra un `.agenda-empty` si no hay citas. Los bloqueos deben pintarse como **overlay en el lane** del día (tachando el rango horario).
4. **Y resultados visuales previos:** ya existe `.agenda-appointment.is-block` (bloques de tipo block en appointments) con rayado. Pero estos son DISTINTOS: los de `agenda_blocks` marcan días/horarios de clínica completa o de un box, y deben tachar aunque no haya cita.

## Comportamiento objetivo (de la imagen)

- Un bloqueo `all_day` de un día tacha **todo el eje horario visible de ese día** (desde `startMinutes` hasta `endMinutes` del grid) con rayado diagonal + etiqueta del motivo en el header del día o sobre el lane.
- Un bloqueo de **horario específico** (`all_day=false`) tacha solo el rango `starts_at`–`ends_at` dentro de ese día.
- **Scope:**
  - `scope='clinic'`: aplica a TODOS los lanes (profesionales o boxes) ese día.
  - `scope='box'`: aplica solo al lane de ESE box (en la vista por box). En vista por profesional, un bloqueo de box no tacha el lane del profesional (a menos que se decida lo contrario; documentar — decisión: en vista por profesional solo aplican los de clinic).
- La etiqueta del bloqueo: icono de prohibición (SVG) + **label del motivo** ("Reunión", "Capacitación", "Procedimiento", "Permiso", "Feriado", "Mantención", "Otro" — mapear de REASON_LABELS ya usado en blocks-page) y, si cuadra, el rango horario cuando no es all_day.

## Cambios requeridos (obligatorios)

### A. Cargar bloqueos en la página de agenda
En `app/(app)/agenda/page.tsx` (server component), cargar `agenda_blocks` del rango visible:
- Query: `SELECT id, scope::text AS scope, box_id AS "boxId", reason::text AS reason, starts_on::text AS "startsOn", ends_on::text AS "endsOn", all_day AS "allDay", starts_at::text AS "startsAt", ends_at::text AS "endsAt" FROM agenda_blocks WHERE organization_id = ${actor.organizationId} AND starts_on <= ${fin} AND ends_on >= ${inicio}` (los `::date` desde las strings ISO del rango; usar string + cast, NO objetos Date crudos a postgres.js — regla del proyecto). Pasarlo como prop `blocks` al `<AgendaClient>`.
- El rango visible es la semana actual (monday→+7d), igual que appointments. Aclarar: los bloqueos se cargan para la **semana completa** (que es el rango default); al navegar (cambiar de semana/día) también deben recargarse junto con las citas.

### B. Cliente: pintar bloqueos en el grid
En `features/scheduling/agenda-client.tsx`:
- Aceptar prop `blocks: AgendaBlock[]` (tipo con `scope, boxId, reason, startsOn, endsOn, allDay, startsAt, endsAt`).
- En el render de cada lane (día), para cada día del rango `days`, encontrar los bloqueos que aplican:
  - Día aplica si `startsOn <= day <= endsOn` (comparar strings YYYY-MM-DD).
  - Un bloqueo `clinic` aplica a todos los lanes.
  - Un bloqueo `box` aplica solo si `filterMode === "box"` y `selectedBoxId === bloqueo.boxId` (o en vista global box, si el lane es ese box). En vista por profesional, ignorar los de box.
- Para el bloqueo aplicable a ese lane/día: renderizar un **overlay** (como `.agenda-block-overlay`) con:
  - Ancho de todo el lane, y alto según: `all_day` → desde `startMinutes` hasta `endMinutes` del grid; horario específico → desde `startsAt` hasta `endsAt` (convertir a minutos relativos al grid).
  - Fondo `repeating-linear-gradient` diagonal gris (patrón rayado) + transparencia, ocupando la columna.
  - Etiqueta centrada/arriba: icono prohibición SVG + motivo label + (si no es all_day) "HH:MM - HH:MM (N min)".
  - El overlay NO es clicable para crear (intercepta el click; el slot queda "no disponible"). Si se hace click, no abrir el diálogo de creación (o mostrar aviso "Día bloqueado").
- Mantener las citas que ya existan en esa fecha (los bloqueos y citas conviven; el bloqueo se pinta debajo/atrás). Si el usuario quiere que los bloqueos "cancelen" citas existentes eso sería otra regla; esta fase solo **marca visualmente** el día/horario.
- La línea "ahora" y el grid siguen igual.

### C. Refrescar bloqueos al navegar
- Cuando cambia el rango (día/semana vía `loadRange`), recargar también los bloqueos del nuevo rango (una server action read `getAgendaBlocksForRange(fromIso, toIso)` o reutilizar la carga; ajustar `loadRange` para disparar ambas).

### D. Estilo (DESIGN.md)
- Clases nuevas en `app/globals.css`: `.agenda-block-overlay` (position absolute, inset según top/height, `pointer-events` para bloquear click si corresponde), `.agenda-block-stripes` (repeating-linear-gradient gris), `.agenda-block-tag` (badge con motivo, cian/`--accent` texto, fondo `--surface-2`), y la etiqueta de rango. Evitar que el rayado tape la leyenda/citas de forma ilegible (usar opacidad moderada ~0.5-0.7 o el rayado sobre el fondo `--surface-2`).
- Respetar `prefers-reduced-motion`, tokens.

## No hacer
- NO tocar la pantalla de settings/bloqueos (46) ni la tabla.
- NO eliminar/ocultar citas existentes al pintarse un bloqueo (solo overlay visual).
- NO instalar librerías.
- Tuteo, sin emoji (el icono prohibición es SVG).

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. `npm run lint` + `git diff --check` OK.
3. `npm run build` OK.
4. Confirmar que los bloqueos del rango se cargan y se pintan como overlay rayado en el día (all_day cubre todo el eje; horario específico cubre su rango), con el label del motivo, tanto en vista Día como Semana y Global, y que `scope box` solo tacha el box correcto.
5. Reportar archivos tocados + decisiones (aplicar clinic en profesional; box solo en box).

## Nota al gatekeeper (Hermes)
Tras deploy, validar en Chromium con la demo: crear en BD (o en settings) bloqueos de prueba: (1) all_day clinic "Reunión" para el 9 sep, (2) horario específico clinic para otro día, (3) all_day box en un box. En la agenda, esos días deben verse tachados con rayado y motivo (¡igual a la imagen: "Reunión", "No disponible"), en Día/Semana/Global, y el de box solo en vista por box. Verificar que no se pueda crear cita en un slot bloqueado visiblemente (o al menos que el overlay esté). Limpiar bloqueos de prueba después.