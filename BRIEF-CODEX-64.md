# BRIEF-CODEX-64 — Realinear pantalla Plan 1:1 con cimaos (spec 1920×873)

**Fecha:** 2026-09-10
**Tipo:** Realineación visual (paridad FASE 1)
**Repo:** nexolab-ia/nexodental (rama main)
**Referencia:** pantalla Plan de cimaos (reserva.cimaos.com) — capturas en `docs/referencias/plan-*.png`

## Contexto

La pantalla `/settings/plan` ya existe y es funcional (ruta `app/(app)/settings/plan/page.tsx` → `components/billing/plan-page.tsx` → `PlanTab` en `components/billing/plan-tab.tsx`, datos demo en `components/billing/use-billing-demo.ts`, CSS en `app/globals.css` ~líneas 1764–1922). Está ~95% alineada. Este brief SOLO aplica los deltas pendientes para lograr paridad exacta con el spec de Bryan; no reinventar nada.

**NO reinventar:** no reescribir `PlanTab`, no tocar los tabs Plan/IA/Uso de nivel superior (`BillingTabs`, ya correctos), no tocar los precios/datos demo, no tocar "Agregar profesionales" ni el historial. Solo 4 ajustes de CSS.

## Spec objetivo (resumen de coordinadas de Bryan)

- Cards: fondo **#101827**, borde 1px **#202a3a**, radio **8px**. Header de card: alto **44px**.
- `main` del área de contenido: `margin-left: 232px` (sidebar) + padding 24px; ancho de contenido útil 1649px.
- Grid inferior: **2 columnas**, `gap: 16px`, columna 816.5px cada una.
- Métricas "Mi plan actual": 3 horizontal, alto **124px**, separación **12px**.
- Tabs principales (Plan/IA/Uso): altura **33px**.
- Subtabs (Renovar plan / Agregar profesionales): ancho 1649px, alto 44px, `gap: 8px`, botones radio **10px**.
- Opción de cobro seleccionada: radio **10px**, borde cyan `#22d3ee`.
- Botón "Pagar con MercadoPago": alto **44px**, fondo/borde cyan `#22d3ee`, radio **10px**. (El acento global ya es `#22d3ee`.)

## Deltas a aplicar (SOLO estos)

### 1. Cards del billing → fondo/borde/radio del spec
En `app/globals.css` dentro de `.billing-page`, forzar las tarjetas (overview, detalle, período, historial) a fondo **#101827**, borde **1px solid #202a3a**, radio **8px** y header de card de **44px** de alto.

- El CSS global `.settings-card` usa `--surface` (`#111a2e`), `--radius` (14px) y `--border` (`#243249`). NO edites `.settings-card` global (afecta todo settings); **sobrescribe** solo bajo el ámbito de billing, ej. `.billing-page .settings-card` y `.billing-page .plan-stat` (las 3 tarjetas de métricas).
- El header de card (título "Mi plan actual", "Detalle de tu plan", "Período de facturación") debe medir **44px** de alto.
- Las 3 métricas (`plan-stat`): alto **124px**, separación **12px**, radio **8px** (mismo fondo/borde que el spec).

### 2. Tabs principales (Plan/IA/Uso) → altura 33px
`.billing-tab` actualmente `min-height: 44px`. Cambiarlo a **33px** (spec: altura 33px). Mantener el subrayado cian y el resto.

### 3. Subtabs (Renovar plan / Agregar profesionales) → radio 10px
`.plan-subtabs > button` actualmente `border-radius: 999px` (píldora). Cambiar a **10px**. Mantener gap de **8px** (`0.5rem`), alto **44px**, ancho completo.

### 4. Grid inferior → 2 columnas, gap 16px (verificar)
`.billing-grid` ya tiene `grid-template-columns: repeat(2, minmax(0,1fr))` y `gap: 1rem` (=16px) en el breakpoint ≥880px. **Verificar que en el viewport 1920 el gap sea exactamente 16px** y las dos columnas midan 816.5px cada una. Si `1rem` no es 16px en el contexto actual, fijar `gap: 16px` explícito. NO cambiar el layout responsivo móvil/punto intermedio.

### Restricciones
- Código y comentarios en español, tuteo.
- Solo CSS en `app/globals.css` y bajo el ámbito billing (`.billing-page`). No toques `plan-tab.tsx` ni los datos demo salvo que un cálculo lo exija (no debería).
- Acento sigue siendo `--accent` (`#22d3ee`); no introduzcas colores nuevos.
- Mantén los media queries de `plan-stats-grid` (3 columnas ≥620px), `billing-grid` (2 col ≥880px) y mobile ≤480px intactos en lógica.
- NO hagas commit.

## Verificación (obligatoria)
1. `npm run build` + tsc OK.
2. Chromium headless en `https://dental.nexolabs.cloud/settings/plan` (o local con Playwright), cuenta demo, viewport 1920×873:
   - Cards con fondo `#101827`, borde `#202a3a`, radio 8.
   - 3 métricas de 124px, separadas 12px.
   - Tabs Plan/IA/Uso de 33px de alto.
   - Subtabs Renovar/Agregar con radio 10px, gap 8px.
   - Grid inferior de 2 columnas 816.5px con gap 16px.
   - Opción "Mensual" seleccionada con borde cian y radio 10px.
   - Botón Pagar con MercadoPago cian, radio 10px, alto 44px, ancho total de su columna.
3. Sin regresiones en el panel "Agregar profesionales" ni en el historial.