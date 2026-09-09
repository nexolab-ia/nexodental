# BRIEF-CODEX-48 — Settings Agenda Online: configuración (3 tabs)

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + CSS en `app/globals.css`. Código en **español, tuteo** (nunca voseo), fechas es-CL. Respeta `DESIGN.md`. NO commitear ni pushear.

## Contexto

Nueva feature **Agenda Online**: agendamiento público por enlace (los pacientes reservan solos). Esta fase es **SOLO la configuración** en Settings. La página pública de reservas es una fase aparte posterior — NO crearla aquí.

El nav de settings YA tiene el ítem `Agenda Online` (`/settings/agenda-online`, icono globe, sección Agenda) pero cae en el placeholder `SETTINGS_PLACEHOLDERS["agenda-online"]` (app/(app)/settings/[seccion]/page.tsx). Hay que crear la página real con 3 tabs:

1. **Estado y enlace** — toggle habilitar + nombre de la URL
2. **Personalización** — color de tema, mensajes, cancelación mínima, instrucciones
3. **Profesionales habilitados** — qué profesionales reciben reservas en línea

**Lee las 3 imágenes de referencia ANTES de codear** (spec visual pixel-level; están en el repo):
- `docs/referencias/agenda-online-estado-enlace.png`
- `docs/referencias/agenda-online-personalizacion.png`
- `docs/referencias/agenda-online-profesionales.png`

**Lee `DESIGN.md` primero y respétalo** (único acento cian `#22d3ee`, verde solo semántico, sin data fantasma, tuteo, estados vacíos con CTA, inputs con borde visible).

## Diagnóstico (verificado en código)

1. **Patrón de página de settings con jsonb** — copiar exactamente de `app/(app)/settings/calendario/page.tsx` + `app/(app)/settings/calendario/actions.ts` (BRIEF-41): server component con `requestTenantContext()` + `runAsTenant(sql, actor, ...)`, lee `organizations.settings`; action `"use server"` con `authorize(actor, "organization:manage")`, hace `UPDATE organizations SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('agendaOnline', ${tx.json(...)})`, escribe `audit_logs` (action string, `before`/`after` con el patrón tx.json YA validado de calendario — NO inventar variantes nuevas de serialización `tx.json` directo en columnas jsonb, regla BRIEF-44-C-C), y `redirect("/settings/agenda-online?ok=agenda-online")`.
2. **Placeholder**: quitar la key `"agenda-online"` de `SETTINGS_PLACEHOLDERS` (higiene; la ruta estática `app/(app)/settings/agenda-online/page.tsx` gana igual, ver BRIEF-46 bloqueos).
3. **Query de profesionales** (misma que `app/(app)/agenda/page.tsx`): `SELECT m.id, u.name, m.role FROM memberships m INNER JOIN users u ON u.id = m.user_id WHERE m.organization_id = ${actor.organizationId} AND m.status = 'active' AND m.role IN ('professional', 'independent_owner', 'organization_admin') ORDER BY u.name ASC`. Añadir `m.role::text` para el badge de rol (la captura muestra "Simón Mendoza (Administrador)"). Mapear role → label de negocio con los labels ya usados en la pantalla Usuarios/members (`components/settings/members-page.tsx` o `features/members/...`): `organization_admin` → "Administrador", `professional` → "Profesional", `independent_owner` → "Profesional independiente" (verificar labels reales existentes y reutilizarlos).
4. **Switch**: reutilizar las clases/estructura del toggle existente en `app/(app)/settings/permisos/page.tsx` (`.perm-switch` con `role="switch"` + `.perm-switch-track`). Idem el patrón visual de filas con descripción (`settings-card`, `.calendar-setting-row/.calendar-setting-copy/.calendar-setting-title/.calendar-setting-description` usados en calendario; se pueden reutilizar o clonar como `.agenda-online-*`).
5. **Tabs**: no existe patrón de tabs previo → implementar tabs **client** con `useState` (los 3 paneles montados en el DOM, ocultos con atributo `hidden`; clases propias `.agenda-online-tabs`, `.agenda-online-tab`, `.agenda-online-tab[aria-selected="true"]`, `.agenda-online-panel`). Roles ARIA correctos (`role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`). Sin rutas hijas.

## Modelo de datos (nuevo bloque en `organizations.settings`)

