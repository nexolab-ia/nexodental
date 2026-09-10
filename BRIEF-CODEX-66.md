# BRIEF-CODEX-66 — Realinear pantalla Usuarios 1:1 con cimaos (spec 1920×873)

**Fecha:** 2026-09-10
**Tipo:** Realineación visual (paridad FASE 1)
**Repo:** nexolab-ia/nexodental (rama main)
**Referencia:** captura `docs/referencias/usuarios-pantalla.png`

## Contexto

La pantalla `/settings/members` ya existe y es funcional: `app/(app)/settings/members/page.tsx` → `components/settings/members-page.tsx` (`MembersPage`, `MemberCard`, `InviteDialog`, etc., CSS en `app/globals.css` ~líneas 1984–2038). Está ~80% lista. Este brief realinea SOLO los deltas pendientes para paridad exacta con el spec de Bryan.

**NO reinventar:** no tocar la lógica (tabs, filtro, dialogs de horarios/ausencias, badges existentes), no tocar `features/members/roles`, no tocar el `page.tsx` ni los datos. Todo el trabajo es layout/CSS en `members-page.tsx` y `app/globals.css`.

**Estética:** el proyecto usa UN acento cian `#22d3ee` (contrato DESIGN.md). El "azul" de la referencia cimaos se traduce al acento cian del producto, igual que en la pantalla Plan (botón MercadoPago). No invoques azul `#3b82f6`.

## Spec objetivo (resumen de coordinadas de Bryan)

- Área contenido: `x:232`, comienza `y:72`, ancho útil 1664px.
- **Título** "Usuarios": `y:72`, 16px / alto 24px. **Subtítulo** `y:96`, 12px / alto 16px.
- **Botón "Invitar Usuario"**: derecha, `x:1749 y:76`, **147×32**, fondo acento (cian `#22d3ee`), radio. Sin exceder el alto compacto del shell.
- **Fila filtros+tabs** en `y:136`:
  - Filtro de rol: `x:232`, **200×36**, padding 8px 12px.
  - Indicador de cupos ("N de N profesionales utilizados"): a **16px** del filtro.
  - Tabs de estado: **interior derecho** (`x:1601`), **295×36**, contenedor con padding **3px**, estilo **segmentado** (no tablist subrayada de ancho completo). Tab activo **79×46** con fondo y borde oscuro/superficie.
- **Tarjeta de usuario**: `x:232 y:188`, **824×246**, en grilla de 2 columnas iguales con gap **16px**. Fondo `#101827`, borde 1px `#202a3a`, radio **8px**, padding interior **16px**.
  - Avatar **40×40**, `x:249 y:205`.
  - Bloque avatar/texto: gap **12px**, alto **58px**.
  - Badge de rol **52×18**; badge de estado **54×22**.
  - Separador horizontal en `y:279`.
  - Horarios: padding superior **12px**; botones de día **24×24**, gap **4px**.
  - Datos finales (Rol / Email / Miembro desde) en **dos columnas**, etiquetas a la izquierda y valores a la derecha.

## Deltas a aplicar

### 1. Fila filtro + tabs segmentados a la derecha (cambio de layout)
Hoy `.members-tabs` es una tablist subrayada de ancho completo que va ARRIBA, y `.members-filter-row` va en su propia fila debajo (`members-page.tsx` líneas 98–113). El spec pide que filtro y tabs estén en la MISMA fila (`y:136`), con los tabs a la derecha como control segmentado.

- Reacomodar en `members-page.tsx`: colocar el bloque de tabs dentro de la misma fila que el filtro, alineado al final (`justify-content: space-between` o grid `auto 1fr auto`). El orden visual: filtro rol (izquierda) → indicador de cupos (16px después) → tabs segmentados (derecha).
- Estilizar como **segmentado**: `.members-tabs` = contenedor con `display:inline-flex`, padding **3px**, fondo superficie, radio ~10px, SIN borde inferior de tablist ni overflow scroll de pestaña. Cada `.members-tab` = botón segmentado; el activo `is-active` con fondo/borde oscuro/superficie-elevada y texto del color base (no un subrayado inferior). Mantener la navegación por teclado y `role=tablist` intactos.
- Alturas: contenedor/filtro **36px** en desktop; botón activo **46px** de alto percibido (debe sobresalir/caber sin romper). Respetar los overrides `.app-compact` (los mini-tabs del shell compacto → 32px en desktop, 44px en móvil): revisa que el segmentado respete `.app-compact .members-tab { min-height: 32px }` en vista compacta.

### 2. Botón "Invitar usuario" compacto
`.members-invite-button` hoy es `min-height:44px`. Ajustarlo a **147×32** (alto 32px) en desktop, fondo `--accent` (cian), radio, sin perder el icono `+`. Respetar overrides `.app-compact` y el breakpoint móvil (en móvil puede volver a ancho completo/44px).

### 3. Tarjeta de usuario → medidas interiores del spec
Tarjeta: fondo `#101827`, borde `1px #202a3a`, radio **8px**, padding **16px**, en grilla de 2 columnas iguales `gap:16px` (`members-list` para ≥880px).

- Avatar **40×40**, radio 50%.
- Header (avatar+nombre+badges): bloque de **58px** de alto, gap **12px** entre avatar y texto.
- Badge de rol (Owner / Administrador de cuenta): **52×18**; badge de estado (Activo): **54×22**. Mantener sus colores existentes (owner = cian, activo = verde `--success`).
- Separador horizontal entre el bloque superior (avatar+nombre) y la sección de horarios.
- "Horarios de trabajo": padding superior **12px**; cada celda de día **24×24** con gap **4px** (hoy son 30×30 con gap 0.4rem → cambiar a 24×24 + gap 4px). Los activos con acento cian, inactivos superficie.
- Separador entre horarios y datos finales (si no existe).
- Datos finales (`<dl class="member-details">`): **dos columnas** — etiqueta (Rol/Email/Miembro desde) alineada a la izquierda, valor a la derecha. Ya es así semánticamente; verifica el CSS actual y asegura la alineación izquierda/derecha con gap horizontal.

### Restricciones
- Código y comentarios en español, tuteo.
- Solo `members-page.tsx` (layout/JSX de la fila filtro+tabs y clase segmentado) y `app/globals.css` (estilos members). No toques dialogs, badges de datos, `features/`, `page.tsx` ni la lógica de estado.
- Acento cian del producto, no azul.
- No rompas: navegación por teclado de tabs, `InviteDialog`, `ScheduleDialog`, `AbsencesDialog`, Estados vacíos, móvil ni `.app-compact`.
- NO hagas commit.

## Verificación (obligatoria)
1. `npm run build` + tsc OK.
2. Chromium headless en `https://dental.nexolabs.cloud/settings/members` (viewport 1920×873, cuenta demo `emilia.demo@nexodent.invalid`):
   - Título y subtítulo en `y:72`/`y:96`; botón Invitar 147×32 cian.
   - Filtro de rol + indicador de cupos + tabs segmentados TODOS en la misma fila (`y:136`); tabs a la derecha, contenedor con padding 3px, tab activo con fondo/borde oscuro (79×46 actual en la captura, puede variar con el contenedor — verifica coherencia).
   - Tarjeta Simón Mendoza: fondo `#101827`, borde `#202a3a`, radio 8, padding 16, avatar 40×40, badges (rol 52×18, estado 54×22), horarios 24×24 gap 4, datos en 2 columnas alineadas.
   - Sin solapamientos; el header y la tarjeta no desbordan.
3. Móvil (≤480px) y compacto no rotos.