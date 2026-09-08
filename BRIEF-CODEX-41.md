# BRIEF-CODEX-41 — Pantalla "Permisos" en Configuración (toggles de permisos globales)


**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + CSS en `app/globals.css`. Código en **español, tuteo** (nunca voseo), fechas es-CL.

## Contexto

Se implementa la pantalla **"Permisos"** de Configuración (`/settings/permisos`): un conjunto de switches globales de la organización que controlan qué funciones pueden ejercer los usuarios según su rol. La ruta ya existe en el menú (entrada "Permisos", icono `shield`, sección "Mi clínica", en `components/settings/settings-nav.tsx`) pero la página a esa ruta **aún es un placeholder** (`SETTINGS_PLACEHOLDERS["permisos"]` en `app/(app)/settings/[seccion]/page.tsx`). Hay que **crear una página real** que reemplace el placeholder para esa sección.

**Lee `DESIGN.md` primero y respétalo.**

## Diagnóstico (verificado en código)

1. **Placeholder en ruta:** `app/(app)/settings/[seccion]/page.tsx` define `SETTINGS_PLACEHOLDERS.permisos` cuya salida es "En desarrollo". El URL `/settings/permisos` cae ahí. Hay secciones hermanas con páginas reales en carpetas dedicadas (`/settings/organizacion`, `/settings/members`, `/settings/plan`): replicar ese patrón de ruta estática.
2. **Persistencia:** los settings de la organización se guardan como **jsonb en `organizations.settings`** vía server actions que usan `COALESCE(settings,'{}'::jsonb) || jsonb_build_object(...)` + registro en `audit_logs`. Ver `app/(app)/settings/organizacion/actions.ts` como referencia exacta del patrón (SELECT FOR UPDATE → UPDATE jsonb || → INSERT audit_logs → `redirect("/settings/organizacion?ok=...")`).
3. **Roles del sistema** (en `features/tenant-identity/authorize.ts`): `organization_admin`, `professional`, `assistant`, `independent_owner`. En la UI los nombres visibles (según copy de la imagen) son: **administradores**, **profesionales**, **colaboradores**, **asistentes**. Mapear para el copy: `independent_owner` = administrador también (tiene todos los permisos), `organization_admin` = "solo administradores", `professional` = "profesionales", `assistant` = "asistentes (administrativos)".
4. **Switch existente a reutilizar:** el patrón de toggle ya existe en el repo (`components/settings/schedule-dialog.tsx` línea 146: `button class="schedule-toggle" role="switch" aria-checked aria-pressed` + `span`). Usarlo como base visual pero **cumpliendo DESIGN.md** (ver Requerimientos A.1).

## Cambios requeridos (todos obligatorios)

### A. Página real `/settings/permisos`
- Crear `app/(app)/settings/permisos/` con `page.tsx` (server component) + `actions.ts` (server actions), siguiendo el patrón de `organizacion/`.
- **Evitar** que siga cayendo en el placeholder: al crear la carpeta estática, la ruta concreta resuelve antes que `[seccion]` (Next.js da prioridad a rutas estáticas). Quitar la entrada `permisos` de `SETTINGS_PLACEHOLDERS` en `[seccion]/page.tsx`.
- Estructura de la página (igual a la imagen y al patrón visual de settings):
  - `<main>` con `<header>`: `<h1>Permisos</h1>` y `<p class="muted">Controla las funcionalidades disponibles para los usuarios del sistema</p>`.
  - Banner opcional de éxito con `?ok=permisos` (patrón `notice-banner` de organización).
  - **Dos secciones** en `<section class="settings-card">` cada una, con `<h2>` y descripción muted:
    1. **Permisos del Calendario** — "Controla las acciones permitidas en el calendario de citas"
    2. **Permisos de Planes de tratamiento** — "Gestiona los permisos relacionados con planes de tratamiento y pagos"
- Cada opción es una **fila** con: título en negrita (una línea), descripción en `--muted` (12-13px, debajo), y el **toggle alineado a la derecha** (vertical-centrado).
- Footer de la página: botón único **"Guardar permisos"** (`button button-primary`, min-height 42-44px, label de una línea).

### B. Las 11 opciones (títulos y descripciones textuales EXACTAS, tuteo, sin emojis, sin em-dash)

**Permisos del Calendario:**
1. `calendar.restrictModification` — "Restringir modificación de citas" — "No permitir a los profesionales mover o eliminar citas agendadas. Solo los administradores podrán realizar estos cambios."
2. `calendar.allowPastScheduling` — "Permitir agendar en horas pasadas" — "Habilita la opción de agendar citas en horarios que ya han transcurrido en el calendario."