`settings.agendaOnline` (jsonb):
```ts
type AgendaOnlineSettings = {
  enabled: boolean;              // default false — "Agenda online habilitada"
  slug: string;                  // default "" — nombre de la URL → <slug>.reserva.dental.nexolabs.cloud
  themeColor: string;            // default '#22d3ee' (cian DESIGN.md; la captura usa #3B82F6 — decisión: default cian)
  welcomeMessage: string;        // default ""
  minCancellationHours: number;  // default 2
  postBookingMessage: string;    // default ""
  arrivalInstructions: string;   // default ""
  professionalIds: string[];     // default [] — ids de memberships habilitadas
};
```
(Tipo local en page.tsx y actions.ts, como hace calendario: `type OrganizationSettings = { agendaOnline?: AgendaOnlineSettings; [key: string]: unknown }`.)

## Comportamiento objetivo (por tab)

### Tab 1 — Estado y enlace
- Fila: **Agenda online habilitada** + descripción "Permite que tus pacientes reserven citas en línea" + switch (`name="enabled"`). Default off.
- Sección **Nombre de la URL**: descripción "Elige el nombre que identificará el enlace público de tu agenda". Input `name="slug"` (placeholder "mi-clinica") con **sufijo estático** a la derecha `.reserva.dental.nexolabs.cloud` (flex: input + span; NO un solo input con el dominio adentro). Al escribir, normalizar en vivo: minúsculas, espacios → guiones, eliminar caracteres no permitidos.
- Preview del enlace completo bajo el campo: `https://{slug o placeholder}.reserva.dental.nexolabs.cloud` (texto `.muted`, monospace).
- Validación del slug (DNS label): regex `^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$`, largo mínimo 3. Si inválido, error visible bajo el input; el submit lo rechaza también en el server.

### Tab 2 — Personalización
- **Color de tema**: input `type="color"` (`name="themeColor"`) + input de texto hex sincronizado en ambos sentidos. Descripción "Define el color principal de tu página de reservas". Validar `#RRGGBB` (regex `^#[0-9a-fA-F]{6}$`) en cliente y server.
- **Mensaje de bienvenida**: textarea `name="welcomeMessage"`, descripción "Saludo que verán tus pacientes al entrar a la página de reservas", `maxLength={200}`, placeholder sugerido "Hola, reserva tu hora con nosotros".
- **Cancelación mínima**: select `name="minCancellationHours"` (label "Cancelación mínima"), descripción "Tiempo mínimo antes de la cita para que el paciente pueda cancelar". Opciones (valor → label): 1 → "1 hora antes", 2 → "2 horas antes" (default), 4 → "4 horas antes", 12 → "12 horas antes", 24 → "24 horas antes", 48 → "48 horas antes".
- **Mensaje posterior a la reserva**: textarea `name="postBookingMessage"`, descripción "Mensaje que verá el paciente al confirmar su cita", `maxLength={300}`.
- **Instrucciones para llegar**: textarea `name="arrivalInstructions"`, descripción "Indicaciones de cómo llegar a tu clínica (dirección, referencias)", `maxLength={500}`.

### Tab 3 — Profesionales habilitados
- Header con contador **"X de N profesionales habilitados"** (X = professionalIds que existen en los profesionales activos; N = total). **Corrección de concordancia (defecto en la captura, NO replicarlo)**: singular cuando N=1 → "0 de 1 profesional habilitado" / "1 de 2 profesionales habilitados".
- Lista de profesionales activos (query del diagnóstico): avatar con inicial, nombre + badge de rol (label negocio), email (JOIN users u → u.email), y switch por fila. La fila del switch actualiza el estado client `professionalIds`.
- Envío: un `<input type="hidden" name="professionalIds" value={JSON.stringify(professionalIds)} />` dentro del form (el componente client mantiene el array en estado, inicializado desde el prop). La action parsea y valida.
- Estado vacío (sin profesionales activos): icono + "No hay profesionales habilitables." + hint "Agrega un profesional con rol activo para habilitarlo" (estado vacío con CTA, DESIGN.md).

### Form y guardado (común)
- **Un solo `<form action={updateAgendaOnlineSettings}>`** envolviendo los 3 paneles (todos montados; los no activos con `hidden`). Botón **"Guardar cambios"** (`.button .button-primary`) visible solo en el panel activo.
- Guardar → `redirect("/settings/agenda-online?ok=agenda-online")` → banner de éxito en la página: "Configuración de agenda online actualizada." (reutilizar `.inline-notice .notice-banner` de calendario).

