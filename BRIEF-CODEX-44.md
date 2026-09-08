# BRIEF-CODEX-44 — Crear citas desde la Agenda (click en slot → "Agendar")

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + CSS en `app/globals.css`. Código en **español, tuteo** (nunca voseo), fechas es-CL, zona horaria Chile (`America/Santiago`).

## Contexto

La vista Agenda (`/agenda`, "Mi Calendario") ya es funcional en Día y Semana (briefs 43 y fixes 43-B/C/D) pero **solo muestra** citas. Esta fase añade la **creación**: al hacer clic en un slot vacío del grid aparece **"+ Agendar"** con su rango horario (ej. "10:00 - 10:30") y, al pulsarlo, se abre un **diálogo** para crear la cita. La acción `createAppointment` **ya existe** en `features/scheduling/actions.ts` (valida disponibilidad, evita solapamientos, registra audit + notificación).

**Lee `DESIGN.md` primero y respétalo.**

## Diagnóstico (verificado en código)

1. **Grid ya dibujado por media hora:** `features/scheduling/agenda-client.tsx` renderiza `.agenda-slot-grid` con `<span>` por slot de 30 min (`slots.map`). Esos spans son líneas decorativas; hay que volverlos **clicables** (click → preparar "+ Agendar" → diálogo).
2. **Duración configurable de bloques:** en `organizations.settings.calendar.blockDuration` (default 30). **Usar como duración default del slot a crear**, editable en el diálogo. Ver lectura en `app/(app)/settings/calendario/page.tsx` (patrón `settings?.calendar?.blockDuration ?? 30`).
3. **Pacientes reales:** tabla `patients` (`first_name`, `last_name`, `email`, `phone`, `rut`), tenant-scoped RLS. Se cargan para el autocompletado del selector.
4. **`createAppointment`** (en `actions.ts`) firma: `createAppointment(sql, actor, input)` con `input = { organizationId, siteId?, professionalMembershipId, boxId?, patientName, patientContact?, startsAt, endsAt, status?, source?, notes? }`. Requiere `patientName`, valida disponibilidad por profesional+site+weekday, e inserta con `status` default `confirmed`. **Requiere ampliar una server action** para llamarla desde el cliente (no está expuesta como server action actualmente).
5. **Slot de 30 min y blockDuration:** el grid está graduado a 30 min fijos (`halfHourHeight = 42`, slots de 30). El clic determina el `startsAt` (ese slot); `endsAt = startsAt + blockDuration` (editable en el diálogo, pudiendo ser distinto de 30). Si el usuario quiere distinta duración, puede cambiar el rango en el diálogo.

## Cambios requeridos (todos obligatorios)

### A. Server action para crear cita desde la agenda (nueva)
Nueva server action **`createAgendaAppointment`** (en un archivo `"use server"`, p. ej. `features/scheduling/agenda-create-actions.ts`, siguiendo patrón de `agenda-actions.ts`):
- Firma `(input: { professionalMembershipId, boxId?, patientId, patientName, patientContact?, startsAtIso, endsAtIso, siteId?, notes? })`.
- `requestTenantContext()`, y construir `AppointmentInput` para llamar a `createAppointment(sql, actor, { organizationId: actor.organizationId, ... })`.
- Convertir `startsAtIso`/`endsAtIso` a `Date` ANTES de `createAppointment` (¿pero eso reintroduce Date a postgres.js?). **Importante:** `createAppointment` internamente hace `INSERT ... ${input.startsAt}` (Date). Ese patrón YA es el que falló en producción (43-C). **No basta** llamarla: hay que asegurar que no rompa. Opciones:
  - (Preferida) En `createAgendaAppointment`, pasar `startsAt`/`endsAt` como **Date** pero construir el INSERT en la misma action con **strings ISO + `::timestamptz`** (NO reutilizar el bug). PERO `createAppointment` ya usa Date en su INSERT.
  - **Acción más segura:** refactorizar en `actions.ts` para que `createAppointment` y `reschedule`/`cancel` internamente serialicen `startsAt/endsAt` como **strings ISO con cast `::timestamptz`** (mismo arreglo 43-C), eliminando Date crudos de TODOS los parámetros que tocan postgres.js. Esto corrige el bug también para la creación. Mantener la firma pública igual (siguen aceptando Date) — solo cambia la serialización interna hacia la BD.
  - Hacerlo en un **mismo brief**: ajustar `actions.ts` (serialización ISO + `::timestamptz` en INSERT/UPDATE de appointments, y en `appointment_history` los `jsonb_build_object` con ISO strings, ya lo usan `.toISOString()`) y crear `createAgendaAppointment`.
- Devolver el `id` creado y/o un `{ ok: true, id }`. Sobre errores de validación/conflicto (SchedulingValidationError/ConflictError) devolverlos como mensaje al cliente (lanzar error que el diálogo muestre), no 500.

