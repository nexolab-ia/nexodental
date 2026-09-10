# BRIEF-CODEX-59 — Alineación 1:1 al shell de referencia (captura 1920×925) + pantalla Organización

**Producto:** NexoDental — shell autenticado (`.app-compact`) + `/settings/organizacion`.
**Origen:** Bryan (2026-10-09/10). Nueva referencia `docs/referencias/organizacion-template-cimaos-1920.jpg` (cimaos, Configuración→Organización, 1920×925). El sistema ya tiene densidad compacta (BRIEF-CODEX-58, h1 20px/controles 32px); esta pasada alinea el CHROME de settings y la pantalla Organización 1:1 con la referencia.
**Reglas fijas:** implementa MONOLÍTICAMENTE, sin delegar. Copy español tuteo, sin em-dash, sin emojis. NO commit/push. Respeta DESIGN.md. Solo CSS + markup menor de la pantalla Organización; NO tocar lógica de actions ni persistencia.

## Valores de la referencia (medidos sobre la captura 1920×925)

- Topbar ~36-40px de alto; sidebar **~140px** de ancho; contenido central **máximo ~1130px** (max-width efectivo), con margen muerto a la derecha (~640px en 1920). Título de página 16-17px semibold; subtítulo 11-12px gris. Labels 11px; inputs ~30-32px alto, radio 6px, texto 13px. Tarjetas #131c2c con borde 1px; acento azul en iconos de header de tarjeta y en el ítem activo de la sidebar (subrayado/borde inferior punteado azul).

## T1 — Chrome de settings (afecta a TODAS las páginas de settings, dentro de `.app-compact`)

1. `.app-compact .settings-layout`: **max-width: 72rem** (hoy 110rem) — el contenido deja margen muerto a la derecha como la referencia, alineado a la izquierda tras la sidebar.
2. `.app-compact .settings-layout`: **grid-template-columns: 10.5rem minmax(0,1fr)** (sidebar 248px → 168px). En 1920 debe verse estrecha como la referencia; verificar que "Documentos legales" no corta: si no cabe, bajar font de items a 11.5px (no ensanchar la sidebar).
3. `.app-compact .topbar`: min-height **40px**; brand svg 18px; nav items min-height 30px, padding reducido; íconos topbar 16px.
4. Heading de settings: `.app-compact .organization-heading h1` (y equivalentes de settings: members/billing/blocks/session-types/notificaciones) → **font-size 1.0625rem (17px), weight 700**; subtítulo 12px. El dashboard/agenda pueden conservar h1 20px del 58 (solo settings baja a 17px — unificar con la clase del heading de settings; si el selector global `.app-compact h1` (20px) gana, especificar `.app-compact .organization-heading h1` y hermanos).
5. Ítem activo de la sidebar: además del fondo `surface-2` + color acento actual, añadir **borde inferior/inferior punteado con acento** como la referencia (un solo detalle visual, sin rediseñar el resto).

## T2 — Pantalla Organización 1:1 (`/settings/organizacion`, solo markup/CSS)

La referencia muestra: tarjeta única "Información de la Clínica" con (a) fila superior de logo: placeholder cuadrado ~64px dashed "Sin Imagen" + label "Imagen de la clínica" + subtítulo + botón "Cambiar imagen" (pequeño, outline ~26px) a la derecha del placeholder; (b) debajo, grid 2 columnas 50/50: Nombre | Dirección, Ciudad | Email, Teléfono principal | Teléfono secundario; (c) segunda tarjeta "Horarios de Atención" con icono + grid 2 col: "Hora de apertura" | "Hora de cierre"; (d) link "Ayuda" (icono ?) alineado a la derecha del heading de página.

1. Verificar el markup actual de `app/(app)/settings/organizacion/page.tsx`: si la sección logo ya va encima de los campos dentro de la tarjeta, solo ajustar CSS; si está en otro orden, mover el bloque de logo encima del grid de campos (sin cambiar ids/names del form).
2. `logo-preview`: 96px → **64px**, radius 8px, icono cámara 18px, caption "Sin Imagen" debajo (placeholder cuando no hay logo).
3. Botón "Cambiar imagen": variante compacta (padding 0.3rem 0.6rem, font 11px, fondo transparente, borde 1px) — reutilizar `.button` con una clase menor si hace falta.
4. Grid de campos: mantener `repeat(2, minmax(0,1fr))` pero **gap 0.9rem**; labels 11px arriba del input (ya está el patrón). Nombres de labels: usar "Nombre de la clínica", "Dirección", "Ciudad", "Email de contacto", "Teléfono principal", "Teléfono secundario" (ajustar copy si difiere; el name/id de los inputs NO cambia).
5. "Horario de atención" → renombrar visualmente a **"Horarios de Atención"** y darle la estructura de la referencia: header con icono de calendario acento + grid 2 col 50/50 con labels "Hora de apertura"/"Hora de cierre" (inputs time ya existen; solo labels/copy). Dos tarjetas separadas (Información / Horarios), border-radius y borde del token.
6. Heading de página con link **"Ayuda"** a la derecha (icono ? + texto, gris claro): `<a href="#">` con aria-label, fase 1 sin destino real. Si el heading ya es flex, añadir a la derecha; copy exacta "Ayuda".
7. Inputs: dentro de `.app-compact` ya quedan ~34px; para settings/organizacion ajustar a **30px** (min-height 1.875rem) y font 13px en inputs de esta página (scope `.organization-fields input, .organization-fields select` + horarios), NO global.

## T3 — Verificación (Codex, antes de reportar)

1. `npm run build` EXIT=0.
2. `next start` + playwright-core (Chromium chromium-1243): capturar en **1920×925** Y en 1280×800: `/settings/organizacion`, `/settings/notifications`, `/dashboard`. Guardar en `docs/verificacion/59/`.
3. Medir: sidebar width ≈168px; contenido de settings max-width ≈1152px; h1 settings 17px; topbar 40px; inputs organización 30px; logo preview 64px. Confirmar que la captura 1920 de organizacion se parece proporcionalmente a la referencia (mismo orden de bloques, logo encima, 2 columnas).
4. Landing pública intacta (comparar h1 hero 56px).

## T4 — Reporte

`REPORTE-CODEX-59.md` con archivos, números medidos por ruta y lista de capturas. NO commit/push.
