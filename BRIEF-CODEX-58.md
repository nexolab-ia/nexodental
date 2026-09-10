# BRIEF-CODEX-58 — Densidad compacta global: alinear tipografía/escala del shell autenticado a la referencia (cimaos)

**Producto:** NexoDental — todo el shell autenticado (`app/(app)/**`: topbar, sidebar de settings, dashboard, agenda, pacientes, reportes, billing, members, settings completas).
**Origen:** Bryan (2026-09-10). Diagnóstico medido (CSS computado en producción, viewport 1280×800): la app se ve "grande y se corta" respecto del template app.cimaos.com. Causa = tipografía y densidad del CSS base, NO anchos de columna. Números medidos hoy en `/settings/notifications`: h1 56px (alto 63px), botón primario 46px, input min-height 2.75rem (44px), filas de settings min-height 64px, página completa 1216px en ventana de 800 (~1.6 pantallas). El template usa: h1 de página ~15-16px, cuerpo 10-11px, controles de ~28-30px, sidebar ~140px y todo el contenido de notificaciones cabe casi en una vista.
**Alcance explícito:** SOLO el shell autenticado (`.app-shell`). **NO tocar** el CSS de las páginas públicas (`app/page.tsx`, `app/login`, `app/bienvenida`, `app/e/*`, `app/demo/*`): la landing/login usan los mismos h1/h2/botones globales y NO deben cambiar. Excluir también `.offline-card` y `main > .migration-*` si es de la zona pública (verificar render).
**Reglas fijas:** implementa MONOLÍTICAMENTE, sin delegar. Copy EN ESPAÑOL, tuteo (nunca voseo), sin em-dash, sin emojis. NO commitees ni pushees. Respeta `DESIGN.md` (1 acento cian, verde solo dinero, sin data fantasma). Solo CSS — NO tocar lógica TS/TSX salvo añadir una clase wrapper (ver §1).

## 1. Ancla de scoping (único cambio TS/TSX permitido)

El shell autenticado tiene wrapper: `components/layout/app-shell.tsx` renderiza `<div className="app-shell">…<div className="app-content">{children}</div></div>`.
1. En `app-shell.tsx`, cambiar `app-shell` por `app-shell app-compact` (un solo archivo, una línea).
2. En `app/globals.css`, mover el nuevo sistema de densidad bajo el scope `.app-compact` (descendencia). Todo lo global (`body`, landing, hero) queda intacto. El topbar y la sidebar de settings están DENTRO de `.app-shell`, quedan cubiertos.

## 2. Escala tipográfica compacta (dentro de `.app-compact`)

Referencia = template: títulos de página ~15-16px, cuerpo 10-11px, componentes compactos. Objetivo (el template es DENSO pero no ilegible; usar el piso indicado):

| Elemento | Hoy | Objetivo |
|---|---|---|
| h1 de página (heading de `.organization-heading`, `.billing-heading`, `.members-heading`, `.blocks-header`, `.agenda-heading`, `.session-types-heading`, dashboard, etc.) | clamp(2rem,5vw,3.5rem) → 56px | **20px, weight 700** |
| h2 de sección / tarjetas | clamp(1.55rem,3vw,1.75rem) / 1.05rem | **15px, weight 700** |
| h3 | 1.25rem | **13px, weight 600** |
| cuerpo / p / labels | 15px | **12.5px** |
| `.muted`, descripciones, small | 0.8-0.9rem | **11px** |
| meta/mono (badges, contadores, `.notch-*`) | 0.55-0.7rem | mantener ≥10px |

Implementación: overrides bajo `.app-compact h1 { font-size: 1.25rem; }`, `.app-compact h2 {…}`, `.app-compact h3 {…}` en globals.css. Los override específicos de página que YA fijan h1 (`.agenda-heading h1` clamp 1.65-1.9rem, `.session-types-heading h1` 1.1rem, etc.) se normalizan a la MISMA escala (20px) para que todas las pantallas de settings/agenda queden parejas. Especificidad: si un override de página gana sobre `.app-compact h1`, ajustar el selector nuevo (`.app-compact .agenda-heading h1`) — dejar una regla por caso, sin repetir.