### B. Cargar pacientes + blockDuration en el server component
En `app/(app)/agenda/page.tsx`:
- Leer `settings.calendar?.blockDuration ?? 30` de `organizations.settings` (misma consulta que settings/calendario).
- Consultar pacientes: `SELECT id, first_name, last_name, email, phone FROM patients WHERE organization_id = ${actor.organizationId} ORDER BY first_name, last_name` (vía `runAsTenant`), armar una lista `{ id, name: \`${first_name} ${last_name}\`, email, phone }`.
- Pasar `patients`, `blockDuration` como props al `<AgendaClient>`.

### C. Cliente: slots clicables + "+ Agendar" + diálogo
En `features/scheduling/agenda-client.tsx`:
- Aceptar props nuevas `patients`, `blockDuration` (y los existentes).
- **Slot clicable:** en cada lane, superponer slots interactivos sobre `.agenda-slot-grid`: cada `<span>` (o un botón overlay oculto) con `onClick` que abre el diálogo de creación para ese slot. Al hacer clic: setear estado `createAt = { dateKey, startMinutes, endMinutes }`.
- **"+ Agendar":** en el slot recién clicado (o en hover), mostrar el chip `+ Agendar` centrado con `formatTime(starts)` – `formatTime(ends)` (blockDuration). Estilo similar a la imagen: texto cian (`--accent`), fondo azulado tenue (hover), y ocultar la línea now/estado vacío si aplica. El `+` tenue de los demás slots puede renderizarse como icono pequeño centrado al hover.
- **Diálogo de creación** (patrón `<dialog>` nativo + `showModal`, igual que `schedule-dialog.tsx`/`absences-dialog.tsx`; sticky footer):
  - Título: "Nueva cita".
  - **Paciente:** combobox/autocompletado con `patients` (buscar por nombre/email mientras se escribe; al seleccionar guarda `patientId` + `patientName`). Si el paciente no está en la lista se permite escribir nombre libre (el autocompletado es sugerencia, no restringe) — decidir y documentar; lo más útil: permitir también "paciente nuevo" con nombre de texto.
  - **Profesional:** fijo = el seleccionado en el toolbar (con su avatar), mostrado como dato (no editable) — o editable si se quiere, pero el slot ya está en el lane de ese profesional. Mostrar como texto informativo.
  - **Duración:** el rango `inicio – fin` calculado con `blockDuration` (default), con campos de hora (inicio/fin) editables (`<input type="time">`) para ajustar.
  - **Box:** `<select>` opcional con `boxes` (o "Sin box").
  - **Notas:** campo opcional.
  - Footer: `cancelar` (cierra) + `Guardar cita` (submit). Al guardar: llamar `createAgendaAppointment`, sobre éxito **recargar el rango actual** (`loadRange(date, view)` o re-set), cerrar el diálogo y mostrar notice de éxito. Sobre error, mostrar el mensaje en el diálogo (sin cerrar).
- Estados: `creating` (disable botones mientras corre), validación básica en cliente (paciente requerido, fin > inicio).

### D. Estilo (cumplir DESIGN.md)
- Clases nuevas en `app/globals.css`: `.agenda-create-slot`/`.agenda-agendar-chip` (hover overlay, texto cian, fondo ), `.agenda-appointment-dialog` (reusar patrón dialog del repo), slots activos con cursor pointer, `.agenda-create-inline` si aplica. Cian `--accent` único, botones 44px, `prefers-reduced-motion`.

### E. Interacciones que NO entran (esta fase)
- NO agregar editar/reagendar/cancelar de citas existentes desde la agenda (va en fase posterior; `rescheduleAppointment`/`cancelAppointment`/`confirmAppointment` ya existen pero no se conectan a clics aún).
- NO marcar asistencia ni bloques (kind block) — solo `appointment` normal por ahora (aunque `createAppointment` soporta status; el diálogo crea cita). Bloqueos se gestionan aparte (settings/bloqueos).

## No hacer
- NO tocar la vista Semana de forma destructiva (sí debe poder crear en slots de semana también si es natural; si complica, limitar la creación a la vista Día y dejar Semana solo lectura — **decidir y documentar**; sugerencia: habilitar en ambas, el slot determina la fecha).
- NO instalar librerías nuevas (combobox nativo con `<input list>` o lista filtrada simple en JS).
- Tuteo, sin em-dash, sin emoji.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. `npm run lint` + `git diff --check` OK.
3. `npm run build` OK.
4. Confirmar que en `actions.ts` ya NO se pasa ningún `Date` crudo como parámetro a postgres.js (todas las fechas serializadas ISO con `::timestamptz` o `::jsonb`), y que `createAgendaAppointment` funciona.
5. Reportar archivos tocados.

## Nota al gatekeeper (Hermes)
Tras deploy, validar en Chromium con la demo: en `/agenda` (vista Día, día con disponibilidad) clicar un slot vacío → aparece "+ Agendar" con el rango → diálogo de Nueva cita con autocompletado de pacientes, duración default = blockDuration, guardar → la cita aparece en el grid y persiste (verificar en BD con SELECT) → recargar página y sigue. Probar conflictos (cita en slot ya ocupado muestra error) y limpiar citas de prueba. Confirmar la serialización ISO no rompió createAppointment (crear una cita OK contra producción).