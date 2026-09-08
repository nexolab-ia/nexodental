# BRIEF-CODEX-46 — Bloqueos de agenda (Settings → Agenda → Bloqueos)

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + CSS en `app/globals.css`. Código en **español, tuteo** (nunca voseo), fechas es-CL, zona Chile. Respeta `DESIGN.md`.

## Contexto

Desarrollar la pantalla **"Bloqueos de agenda"** en `/settings/bloqueos` (hoy es un placeholder). Sirve para **suspender fechas u horarios puntuales de toda la clínica o de un box, sin cambiar la disponibilidad general**. Incluye: listado de bloqueos con estado vacío, y un modal **"Nuevo bloqueo"** con calendario de selección de rango + configuración (qué se bloquea, motivo, duración, período, descripción).

**Lee `DESIGN.md` primero y respétalo.**

## Diagnóstico (verificado en código)

1. **Nav ya tiene "Bloqueos"** → `/settings/bloqueos` (icon `lock`, sección "Agenda") en `components/settings/settings-nav.tsx`.
2. **Placeholder** en `app/(app)/settings/[seccion]/page.tsx`: `SETTINGS_PLACEHOLDERS.bloqueos = { title: "Bloqueos", description: "Bloqueos de agenda por profesional, box o fecha." }`. Se crea página real (patrón `/settings/permisos`, `/settings/tipos-sesion`).
3. **No existe tabla de bloqueos** (verificado en BD). Hay que crear migración nueva (patrón tenant-scoped de `absences`/`boxes`).
4. **Patrón reutilizable de diálogo con calendario:** `components/settings/absences-dialog.tsx` (`AbsenceForm`) ya tiene: calendario de rango con `Seleccionar fechas`, radios "Día completo" / "Horario específico" con hours, botones **Cancelar / + Nueva**, y helpers (`calendarDays`, `addMonths`, `differenceInCalendarDays`, `iso`, `parseDate`, `formatRange`). **Reutilizar este patrón** para el diálogo de bloqueo, cambiando campos.
5. **Boxes:** tabla `boxes` (org, name, active). Para "Un box". **Motivo:** catálogo fijo (Reunión, Capacitación, Procedimiento, Permiso, Feriado, Mantención, Otro) según imagen.

## Diseño objetivo (de las capturas del usuario)

**Pantalla `/settings/bloqueos`:**
- Header: `<h1>Bloqueos de agenda</h1>` + `<p class="muted">Suspende fechas u horarios puntuales de toda la clínica o de un box, sin cambiar la disponibilidad general</p>`.
- Botón **"+ Nuevo bloqueo"** (`button-primary`) arriba a la derecha.
- Lista de bloqueos (si hay) o **estado vacío**: icono prohibición (círculo tachado) + "No hay bloqueos registrados" + "Crea un bloqueo para suspender la agenda en una fecha u horario específico".

**Modal "Nuevo bloqueo"** (patrón `<dialog>` nativo):
- Título "Nuevo bloqueo" + subtítulo "Suspende la agenda en una fecha u horario puntual sin cambiar la disponibilidad general".
- **Lado izquierdo:** calendario `Seleccionar fechas` (selección de rango múltiple, igual que absences).
- **Lado derecho:**
  1. **Qué se bloquea** (radios): `Toda la clínica` (default) / `Un box`. Si "Un box" → `<select>` "Selecciona un box" con los boxes activos.
  2. **Motivo** (dropdown): Reunión (default), Capacitación, Procedimiento, Permiso, Feriado, Mantención, Otro.
  3. **Duración del bloqueo** (radios): `Día completo` (default) / `Horario específico`. Si específico → campos `Hora inicio` / `Hora fin` (10:00 - 20:00 en la imagen).
  4. **Período seleccionado** (bloque informativo, abajo): "Selecciona el rango de fechas en el calendario" → al elegir, muestra "fecha a fecha · N días de bloqueo" (+ "desde las HH:MM hasta las HH:MM" si horario específico).
  5. **Descripción (opcional):** textarea, placeholder "Agrega detalles adicionales sobre el bloqueo...".
- Footer: **Cancelar** / **Crear bloqueo**.

