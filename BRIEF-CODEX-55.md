# BRIEF-CODEX-55 — Pantalla Box (Configuración → Agenda → Box) alineada a referencia Bryan

**Producto:** NexoDental. Ruta: `/settings/box` (hoy es un placeholder de la ruta dinámica `[seccion]`).
**Origen:** Bryan (2026-09-09), imagen de referencia `img_3d822f4a259c.jpg` + decisiones confirmadas: (1) fase 1 **sin asignación real** box↔usuarios — la lista muestra "Todos los usuarios" estático; la asignación por usuario es fase posterior; (2) **lista plana** de todos los box de la clínica (sin agrupar por sucursal).
**Reglas fijas:** implementa MONOLÍTICAMENTE, sin delegar. Copy EN ESPAÑOL, tuteo. NO commitees ni pushees. Respeta `DESIGN.md` y tokens de `app/globals.css`. Working tree limpio (BRIEF-CODEX-54 pusheado).

## 1. Contexto y modelo (no crear migración)

La tabla `boxes` YA existe (migración 0003): `id, organization_id, site_id uuid NULL REFERENCES sites, name varchar(120), active boolean default true, timestamps, UNIQUE NULLS NOT DISTINCT (organization_id, site_id, name)`. Datos demo de la org: "Box Cordillera" (site Providencia) y "Box Mapocho" (site Ñuñoa), ambas `active`. NO agregues columnas ni tablas en esta fase.

## 2. Pantalla (referencia: título "Box", subtítulo "Gestiona los box disponibles en tu clínica", botón "+", checkbox "Ocultar deshabilitados" marcado, filas: nombre + asignación + editar/desactivar)

Misma estructura/patrón visual que la pantalla Tipos de Sesión recién construida (BRIEF-CODEX-54: `app/(app)/settings/tipos-sesion/` con `page.tsx` server + `session-types-manager.tsx` client + `actions.ts`). Réplica con clases `box-*` (o reutiliza clases compartidas si el rename es trivial — decide y documenta; NO dupliques CSS si puedes compartir).

### A) `app/(app)/settings/box/page.tsx`
Server component: `requestTenantContext` + `runAsTenant`, SELECT `id, name, active` (y `site_id` solo si lo necesitas para ordenar) desde `boxes WHERE organization_id = ... ORDER BY active DESC, name ASC`. Render `<BoxManager items=... />` con header idéntico al patrón: `<h1>Box</h1>` + muted "Gestiona los box disponibles en tu clínica".

### B) `app/(app)/settings/box/box-manager.tsx` (client)
- Card header: título "Box" (o sección "Box"), subtítulo *"Gestiona los box disponibles en tu clínica"*, botón "+" / "Añadir box" (patrón Tipos de Sesión).
- **"Ocultar deshabilitados"** checkbox sobre la lista, marcado por defecto → filtra `active=false`; al desmarcar aparecen atenuadas (clase `is-disabled` como en tipos-sesion).
- Tabla/lista: fila = **nombre** del box + texto **"Todos los usuarios"** (estático, muted; la asignación real es fase futura — NO inventes selector de usuarios) + acciones derecha: **Editar** (abre modal) y **switch** activar/desactivar (mismo patrón `perm-switch` submit form de tipos-sesion, llama `toggleBox`).
- Estado vacío: copy tipo *"Aún no tienes box"* + CTA crear el primero.
- Modal crear (referencias `img_169f0444132b.jpg` / `img_3d822f4a259c.jpg`): título **"Agregar box"**, botón **"Crear box"**. Campos:
  - **Nombre** (input, required, minLength 2, maxLength 120, placeholder *"Ej: Box 1, Box Principal…"*).
  - **"Usuarios asignados"**: dropdown que muestra **"Todos los usuarios"** con nota *"Ninguno — Disponible para todos los profesionales"* (si no se selecciona nadie, el box queda disponible para todos) y, bajo el dropdown, texto de estado *"Usuarios seleccionados: Ninguno — Disponible para todos los profesionales"*. El dropdown, al abrirlo (referencia `img_5ba1978b8f87.jpg`), despliega un buscador **"Buscar usuario…"** + lista de usuarios activos de la organización (avatar con inicial, nombre, rol: Administrador/Profesional/Profesional independiente, con checkbox), estilizados con el patrón de filas de profesionales de Agenda Online (`agenda-online-professional-row`/`perm-switch` o equivalente). **El selector es interactivo SOLO en el modal (estado local del cliente): la selección NO se envía ni persiste en esta fase.** El form solo envía `name`; deja un comentario en código: asignación real = fase futura (la lista de la pantalla siempre muestra "Todos los usuarios").
- Modal editar (referencias `img_739e961eb14d.jpg` / `img_5ba1978b8f87.jpg`): título **"Editar box"**, botón **"Guardar cambios"**, nombre precargado, mismo campo "Usuarios asignados" con las mismas reglas (sin persistir).
- Errores inline en español tuteo (patrón agenda-dialog-error existente).

### C) `app/(app)/settings/box/actions.ts` (server)
- `createBox`: valida nombre (2–120) y UNIQUE (org, site_id NULL, nombre) → en conflicto, error *"Ya existe un box con ese nombre."*; INSERT con `site_id NULL` y `active true`.
- `updateBox`: renombra (misma validación).
- `toggleBox`: alterna `active`.
- Revalida `/settings/box` (patrón `manage()` de tipos-sesion; revalidatePath también de rutas que usen boxes si aplica, ej. `/agenda`).

### D) Placeholder
Quita `box` del registro de placeholders de la ruta dinámica `app/(app)/settings/[seccion]/page.tsx` (si está listado, como se hizo con agenda-online en BRIEF-CODEX-48).

## 3. Criterios de aceptación (gatekeeper verifica en Chromium + BD)

1. `npx tsc --noEmit`, `npm run lint`, `npm run build` OK.
2. `/settings/box` muestra: header Box + subtítulo, "+ Añadir box", "Ocultar deshabilitados" marcado, 2 filas (Box Cordillera, Box Mapocho) con "Todos los usuarios" + editar + switch on.
3. Crear box (nombre nuevo) persiste (`boxes.active=true`, site_id null); duplicado da error; editar renombra; toggle desactiva → fila se oculta con el filtro y aparece atenuada al desmarcarlo; todo sin recargar (refresh automático).
4. Sin voseo; sin romper agenda (el `/agenda` y sus selectores de box siguen funcionando); sin data fantasma.
5. No hay migración nueva ni columnas nuevas.

## 4. Entrega

Cambios en el working tree, sin commit. Reporta: archivos creados/modificados, decisión de clases CSS (box-* vs compartidas), y desvíos.