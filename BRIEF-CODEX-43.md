# BRIEF-CODEX-43 — Vista Agenda real (Cita: Día completo + Semana, sin creación)

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + CSS en `app/globals.css`. Código en **español, tuteo** (nunca voseo), fechas es-CL, zona horaria CHILE (`America/Santiago`).

## Contexto

Reemplazar el **mock actual** de la vista Agenda (`features/scheduling/agenda-client.tsx`, que hoy muestra columnas por sede con datos ficticios `· dato ficticio` y un formulario "Nueva cita") por una **vista de calendario real** conectada a la BD, en las vistas **Día** y **Semana**. La página ya es `app/(app)/agenda/page.tsx` → renderiza `<AgendaClient />`; se reconstruye el cliente (o el árbol de archivos que convenga) leyendo datos reales.

**Lee `DESIGN.md` primero y respétalo.**

## Diagnóstico (verificado en código y BD)

1. **Modelo de datos completo en BD** (migración `0003_scheduling_booking.sql`): tabla `appointments` (`id, organization_id, site_id, professional_membership_id, box_id, kind ['appointment'|'block'], status ['pending'|'confirmed'|'cancelled'], patient_name, patient_contact, starts_at timestamptz, ends_at timestamptz, notes, cancellation_reason`), `professional_availability`, `boxes`. RLS FORCE tenant-scope ya activa.
2. **Actions ya implementadas** (`features/scheduling/actions.ts`): `createAppointment`, `rescheduleAppointment`, `cancelAppointment`, `confirmAppointment`, `markAppointmentAttendance` — todas con autorización por rol y helpers de zona Chile. **NO se usan en esta fase (sin creación), pero EXISTEN para fases futuras**.
3. **Helpers de zona horaria** (`features/scheduling/domain.ts`): `SANTIAGO_TIMEZONE`, `localTime`, `localWeekday`, `santiagoLocalToUtc`, `santiagoOffsetMs`. Reutilizar.
4. **Lectura de miembros** (patrón en `app/(app)/settings/members/page.tsx`): `SELECT m.id, u.name, u.email, m.role::text, m.status FROM memberships m INNER JOIN users u ON u.id = m.user_id WHERE m.organization_id = ${actor.organizationId} AND m.status='active'` con `runAsTenant(sql, actor, tx => tx<...>` y `requestTenantContext()`. Selector de profesional usará esta query (solo profesionales/`professional` + independientes, o todos los "active" con rol que agenda — decidir: filtrar `role IN ('professional','independent_owner')` OR dejar todos los activos; el copy de citas es "por profesional", así que filtrar a roles que atienden: `professional`, `independent_owner`, y `organization_admin` que también atiende en clínica chica. **Decisión: mostrar los memberships `active` con rol en `('professional','independent_owner','organization_admin')`, ordenados por nombre**).
5. **El mock actual** `agenda-client.tsx`: vista `week` por defecto, lista de citas por sede (Providencia/Ñuñoa, ficticias), formulario reactivo "Nueva cita" con validación corrompida. Se SUSTITUYE por completo.

## Cambios requeridos (todos obligatorios)

### A. Arquitectura de la página
- `app/(app)/agenda/page.tsx` (server component nuevo): `requestTenantContext()`, cargar (vía `runAsTenant`):
  - **Profesionales**: query de memberships active con rol en los 3 de arriba, `ORDER BY u.name ASC` → id + nombre para el selector.
  - **Boxes**: `SELECT id, name FROM boxes WHERE organization_id = ... AND active ORDER BY name` (para el selector "Vista por Box" si aplica; la vista tiene toggle "Profesional/Box").
  - **Citas del rango**: para la vista Día (rango `[fecha,t fecha+1d)` en Santiago) y Semana (rango `[lunes, lunes+7d)`), de TODOS los profesionales (el filtro de profesional se hace en cliente con los datos ya cargados, para permitir cambiar sin recargar). Query: `SELECT id, site_id, professional_membership_id, box_id, kind, status, patient_name, patient_contact, starts_at, ends_at, notes FROM appointments WHERE organization_id = ${..} AND status <> 'cancelled' AND starts_at >= ${inicio} AND starts_at < ${fin} ORDER BY starts_at`. Convertir `starts_at/ends_at` a local Santiago para pintado.
- `features/scheduling/agenda-client.tsx` reescrito como **client component** recibe props `{ professionals, boxes, initialAppointments }` (datos serializables) y renderiza la vista.
- Eliminar el formulario "Nueva cita" (la creación va en fase siguiente). NO eliminar las actions `createAppointment` etc de `actions.ts` (se usan después).

### B. Estructura visual (según imagen "Mi Calendario")
Header (toolbar) superior:
- Izquierda: `<h1>Mi Calendario</h1>` + `<p class="muted">Fecha en es-CL largo</p>` (ej. "Martes, 8 de septiembre de 2026", con mayúscula de día correcta, no "De Septiembre" — **cumplir DESIGN.md regla 2.4**).
- Derecha, en fila:
  1. Etiqueta "Vista por" + **segmented control** `[Profesional] [Box]` (estado activo en cian `--accent`).
  2. **Selector** (según modo): si Profesional → dropdown de profesionales (avatar con iniciales + nombre); si Box → dropdown de boxes.
  3. **Segmented control de vista** `[Día] [Semana] [Global]`: Día y Semana funcionales; **Global** se renderiza como botón pero con `aria-disabled`/inactivo + tooltip o texto "Próximamente" (NO funcional esta fase). Estado activo en cian.
  4. **Picker de fecha** (icono calendario).
  5. **Navegación**: `<` , botón `Hoy` , `>` (cambia la fecha/mes).