## Migración nueva: `db/migrations/0013_agenda_blocks.sql`
Tabla tenant-scoped (patrón `absences`/`boxes`), como:
```sql
CREATE TYPE agenda_block_scope AS ENUM ('clinic','box');
CREATE TYPE agenda_block_reason AS ENUM ('meeting','training','procedure','permission','holiday','maintenance','other');
CREATE TABLE agenda_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope agenda_block_scope NOT NULL,
  box_id uuid REFERENCES boxes(id) ON DELETE CASCADE,          -- null si scope=clinic
  reason agenda_block_reason NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  all_day boolean NOT NULL DEFAULT true,
  starts_at time,
  ends_at time,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_on <= ends_on),
  CHECK (all_day OR (starts_at IS NOT NULL AND ends_at IS NOT NULL AND starts_at < ends_at)),
  CHECK ((scope = 'box' AND box_id IS NOT NULL) OR (scope = 'clinic' AND box_id IS NULL))
);
-- RLS FORCE + policy read_tenant (SELECT para roles activos) + policy write_manage (ALL para organization_admin/independent_owner)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON agenda_blocks TO nexodent_app;
CREATE INDEX agenda_blocks_scope_idx ON agenda_blocks (organization_id, starts_on, ends_on);
```
El gatekeeper aplica la migración vía Supabase tras el brief; el archivo .sql va en `db/migrations/`.

## Cambios requeridos (obligatorios)

### A. Server action de bloqueos
Nueva `app/(app)/settings/bloqueos/actions.ts` (`"use server"`):
- `getAgendaBlocks()` → listar los de la org (con `box_id`, `box.name` via LEFT JOIN boxes), order by `starts_on DESC`.
- `createAgendaBlock(input: { scope: 'clinic'|'box', boxId?: string|null, reason: ..., startsOn: string, endsOn: string, allDay: boolean, startsAt?: string|null, endsAt?: string|null, description?: string|null })` → `authorize(actor, "operations:manage")` o `"appointment:schedule"` (usar la capability que ya maneja agenda/operaciones; ver `authorize.ts` — `operations:manage` existe en admin/owner; **decidir: `operations:manage`**). INSERT + audit.
- `deleteAgendaBlock(id)` → borrar (authorize misma).
- **No pasar objetos Date/Objeto crudos a postgres.js** (regla del proyecto): fechas como strings; `starts_on/ends_on` = `${dateString}` (postgres acepta `'YYYY-MM-DD'` date); `starts_at/ends_at` = `${'HH:MM'}::time`; escapar correctamente. Registro en `audit_logs` con `JSON.stringify({...})::jsonb` (NO `tx.json(...)` directo — regla 44-C-C).

### B. Página `/settings/bloqueos`
- `page.tsx` (server): `requestTenantContext`, `getAgendaBlocks()`, y cargar `boxes` activos. Quitar `bloqueos` de `SETTINGS_PLACEHOLDERS` en `[seccion]/page.tsx`. Pasar data al componente cliente.
- Componente cliente (p. ej. `components/settings/blocks-page.tsx`): header + botón "+ Nuevo bloqueo" + lista o estado vacío + abre el diálogo.

### C. Diálogo "Nuevo bloqueo" (patrón absences-dialog)
- Reutilizar el calendario de rango y los radios de duración del `AbsenceForm`, pero con los campos de esta pantalla (Qué se bloquea, Motivo, Duración, Período, Descripción).
- Controles lineales y compactos (regla de Bryan), mismos tamaños.
- Al "Crear bloqueo": llamar `createAgendaBlock`, refrescar la lista, cerrar, mostrar notice. Errores visibles en el diálogo.

### D. Estilo (DESIGN.md)
- Clases nuevas en `app/globals.css`: `.blocks-header`, `.blocks-list`/`.block-card`, `.blocks-empty` (estado vacío con icono prohibición), `.block-dialog`, `.block-calendar`, `.block-fields`, `.block-period`, `.block-reason-select`, `.block-box-select` (radio condicional). Reutilizar clases `.settings-card`, `.form-row`, `.drawer-*`/`.absence-*` donde aplique para consistencia. Cian `--accent` único acción, botones 44px, `prefers-reduced-motion`.

## No hacer
- NO implementar la lógica que APLICA el bloqueo a la agenda (bloquear slots/ocultar disponibilidad). Este brief solo crea la **configuración/CRUD** de bloqueos; la aplicación en el calendario va en brief posterior.
- NO tocar otras páginas de settings ni romper el nav.
- NO instalar librerías.
- Tuteo, sin emoji (el icono prohibición es SVG).

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. `npm run lint` + `git diff --check` OK.
3. `npm run build` OK.
4. Confirmar que `/settings/bloqueos` ya NO muestra "En desarrollo", lista/crea/elimina bloqueos y el modal tiene los campos de la imagen.
5. Reportar archivos tocados + la capability usada.

## Nota al gatekeeper (Hermes)
Tras deploy: (1) aplicar la migración 0013 vía Supabase; (2) validar en Chromium con la demo: /settings/bloqueos muestra estado vacío + botón "+ Nuevo bloqueo", abrir → calendario rango → radios Qué se bloquea/Un box (select), Motivo dropdown, Duración (día completo/horario específico), período informativo, descripción → crear → aparece en la lista → recargar sigue; (3) crear uno "Un box" (Sala/box) y otro horario específico, verificar en BD; limpiar test después.