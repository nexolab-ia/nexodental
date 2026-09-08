# BRIEF-CODEX-38 — Feature "Ver ausencias" en Usuarios (ojo): modal de ausencias + registrar ausencia con persistencia

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, stack Next.js + Postgres (drizzle) + RLS por tenant. Código en **español, tuteo** (nunca voseo).

## Contexto

En `components/settings/members-page.tsx`, la tarjeta de cada miembro tiene un botón de **ojo** (`EyeIcon`, `aria-label="Ver detalle de <nombre>"`) cuyo título real debería ser **"Ver ausencias"**. Hoy es un placeholder: `onDetails={() => setNotice("Disponible pronto")}`.

Se construye el flujo completo **"Ver ausencias"** con la UI exacta del design de referencia (3 pantallas enviadas por Bryan) y **persistencia real** en una tabla nueva con RLS por organización.

## Design de referencia (obligatorio, replicar visualmente)

### Pantalla 1 — Estado del modal principal (vacío)
Modal titulado **"Ausencias de <Nombre>"**, subtítulo **"Gestiona las ausencias programadas"**. Ícono de calendario en el header (cuadro azul con pictograma blanco de calendario con una "x" en la esquina inferior derecha).
- **Estado vacío:** icono de calendario con "x" centrado + texto **"Este usuario no tiene ausencias registradas"**.
- **Footer:** botón primario **"+ Nueva Ausencia"** (azul brillante, a la izquierda) y botón secundario **"Cerrar"** (ghost, a la derecha).

### Pantalla 2 — Formulario "Nueva Ausencia"
Modal titulado **"Nueva Ausencia"**, subtítulo **"Registra una ausencia para <Nombre>"**, botón de cierre "X".

**Columna izquierda — widget de calendario `Seleccionar fechas`:**
- Navegación por mes/año (flechas `<` `>`, mes en formato p. ej. "September 2026", localizado es-CL), cabecera de días (Lu Ma Mi Ju Vi Sá Do), rejilla de días con los de meses contiguos atenuados.
- Selección de **rango de fechas** (clic inicial + clic final) resaltado en azul.

**Columna derecha — campos:**
- **`Tipo de ausencia`** (select): opciones exactas, en este orden: **Vacaciones, Licencia médica, Personal, Feriado, Otro**.
- **`Duración de la ausencia`** (radio): **Día completo** | **Horario específico**.
  - Si "Horario específico": mostrar además campos de hora (Hora inicio / Hora fin, inputs `time`).
- **`Período seleccionado`** (panel informativo): icono calendario + texto del rango seleccionado; placeholder **"Selecciona el rango de fechas en el calendario"** cuando aún no hay selección.
- **`Descripción (opcional)`**: textarea (placeholder "Agrega detalles adicionales sobre la ausencia...").
- **Footer:** **"Cancelar"** (outline) y **"Crear Ausencia"** (primario azul).

### Pantalla 3 — Con ausencias (estado con datos)
El modal principal lista las ausencias existentes del usuario (al menos: tipo, fechas, duración, descripción), cada una con acción de eliminar (icono papelera/✕). No está en las imágenes; implementar un listado limpio coherente con el dark design.

## Persistencia (obligatorio)

### Tabla nueva `absences` (db/schema + migración + RLS)
- Columnas mínimas: `id (uuid pk)`, `organization_id (uuid NOT NULL FK organizations ON DELETE CASCADE)`, `membership_id (uuid NOT NULL FK memberships id ON DELETE CASCADE)`, `absence_type` (varchar 40: vacation | medical_leave | personal | holiday | other), `starts_on (date)`, `ends_on (date)`, `duration` (varchar 16: full_day | specific_hours), `starts_at (time, nullable — solo horario específico)`, `ends_at (time, nullable)`, `description (text, nullable)`, `created_at`, `updated_at`.
- Constraint `absences_interval_valid`: si `specific_hours`, `starts_at < ends_at` y `starts_on = ends_on` (o documentar la regla elegida); validar en SQL y en app.
- Índices de scope: `(organization_id, membership_id)`.
- Seguir el patrón RLS exacto de `db/migrations/0010_patient_profile.sql`: policies por `current_setting('app.organization_id', true)::uuid`, con roles `organization_admin` / `independent_owner` para INSERT/UPDATE/DELETE y lectura para el tenant completo. NO crear personajes con BYPASSRLS.

### Acciones (server actions, patrón `features/scheduling/availability-actions.ts`)
- `getMemberAbsences(membershipId)` → lista de ausencias del miembro (autorizada por tenant/rol).
- `createMemberAbsence(membershipId, input)` → valida (tipo permitido, rango válido, duración), inserta con RLS y devuelve la fila.
- `deleteMemberAbsence(absenceId)` → borra (solo admin/owner).
- Conectar en `components/settings/members-page.tsx`: el botón ojo abre un nuevo **`AbsencesDialog`** (reutilizar patrón de `ScheduleDialog`: `<dialog>` nativo + `showModal`, backdrop, footer sticky) pasando el `name` e `id` del miembro.

## Criterios de aceptación (todos obligatorios)
1. Clic en el **ojo** de un usuario abre el modal **"Ausencias de <Nombre>"** (ya no "Disponible pronto").
2. Con cero ausencias muestra el estado vacío exacto de la referencia.
3. **"+ Nueva Ausencia"** abre el formulario con calendario de rango, tipo, duración, período seleccionado y descripción; **"Crear Ausencia"** persiste en BD y vuelve al modal con la ausencia listada.
4. Las ausencias creadas persisten y se cargan al reabrir (y para otros usuarios correctamente separadas por miembro).
5. Validaciones funcionan (rango requerido, duración/horas coherentes, tipos válidos).
6. Paleta dark coherente (fondos `#050b14`/`#080e1a`/`#0a1220`, acento `#3b82f6`, bordes `#162235`, radios 6px). Sin rediseñar el resto.

## No hacer
- NO tocar lógica/RLS de otras tablas ni las features de horarios/agenda existentes.
- NO usar `sleep` fijos en la UI; waits por estado.
- NO hardcodear datos de la demo en BD de forma permanente (solo en migración de seed si aplica, sin vulnerar RLS).
- Texto en español chileno, tuteo (nunca voseo).

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. ESLint focalizado + `git diff --check` OK.
3. `npm run build` OK.
4. Migración: verificar que aplica limpia sobre la BD (documentar pasos) y que las policies RLS quedan activas.
5. Reportar: archivos creados/modificados, SQL de la migración, y confirmar que el flujo end-to-end funciona (crear → listar → reabrir).

## Nota al gatekeeper (Hermes)
- Tras deploy, validar visualmente en Chromium real (login demo + usuarios + ojo → modal → crear ausencia → persistir). Verificar también que el "4 de 1 profesionales utilizados" no interfiera.