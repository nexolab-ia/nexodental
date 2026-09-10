# BRIEF-CODEX-65 — Fix header de cards en pantalla Plan (regresión BRIEF-CODEX-64)

**Fecha:** 2026-09-10
**Tipo:** Bugfix de CSS (regresión)
**Repo:** nexolab-ia/nexodental (rama main)

## Problema verificado en producción

Tras BRIEF-CODEX-64 (realineación Plan), los títulos de las cards quedaron **inline con su subtítulo** (concatenados en una línea) en `https://dental.nexolabs.cloud/settings/plan`:

- "Detalle de tu plan Composición del precio mensual."
- "Período de facturación Elige cada cuánto pagar..."
- "Agregar profesionales Cobro proporcional hasta el vencimiento"

**Causa raíz:** en `app/globals.css`, el delta del brief 64 añadió:

```css
.billing-page .settings-card > header {
  display: flex;
  align-items: center;
  min-height: 44px;
}
```

`display:flex` pone en fila los hijos directos del `<header>`. Las cards "Detalle de tu plan", "Período de facturación" y "Agregar profesionales" tienen el `<h2>` y el `<p>` como hijos directos (sin wrapper), por lo que quedaron uno al lado del otro. La card "Mi plan actual" NO se ve afectada porque su `<header>` envuelve el título+subtítulo en un `<div>` antes del badge `Activo` (y ya usa `.plan-overview-heading` con flex).

## Fix requerido

En `app/globals.css`, corregir el bloque del header de cards del billing para que el `<h2>` y el `<p class="muted">` sigan **apilados verticalmente** (como venían antes del 64) y, a la vez, se respete la intención del spec (header de card de ~44px).

Opciones aceptables (elige la más limpia):
1. Quitar `display:flex` y `align-items` de ese bloque, dejando `min-height: 44px` + `display:grid; align-content:center;` — el grid apila los hijos por defecto (una columna) y centra verticalmente, manteniendo el h2 encima del p. NO afecta a "Mi plan actual" porque su header interno es un `<div>` (se apila igual: div, luego badge) — **verifica que el badge Activo no se desalinee**: si el overview lo requiere, mantén `.plan-overview-heading { display:flex }` intacto.
2. O alternativamente, no aplicar flex a los headers sin wrapper: scope por card (`.plan-detail-card > header`, `.billing-period-card > header`, `.add-professionals-card > header`) y dejarlos como estaban (block), solo con `min-height`. 

Lo importante: **h2 arriba, p debajo**, header ~44px de alto, y que "Mi plan actual" conserve su badge `Activo` alineado a la derecha sin romperse.

### Restricciones
- Código y comentarios en español, tuteo.
- Solo CSS en `app/globals.css`, ámbito billing. NO toques `plan-tab.tsx` ni los datos demo.
- No toques el resto de los deltas del 64 (colores cards #101827/#202a3a, radio 8, métricas 124px, tabs 33px, subtabs radio 10, grid gap 16). Solo corrige el header.
- NO hagas commit.

## Verificación (obligatoria)
1. `npm run build` + tsc OK.
2. Chromium headless en `https://dental.nexolabs.cloud/settings/plan` (viewport 1920×873, cuenta demo `emilia.demo@nexodent.invalid`):
   - Los 4 headers de card muestran el título en su línea y el subtítulo debajo (apilados), sin concatenar.
   - "Mi plan actual" conserva el badge `• Activo` a la derecha bien alineado.
   - El resto de la pantalla no cambió (colores, radios, gaps, botón Pagar con MercadoPago cian).