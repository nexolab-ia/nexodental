# BRIEF-CODEX-67 — Fix ancho de contenido en Usuarios (regresión BRIEF-CODEX-66)

**Fecha:** 2026-09-10
**Tipo:** Bugfix de CSS (regresión)
**Repo:** nexolab-ia/nexodental (rama main)

## Problema verificado en producción

Tras BRIEF-CODEX-66, la pantalla `/settings/members` no ocupa todo el ancho del área de contenido como las demás: la tarjeta de usuario mide **792px** y arranca en **x:264**, cuando el spec pide 824px arrancando en **x:232** (el área útil es 1664px, contexto del shell: main `x:232 w:1664`).

**Causa raíz:** el `<main class="members-page">` hereda el `padding: 2rem` (32px) global de `main { ... padding: 2rem; }` en `app/globals.css` (línea ~86). Otras páginas de settings (ej. `billing-page`, definido en ~1764) declaran explícitamente `padding: 0`, así que ocupan todo el ancho. `.members-page` (definido en ~1984) NO lo declara → 32px de padding izquierdo/derecho.

## Fix requerido

En `app/globals.css`, añadir `padding: 0;` al bloque `.members-page` (junto a `display:grid; gap:16px; width:100%`), para que el contenido arranque en `x:232` y las tarjetas midan 824px con la grilla de 2 columnas (`824×2 + 16 gap = 1664`).

Verifica también que el breakpoint móvil (≤480px) siga teniendo sus paddings/sangrías propios si los usaba (no los pierda por el `padding:0` heredado). Si el móvil necesita sangría, ajústala dentro del media query existente de members, sin afectar desktop.

### Restricciones
- Código y comentarios en español, tuteo.
- Solo `app/globals.css`, bloque `.members-page`. No toques `members-page.tsx`, ni el resto de los deltas del 66 (ya verificados correctos).
- NO hagas commit.

## Verificación (obligatoria)
1. `npm run build` + tsc OK.
2. Chromium headless en `https://dental.nexolabs.cloud/settings/members` (1920×873, cuenta demo `emilia.demo@nexodent.invalid`):
   - El `<main>` de members abarca de `x:232` a `x:1896` (ancho 1664), sin padding lateral.
   - La tarjeta de usuario mide **824px** de ancho y arranca en **x:232**.
   - La grilla de 2 columnas queda `824px 824px` con gap 16px.
   - El resto de la pantalla (header, botón Invitar, fila filtro+tabs, tarjeta interior) no cambió.
   - Móvil (≤480px) sin pérdida de sangría.