## 3. Densidad de componentes (dentro de `.app-compact`)

| Componente | Hoy | Objetivo |
|---|---|---|
| `.button` (todos los botones del shell) | padding 0.65/0.9, font heredada 15px | padding **0.4rem 0.75rem**, font **12.5px**, min-height implícita ~30px; quitar min-height 44px explícitos que engordan (`.notif-panel-head .button`, `.blocks-header .button`, `.members-invite-button`) → min-height **32px** |
| inputs/select/textarea | min-height 2.75rem | **2.1rem** (~34px), font 12.5px, padding 0.4rem 0.6rem |
| `.topbar` | min-height 4rem (64px) | **48px**; brand svg 30px→**22px**; nav items min-height 44px→**34px**, font 12.5px |
| sidebar `.settings-nav a` | min-height 44px | **32px**, font **12px**; `.settings-group` font 12px→**10px** |
| filas de settings (`.notif-setting-row`, `.calendar-setting-row`, filas de permisos/organización equivalentes) | min-height 64px | **min-height 44px**, padding vertical 0.5rem |
| tabs (`.agenda-online-tabs`, `.members-tab`, `.billing-tabs button`) | min-height 44px | **min-height 32px**, font 12.5px |
| `.settings-card`, `.notif-section`, `.block-card` | padding 1.25rem | **padding 0.9rem** |
| `.settings-page` (si la usan rutas de settings índice) | max-width 52rem | **quitar el max-width 52rem** (la columna ya la fija `.settings-layout`; el rem muere igual en grid) |
| `.date-nav > a` (flechas agenda) | 2.75rem | **2.1rem**, font-size 1.5rem→**1.05rem** |
| iconos svg de nav/filas | 20px | **16px** |

## 4. Editor WhatsApp (`.notif-editor` y equivalente en notificaciones)

Hoy 1 columna (preview apilada abajo). Objetivo (como el template): **grid 2 columnas `minmax(0, 1.6fr) minmax(14rem, 1fr)`** con textarea a la izquierda y "Vista previa" a la derecha, gap 1rem. Colapsar a 1 columna bajo 900px de viewport (media query existente de notif está en 600px — usar 900px para este bloque). Contador "0 / 1600" y fila "+ Variables" quedan sobre el textarea, sin cambios de comportamiento.

## 5. Táctil/móvil NO se degrada

Los min-height de toque (≥40px) deben conservarse en el media query móvil existente (`@media (max-width: 767px)`) para bottom-tabs y controles táctiles: dentro de ese media query, restaurar min-height 44px en botones/inputs/tabs si el valor compacto los bajó de 40px. Escritorio queda denso; móvil sigue tocable.

## 6. Verificación propia (Codex, antes de reportar)

1. `npm run build` EXIT=0.
2. `next start` + playwright-core (binario `~/.hermes/home/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`, exportar LD_LIBRARY_PATH/FONTCONFIG según skills): login demo y capturar en 1280×800: `/dashboard`, `/agenda`, `/settings/notifications`, `/settings/organizacion`. Guardar en `docs/verificacion/58/*.png`.
3. Medir con `getComputedStyle` en `/settings/notifications`: h1 ≤ 22px, botón primario ≤ 34px de alto, fila de settings ≤ 50px, página completa ≤ 950px de alto. Reportar los números.
4. Confirmar que la LANDING pública (`/`) NO cambió de tamaño (capturar antes/después `app/page.tsx` h1 hero).

## 7. Reporte

Escribir `REPORTE-CODEX-58.md` con: archivos modificados, valores h1/botón/fila/página medidos en las 4 rutas, y las 2 capturas de comparación (antes vía git stash si aplica / después). NO commit/push.
