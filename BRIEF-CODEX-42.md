# BRIEF-CODEX-42 — Pantalla "Calendario" en Configuración (duración de bloques)

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + CSS en `app/globals.css`. Código en **español, tuteo** (nunca voseo), fechas es-CL.

## Contexto

Se implementa la pantalla **"Calendario"** en Configuración (`/settings/calendario`): configura la **duración de los bloques de tiempo** que usa el calendario para agendar citas. Es la primera pieza de la configuración del calendario; el valor se persiste en la organización para que luego la agenda lo use.

**Lee `DESIGN.md` primero y respétalo.**

Navegación decidida con el usuario: en `components/settings/settings-nav.tsx`, sección "Agenda", el ítem actual `{ key: "calendario", href: "/agenda", label: "Calendario", icon: "calendar" }` apunta a la **vista** del calendario. Se **renombra** ese ítem a **"Agenda"** (`href: "/agenda"`, label "Agenda", icon `calendar`) y se **agrega un ítem nuevo "Calendario"** (`href: "/settings/calendario"`, label "Calendario", icon `clock` o el que corresponda) como entrada de configuración. Mantener ambos: "Agenda" (vista) y "Calendario" (configuración) en la misma sección.

## Diagnóstico (verificado en código)

1. **No existe la página:** no hay carpeta `app/(app)/settings/calendario/`. El placeholder actual lo atraparía si existiera como clave, pero NO agregar `calendario` a `SETTINGS_PLACEHOLDERS` — se crea página real (patrón de `/settings/permisos` y `/settings/organizacion`).
2. **Nav:** `settings-nav.tsx` sección "agenda" tiene el ítem `calendario → /agenda` (ver Contexto). El icono `clock` ya existe en `iconPaths` (usado por "Tipos de Sesión").
3. **Persistencia:** settings de organización en jsonb `organizations.settings` vía server action con `COALESCE(...) || jsonb_build_object(...)` + `audit_logs`. Referencia exacta: `app/(app)/settings/organizacion/actions.ts` (updateOrganizationSchedule) y `app/(app)/settings/permisos/actions.ts` (updatePermissions).

## Cambios requeridos (todos obligatorios)

### A. Navegación (`components/settings/settings-nav.tsx`)
- Renombrar el ítem de la vista: `{ key: "agenda", href: "/agenda", label: "Agenda", icon: "calendar" }`.
- Agregar ítem nuevo de configuración justo antes o después: `{ key: "calendario", href: "/settings/calendario", label: "Calendario", icon: "clock" }`.
- Mantener el resto de la sección "agenda" intacto (Bloqueos, Agenda Online, Notificaciones, Tipos de Sesión, Box).

### B. Página `/settings/calendario`
- Crear `app/(app)/settings/calendario/page.tsx` + `actions.ts`, siguiendo patrón de `permisos/`.
- Estructura visual exacta (rediseñada de la imagen):
  - `<main>` con `<header>`: `<h1>Calendario</h1>` y `<p class="muted">Administra la configuración de bloques del calendario</p>`.
  - Banner opcional de éxito con `?ok=calendario` (patrón `notice-banner`).
  - Un `<section class="settings-card">` titulado **"Configuración de Bloques de Calendario"** con icono de reloj a la izquierda del `<h2>`, y `<p class="muted">Define la duración de los bloques de tiempo para citas</p>`.
  - Dentro, una sola opción en fila tipo "row" (como `.permission-row` pero no es toggle):
    - **Título/field label:** "Duración de bloques" en negrita.
    - **Descripción:** "Define cuántos minutos durará cada bloque de tiempo en el calendario para agendar citas".
    - **Control a la derecha:** un `<select>` (o dropdown) con las opciones **15 minutos, 30 minutos, 45 minutos, 60 minutos**.
  - Footer: botón único **"Guardar cambios"** (`button-primary`, min-height 42-44px).

### C. Persistencia
- Clave nueva en `organizations.settings`: `calendar = { blockDuration: number }` (minutos). Default si no existe: `30`.
- Server action `updateCalendarSettings(formData)`: `authorize(actor, "organization:manage")`, leer el `blockDuration` del select (validar que sea uno de `{15, 30, 45, 60}`), `UPDATE ... || jsonb_build_object('calendar', ${tx.json({ blockDuration })})`, INSERT en `audit_logs` (action `settings.calendar_updated` o `organization.updated`, reason `settings.calendar`), `redirect("/settings/calendario?ok=calendario")`.
- En `page.tsx` leer `settings.calendar?.blockDuration ?? 30` como defaultValue del select.

### D. Estilo (cumplir DESIGN.md)
- Reutilizar `.settings-card` existente.
- Para la fila "Duración de bloques" y el select: crear clases pequeñas si hace falta (`.calendar-setting-row` reutilizando el patrón de `.permission-row` sin switch; y un `select` estilizado consistente con los selects existentes del repo — borde `--border`, focus ring `--accent`, fondo `--surface`).
- Un solo botón de acción en cian `--accent`. Tuteo, sin em-dash, sin emoji.

## No hacer
- **NO** implementar la lógica que usa `blockDuration` en la agenda (renderizado de bloques, creación de citas). Este brief SOLO crea la **configuración + persistencia** del valor. La aplicación funcional va en brief posterior.
- NO tocar otras páginas de settings ni el `settings-nav` fuera de la sección "agenda" (el cambio de los 2 ítems).
- NO tocar `schedule-toggle`, `schema`, ni tablas de BD (no hay migración: se usa jsonb de organizations).
- Tuteo, sin em-dash, sin emoji.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. ESLint focalizado + `git diff --check` OK.
3. `npm run build` OK.
4. Confirmar que `/settings/calendario` resuelve a la página nueva (no placeholder) y que el nav muestra "Agenda" y "Calendario" en la sección Agenda.
5. Reportar archivos tocados.

## Nota al gatekeeper (Hermes)
Tras deploy, validar en Chromium real con la demo (Dra. Emilia): abrir `/settings/calendario`, ver la sección "Configuración de Bloques de Calendario" con select "30 minutos", cambiar a otro valor, "Guardar cambios", recargar y confirmar que persiste en `organizations.settings.calendar.blockDuration`. Verificar que "Agenda" (vista) y "Calendario" (config) estén ambos en el menú.