- Sub-bar: fila con la fecha del día visualizado re-escrita + icono.

**Vista Día:**
- Eje de tiempo vertical: marcas de 30 min (00:00–24:00, o rango configurado si existe; por defecto mostrar 07:00–21:00 o el rango completo según `.settings.calendar.blockDuration`?? NO: blockDuration es para slots, no para el rango del eje. **Eje completo de 30 min, arrancando en la hora más temprana disponible del día (de `professional_availability` del profesional visible) hasta la más tardía + 1h**, mínimo 07:00–19:00).
- Cada cita se pinta como bloque posicionado sobre el grid: alto = `(ends-starts)/30min ×  alturaDeMediaHora`, top = offset según hora de inicio; color `--accent` bordes sutil, fondo enriquecido; `${patient_name}` + hora `${localTime}–${localTime}` + estado. `kind='block'` (bloque) se pinta distinto (más oscuro/sin paciente o texto "Bloque").
- **Línea roja de hora actual**: `--danger` `#f87171` (rojo semántico de estado/current), delgada 2px a la altura de `now()` en Santiago, con punto rojo en el eje. Recalcular cada ~60s.
- **Grid de 30 min**: líneas horizontales tenues (`--border`). El área de citas es una columna (vista PROFESIONAL individual: un solo lane para el profesional seleccionado). Si el modo es BOX, un lane por box.
- Slot vacío: sin acción esta fase (no crear).

**Vista Semana:**
- 7 columnas (Lun..Dom), header con día+mes es-CL, columna actual resaltada. Eje horario vertical igual que Día (30 min). Las citas se posicionan en su lane de día/profesional (o de box según modo).
- Misma línea de hora actual.

### C. Estado e interacción
- Estado local: `view ('day'|'week')`, `date` (Date, Santiago), `filterMode ('professional'|'box')`, `selectedProfessionalId`, `selectedBoxId` (defaults: primer profesional activo / primer box).
- Navegación `prev/Hoy/next`: mover `date` ±1 día (day) o ±1 semana (week, anclar al lunes); `Hoy` → fecha actual. **Requiere re-consultar citas del nuevo rango a la BD** (fetch al servidor / server action `getAgendaAppointments(org, from, to)` que devuelve las citas no canceladas del rango; llamar vía server action o re-hidratar). Preferir una **server action** `getAgendaAppointments` acotada (read) que la página/componente invoca al cambiar de rango manteniendo estado.
- Al cambiar profesional/box NO hace falta re-consultar (las citas ya están en el rango cargado, se filtran en cliente); basta filtrar por `professional_membership_id`/`box_id`.
- Semana: 7 days rutina de cálculo con aritmética local Santiago (utils existentes), sin dependencias nuevas de calendario (evitar librerías; aritmética Date sencilla).

### D. Estilo (cumplir DESIGN.md)
- Clases nuevas en `app/globals.css`: w/eje de tiempo, grid, bloques de cita, línea "ahora", segmented control, toolbar de agenda, lane de box/semana. Reutilizar tokens (`--surface`, `--border`, `--accent`, `--danger`). No introducir libs de calendario.
- Botones/toolbar compactos y parejos (regla de Bryan: económico), controles del mismo alto (~40px), texto 1 línea.
- Responsive razonable (semana se puede scrollear horizontal en mobile).

## No hacer
- **NO** implementar creación/edición de citas (click en slot, formulario). Esa es la fase siguiente (las actions `createAppointment` etc ya existen pero quedan sin uso vis.
- NO rediseñar otras páginas ni tocar el nav de settings.
- NO instalar dependencias nuevas de calendario (ni fullcalendar, ni dayjs si se puede evitar; si dayjs es estrictamente necesario para aritmética, justificar — preferir `Intl` + Date nativos).
- NO tocar `professional_availability`/`boxes`/migraciones (no hay cambio de schema; solo lectura).
- Tuteo, sin em-dash, sin emoji.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. ESLint focalizado + `git diff --check` OK.
3. `npm run build` OK.
4. Confirmar: `/agenda` muestra "Mi Calendario" con vista Día real y citas de la BD (si hay citas de la demo), Semana funcional, sin datos ficticios, sin formulario de creación.
5. Reportar archivos tocados (nuevos/eliminados) y estructura del cliente.

## Nota al gatekeeper (Hermes)
Tras deploy, validar en Chromium real con la demo (Dra. Emilia / Simón Mendoza): abrir `/agenda`, confirmar vista Día con eje horario y hora actual (línea roja), las citas reales pintadas (si las hay; sino verificar estado vacío "Sin citas"), cambiar día (prev/Hoy/sig), cambiar a Semana (7 columnas), cambiar profesional/box en el selector, y que "Global" quede inactivo. Verificar registro de citas REALES vía SQL si hace falta (limpiar datos de prueba después).