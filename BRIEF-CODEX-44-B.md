# BRIEF-CODEX-44-B — Diálogo "Nueva Cita" rediseñado (tipo de sesión, duración agrupada, resumen) + catálogo de tipos de sesión

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + CSS en `app/globals.css`. Código en **español, tuteo** (nunca voseo), fechas es-CL, zona horaria Chile. Respeta `DESIGN.md`.

## Contexto

El brief 44 ya implementó la **creación base** de citas en la agenda (click en slot → "+ Agendar" → diálogo simple con paciente/box/notas; validado: crea cita real en producción). Ahora se rediseña el **diálogo de Nueva Cita** para que coincida con el diseño entregado por el usuario (imágenes) y se añade un **catálogo de tipos de sesión** configurable:

- Diálogo con: profesional (pre-seleccionado), **buscar o crear paciente**, **Tipo de sesión** (dropdown, cada tipo con su duración por defecto), **Sala/Box** (con estado), **Duración agrupada** (Cortas 15-45min / Estándar 1-2h / Largas 2h15-4h, con "Finaliza HH:MM"), **notas** opcional, y un **panel "Resumen de cita"** lateral que muestra horario, profesional y box. Botones **Cancelar** / **Crear cita**.

## Estado actual (verificado en código)

1. **Diálogo actual** en `features/scheduling/agenda-client.tsx` (componente `AgendaCreateDialog`, líneas ~102-144): solo tiene Paciente (autocompletado), Profesional (texto), Hora inicio/término (time), Box (select), Notas. Se REEMPLAZA/augmenta por el diseño completo.
2. **Catálogo de tipos de sesión NO existe:** la tabla `sessions` de la BD es de **Better Auth** (tokens de sesión), NO es el catálogo clínico. Hay que crear tabla nueva `session_types`.
3. **Nav de settings** ya tiene "Tipos de Sesión" → `/settings/tipos-sesion`, actualmente **placeholder** ("En desarrollo"). Se crea página real.
4. **createAppointment** (`features/scheduling/actions.ts`) ya acepta `notes`, valida disponibilidad, inserta con ISO `::timestamptz`. No guarda tipo de sesión aún.

## Cambios requeridos (obligatorios)

### A. Migración nueva: `session_types` (catálogo de tipos de sesión)
Nueva migración **`0012_session_types.sql`** (aplicarla vía MCP Supabase como las anteriores), siguiendo el patrón tenant-scoped de `convenios`/`boxes`:
```sql
CREATE TABLE session_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  duration_minutes smallint NOT NULL CHECK (duration_minutes BETWEEN 10 AND 240),
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
-- RLS FORCE tenant-scope + política read (todos los roles activos) y write (organization_admin/independent_owner)
-- GRANT a nexodent_app de las operaciones
```
- Nota: solo UNO puede ser `is_default` por organización (usar índice único parcial `WHERE is_default`). El default es el que se usa al abrir el diálogo.
- **Decisión (obligatoria, fijada):** añadir `session_type_id uuid REFERENCES session_types(id)` (nullable) a `appointments` **en la migración 0012**, y guardarlo al crear la cita. El grid puede mostrar el tipo de sesión como badge/texto extra en la tarjeta de cita si es barato; mínimo: persistirlo. Incluir `session_type_id` en la query de detalle y pasarlo por el cliente/`AgendaAppointment`.

### B. Pantalla en settings: Tipos de Sesión (`/settings/tipos-sesion`)
- Crear `app/(app)/settings/tipos-sesion/page.tsx` + `actions.ts` (patrón de organizacion/permisos): listar, crear, editar (nombre + duración), activar/desactivar, marcar default.
- Quitar la entrada `tipos-sesion` de `SETTINGS_PLACEHOLDERS` en `[seccion]/page.tsx`.
- UI: tabla/lista de tipos existentes (nombre, duración "30 min", default, activo, acciones) + formulario/`dialog` para añadir/editar, y selector para marcar el default. Cian como acento, botones 44px, tuteo.

### C. Página de agenda: cargar tipos de sesión
En `app/(app)/agenda/page.tsx`, cargar `session_types` activos de la org: `SELECT id, name, duration_minutes AS "durationMinutes", is_default AS "isDefault" FROM session_types WHERE organization_id = ... AND active ORDER BY is_default DESC, name` y pasarlos al `<AgendaClient>` (prop `sessionTypes`).