**Permisos de Planes de tratamiento:**
3. `treatments.restrictDiscounts` — "Restringir descuentos adicionales" — "No permitir a los profesionales agregar descuentos adicionales en planes de tratamiento. Solo administradores y colaboradores podrán aplicar descuentos."
4. `treatments.fullAccess` — "Acceso total a planes de tratamiento" — "Permitir a los profesionales gestionar todos los planes de tratamiento de la clínica, no solo los propios."
5. `treatments.dashboardLastPayments` — "Mostrar últimos pagos en Dashboard" — "Permitir a los profesionales ver los últimos pagos realizados de sus planes de tratamiento directamente en el Dashboard."
6. `treatments.deleteFees` — "Eliminar aranceles de planes de tratamiento" — "Permitir a los profesionales eliminar aranceles de sus planes de tratamiento. Si está deshabilitado, solo administradores podrán eliminar aranceles."
7. `treatments.assistantsManage` — "Asistentes gestionan planes de tratamiento" — "Permitir a los asistentes administrativos crear planes de tratamiento a nombre de un profesional tratante, agregar prestaciones y registrar cuando se finalizan. Si está deshabilitado, solo pueden verlos."
8. `treatments.restrictCollaboratorDiscounts` — "Restringir descuentos a colaboradores" — "Restringir a los colaboradores de agregar descuentos adicionales en planes de tratamiento. Solo administradores podrán aplicar descuentos."
9. `treatments.adminsOnlyPayments` — "Solo administradores agregan pagos" — "Permitir solo a administradores agregar pagos a los planes de tratamiento. Profesionales y colaboradores no podrán registrar pagos."
10. `treatments.hideDiscountsInPrints` — "Ocultar descuentos en impresiones" — "Ocultar la columna de descuento al imprimir o exportar planes de tratamiento. Los montos se mostrarán sin detallar los descuentos aplicados."
11. `treatments.customToothZone` — "Permitir zona personalizada en piezas dentales" — "Habilita una opción de texto libre en el selector de piezas dentales de presupuestos y evoluciones, para clínicas que no trabajan con dientes específicos (ej. estética facial)."

### C. Persistencia (jsonb en `organizations.settings`)
- Guardar bajo una clave raíz nueva `permissions`: `settings.permissions = { calendar: {restrictModification, allowPastScheduling}, treatments: {restrictDiscounts, fullAccess, dashboardLastPayments, deleteFees, assistantsManage, restrictCollaboratorDiscounts, adminsOnlyPayments, hideDiscountsInPrints, customToothZone} }`. **11 booleanos, todos `false` por defecto.**
- Server action `updatePermissions(formData)`: leer los 11 checks (checkbox on/off), **`authorize(actor, "organization:manage")`**, UPDATE con `|| jsonb_build_object('permissions', ${tx.json(...)})`, INSERT en `audit_logs` (action `organization.updated` o `settings.permissions_updated`, reason `settings.permissions`), y `redirect("/settings/permisos?ok=permisos")`.
- En `page.tsx` leer `settings.permissions` con defaults `false` para no romper clínicas que no lo tengan (`permissions ?? { calendar: {restrictModification:false, allowPastScheduling:false}, treatments: {...} }`).

### D. UI de cada toggle (cumplir DESIGN.md)
- Usar `<button type="submit">`? NO. Cada toggle debe ser un **checkbox nativo `<input type="checkbox">`** con nombre `permissions[<clave>]` (para el `FormData` de la server action), estilizado como switch.
- **Envolver todo en UN `<form action={updatePermissions}>`** (submit único "Guardar permisos" en el footer; los checkboxes cambian estado visual al instante pero guardan al hacer submit, patrón consistente con Organización).
- Estilizar el switch: **reutilizar la clase `.schedule-toggle`** (track 44×24, knob 20px, `role="switch"` visual) PERO el ON debe usar `--accent` (cian #22d3ee) y NO `#3b82f6` (azul), para cumplir DESIGN.md regla 2.1 (único acento de acción = cian). Si `.schedule-toggle.is-on` está fijado a azul, **no modificarlo globalmente**; en su lugar crear `.perm-toggle`/`.perm-switch` copiando el patrón con `--accent`, para no tocar el schedule.
- Añadir las clases CSS nuevas en `app/globals.css` (junto a las de settings, ~línea 1271+): `.permissions-card` (o reusar `.settings-card`), `.permission-row` (grid: texto | switch, gap, align-items center, padding, border inferior sutil), `.permission-row-title`, `.permission-row-desc` (`--muted` 12-13px), `.perm-switch` (+`.is-on`), y regla de `prefers-reduced-motion`. Filas compactas pero tocables (padding vertical ~0.75-0.9rem).
- Accessibility: si es checkbox, `aria-label` con el título de la opción; focus-visible con outline `--accent`.

## No hacer
- **NO** implementar la lógica de aplicación de estos permisos en los módulos (agenda, planes de tratamiento, dashboard, pagos, impresiones, odontograma). Este brief SOLO crea la **pantalla de configuración + persistencia** de los switches. La aplicación funcional va en briefs posteriores.
- NO rediseñar otras páginas de settings ni tocar `schedule-toggle` global.
- NO tocar `authorize.ts` (roles/permisos base quedan igual).
- Tuteo, sin em-dash, sin emoji.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. ESLint focalizado + `git diff --check` OK.
3. `npm run build` OK.
4. Confirmar que `/settings/permisos` ya NO muestra "En desarrollo" (ruta real resuelve antes que el placeholder) y que `[seccion]/page.tsx` ya no tiene la entrada `permisos`.
5. Reportar archivos tocados y el mapeo clave→label de las 11 opciones.

## Nota al gatekeeper (Hermes)
Tras deploy, validar en Chromium real con la demo (Dra. Emilia, rol admin): abrir `/settings/permisos`, ver las 2 secciones con sus 11 toggles OFF por defecto, alternar varios, "Guardar permisos", recargar y confirmar que persisten (en `organizations.settings.permissions`). Verificar ON en cian `--accent`, no azul. Confirmar visual parejo ("económico"): filas del mismo alto, switch alineado a la derecha.