## Cambios requeridos (obligatorios)

### A. `app/(app)/settings/agenda-online/page.tsx` (server component)
- `requestTenantContext()` + `runAsTenant`: leer `organizations.settings` (jsonb) y la query de profesionales activos (con role y email).
- Props al componente cliente: `settings` (AgendaOnlineSettings con defaults aplicados), `professionals: { id, name, email, role }[]`.
- `searchParams` para el banner `?ok=agenda-online`.
- Header igual que calendario: `<header className="organization-heading"><h1>Agenda Online</h1><p className="muted">Administra la configuración de reservas en línea para pacientes</p></header>`.

### B. `app/(app)/settings/agenda-online/actions.ts` (server action)
`updateAgendaOnlineSettings(formData)`:
- `authorize(actor, "organization:manage")`.
- Parsear y validar TODOS los campos (reglas de la clase de validación arriba; slug y hex con regex; `minCancellationHours ∈ {1,2,4,12,24,48}`; mensajes con trim + maxLength; `enabled` = `formData.get('enabled') === 'on'`).
- `professionalIds`: `JSON.parse(formData.get('professionalIds') ?? '[]')`, debe ser array de strings; **verificar que cada id pertenezca a una membership activa de la org** (`SELECT ... WHERE id = ANY(${ids}) AND organization_id = ${actor.organizationId} AND status = 'active'`) — descartar ids inválidos.
- UPDATE jsonb (patrón calendario) + INSERT `audit_logs` con `action 'settings.agenda_online_updated'`, entity 'organization', `before`/`after` con el sub-bloque agendaOnline previo/nuevo.
- Errores de validación: `throw new Error("...")` con mensaje claro en español tuteo.

### C. Componente cliente (tabs)
`components/settings/agenda-online-page.tsx` ("use client"): estado de tab (`useState`), estado `professionalIds` y `slug` (normalización en vivo), `enabled`, todos los campos del form con los defaults de los props. Estructura y clases según comportamiento objetivo. Reutilizar clases existentes (`.settings-card`, `.button`, `.perm-switch`…) y crear las nuevas.

### D. CSS en `app/globals.css`
Clases nuevas mínimas: `.agenda-online-tabs`, `.agenda-online-tab`, `.agenda-online-panel`, `.agenda-online-url-suffix`, `.agenda-online-url-preview`, `.agenda-online-professional-row`, `.agenda-online-badge`, `.agenda-online-counter`, `.agenda-online-color-row` (+ variantes estados: tab activo con acento `--accent`, hover). Tabs: fila de botones debajo del header, separador inferior; tab activo subrayado `--accent` y texto sin negrita excesiva; paneles con el `.settings-card` del repo. Inputs con borde visible, focus con acento. Respetar `prefers-reduced-motion` y tokens de DESIGN.md.

## No hacer
- NO crear la página pública de reservas (ruta `/r/[slug]` ni similar) — es fase 2.
- NO tocar la tabla `appointments` ni crear tablas.
- NO implementar disponibilidad/conflictos/cancelaciones reales: solo GUARDAR la configuración.
- NO instalar dependencias nuevas.
- NO commit/push (lo hace el gatekeeper).
- Tuteo, sin emojis, sin voseo; copy textual según brief (no re-diseñar ni inventar).

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. `npm run lint` + `git diff --check` OK.
3. `npm run build` OK.
4. Comportamiento: /settings/agenda-online renderiza con 3 tabs; los 3 paneles muestran los valores guardados (o defaults); el toggle enabled funciona; el slug se normaliza y valida; hex se sincroniza; guardar → banner y persiste en `organizations.settings.agendaOnline`.
5. Reportar archivos creados/modificados + decisiones (mapeo de labels de rol usado, validaciones implementadas).

## Nota al gatekeeper (Hermes)
Tras deploy, validar en Chromium real con la demo: login demo → /settings/agenda-online → navegar las 3 tabs → activar toggle, escribir slug "demo-clinica" (ver preview completo), cambiar color, seleccionar el profesional demo, Guardar cambios → banner; recargar y confirmar persistencia; verificar `settings->'agendaOnline'` en BD (MCP Supabase) y que `agenda-online` ya no aparece como placeholder. Limpiar config de prueba al final (dejar enabled=false).