### D. Diálogo rediseñado (en `agenda-client.tsx`)
Rediseñar `AgendaCreateDialog` para coincidir con el diseño:
- **Header:** título "Nueva cita" + fecha (es-CL largo) + botón cerrar.
- **Columna izquierda (campos):**
  1. **Profesional** (pre-seleccionado, se muestra con avatar+nombre, no editable — o editable según tu gusto; sugerencia: mostrar como dato del slot).
  2. **Paciente:** autocompletado existente (buscar pacientes reales o escribir nombre nuevo). Mantener.
  3. **Tipo de sesión:** `<select>` con los `sessionTypes` + una opción "Sin tipo específico". Cada opción muestra `Nombre · NN min`. Al elegir uno, **ajustar automáticamente la duración** a `duration_minutes` de ese tipo (salvo que el usuario cambie la duración manualmente después).
  4. **Sala / Box:** `<select>` con `boxes` + "Sin box" + indicador de estado (los activos con badge verde). Actualmente boxes no tienen columna de estado en la UI; usar `active` (ya filtrado en la query del server component, solo activos).
  5. **Duración (con el patrón de tu imagen):** selector desplegable agrupado en 3 categorías:
     - **Cortas:** 15, 30, 45 min
     - **Estándar:** 1 h (60), 1 h 30 (90), 2 h (120)
     - **Largas:** 2 h 15 (135), 3 h (180), 4 h (240)
     - Mostrar para cada opción "NN min" + "Finaliza HH:MM" calculado desde la hora de inicio.
     - Cuando se elige un tipo de sesión, preseleccionar su duración; el usuario puede cambiarla.
     - La hora de inicio la marca el slot clicado. El "Finaliza" se calcula = inicio + duración.
  6. **Notas (opcional):** textarea.
- **Panel lateral derecho "**Resumen de cita**:**
  - Horario: `10:00 – 10:30 · 30 min`
  - Profesional: nombre
  - Sala/Box: nombre o "Sin box"
  - (opcional) Tipo de sesión
  - Actualizar en vivo conforme el usuario cambia duración/tipo/box.
- **Footer:** botones **Cancelar** (cierra) y **Crear cita** (submit; label "Crear cita"; deshabilitado mientras `creating`).
- Al guardar: llamar `createAgendaAppointment` (mantener la action existente; si se añadió `session_type_id`, ampliar el input y el INSERT). Sobre éxito: recargar rango, cerrar, notice. Sobre error: mostrar en el diálogo.
- Ajustar la hora de inicio: el diálogo recibe `createAt.startMinutes` (hora del slot). La hora de inicio es editable (time) o fija al slot (sugerencia: fija al slot, la duración define el fin — decidir y documentar; lo natural al clicar un slot es fijar el inicio).

### E. Estilo (DESIGN.md)
- Clases nuevas: `.agenda-dialog-body` (grid 2 columnas en desktop: campos | resumen), `.agenda-dialog-summary`, `.agenda-session-type-select`, `.agenda-duration-select` (agrupado con `<optgroup>`), badges de estado, panel resumen con fondo `--surface-2` y bordes `--border`. Cian `--accent` único, botones 44px, `prefers-reduced-motion`. Responsive: en mobile el resumen va debajo de los campos.

## No hacer
- NO romper la creación existente (44) que ya funciona; rediseñar el diálogo, no reescribir el grid ni el resto del cliente.
- NO tocar la tabla `sessions` de auth ni la auth de Better Auth.
- NO instalar librerías (select nativo + `<optgroup>`; el resumen es cálculo simple de minutos→hora, usar helpers existentes `timeFromMinutes`/`formatTime`).
- Tuteo, sin em-dash, sin emoji.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. `npm run lint` + `git diff --check` OK.
3. `npm run build` OK.
4. Migración aplicada y replicable (el archivo `.sql` en `db/migrations/`).
5. Reportar archivos tocados + la decisión sobre `session_type_id` en appointments.

## Nota al gatekeeper (Hermes)
Tras deploy: (1) aplicar la migración vía Supabase; (2) en Chromium: abrir `/agenda` → click en slot → "+ Agendar" → diálogo con tipo de sesión, duración agrupada con "Finaliza", panel resumen lateral; elegir tipo (ajusta duración), elegir duración distinta (actualiza resumen/fin), elegir box; crear la cita y verificar que aparece en el grid y persiste (SELECT en BD); (3) `/settings/tipos-sesion` permite añadir/editar/activar/marcar default un tipo y ese aparece en el diálogo; (4) limpiar citas de prueba.