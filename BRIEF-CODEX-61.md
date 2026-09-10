# BRIEF-CODEX-61 — Organización: realinear el shell y las tarjetas al spec exacto de Bryan (header 48, sidebar 208, tarjeta 1664×432, logo 100×100)

**Fecha:** 2026-09-10
**Tipo:** Realineo de layout/CSS al spec pixel-exacto entregado por Bryan
**Repo:** nexolab-ia/nexodental (rama main)

## Contexto

Bryan midió la pantalla **Configuración → Organización** en su referencia (viewport 1920×873) y entregó el spec exacto. La implementación actual (BRIEF-CODEX-59 + 60) **NO coincide** con ese spec: usa header 40px, sidebar 168px y tarjeta 1576px ancha con logo 64px, cuando el spec pide header 48px, sidebar 208px, tarjeta 1664×432 con header 65px y logo 100×100.

El BRIEF-CODEX-59 estaba mal dimensionado (se usaron medidas equivocadas de referencia). Este brief corrige TODO el shell de Configuración + Organización al spec que Bryan midió.

## Spec exacto de Bryan (target OBLIGATORIO)

Medido en viewport **1920×873 px** (DPR 1):

### MENÚ SUPERIOR (topbar)
- Alto: **48px** (rect 0,0→1920×48). Fondo #090f1c aprox., borde inferior oscuro 1px.
- Padding horizontal: 16px.
- Logo izquierda, navegación centrada, acciones derecha.
- Ítems nav: alto 32px, gap 4px.

### MENÚ VERTICAL (sidebar)
- Posición: x:0, y:48, **ancho 208px**, alto restante.
- Padding: 8px; fondo igual al header; borde derecho 1px.
- Títulos de grupo: 191×24px, padding 4px 12px, 12px uppercase.
- Ítems: 191×32px, padding 6px 12px.
- Activo: fondo #202a3a, radio 6px.

### CONTENIDO PRINCIPAL (main)
- Empieza x:208, y:48. Padding: **24px** horizontal y superior.
- Ancho útil: **1664px**.
- Título: x:232, y:72, **16px semibold**, alto 24px.
- Subtítulo: y:96, **12px**, alto 16px.
- Ayuda alineada a derecha, y:72.

### TARJETA INFORMACIÓN
- Rect: **x:232, y:136, 1664×432px** (ancho 1664, alto 432).
- Fondo #101827, borde 1px #202a3a, **radio 8px**.
- Header de tarjeta: **65px alto**, padding 12px 16px, borde inferior.
- Cuerpo: padding 16px.
- Imagen/logo: **100×100px**, radio 8px. Texto + botón al lado, gap 16px.

### FORMULARIO
- **2 columnas de 807px cada una; gap 16px.**
- Campo: **807×36px**, padding 4px 12px, borde 1px.
- Bloque label+input: **alto 56px**, gap 8px.
- Inputs: **14px** font / line-height 20px.

### TARJETA HORARIOS
- Rect: x:232, y:592, **1664×155px**.
- Misma estética: header 65px + cuerpo padding 16px.
- Separación entre tarjetas: **24px**.
- Dos inputs: columnas de 807px, gap 16px.

## Estado actual (medido en producción, viewport 1920×873)

| Elemento | Actual | Spec Bryan | Delta |
|---|---|---|---|
| topbar alto | 40px | 48px | +8px |
| sidebar ancho | 168px (10.5rem) | 208px (13rem) | +40px |
| main contenido x | 184px | 208px+24px=232px | +48px |
| tarjeta ancho | 1576px | 1664px | +88px |
| tarjeta alto (Información) | 428px | 432px | +4px |
| header tarjeta | 41px | 65px | +24px |
| logo/imagen | 64×64 | 100×100 | +36px |
| columnas form | 1545px (con gap) | 807×2 + gap16 | realinear |
| bloque label+input | ~53px | 56px | +3px |
| input alto | ~30px | 36px | +6px |

Reglas CSS actuales más relevantes (en `app/globals.css`, bloque `.app-compact`, líneas ~2855-2958):
- L2856: `.app-compact .topbar { min-height: 40px; padding-block: 0.25rem; }`
- L2861: `.app-compact .settings-layout { grid-template-columns: 10.5rem minmax(0, 1fr); }` (10.5rem = 168px)
- L2863-2868: subrayado del ítem activo
- L2869-2876: h1 1.0625rem (17px) y subtítulos 12px
- L2921-2924: `.app-compact .logo-preview { width:64px; height:64px; border-radius:8px; }`
- Base (fuera de .app-compact): `.settings-layout` L1163 `grid-template-columns: 15.5rem minmax(0,1fr); gap:2rem; max-width:110rem`
- L1273 `.settings-card`, L1278 `.logo-preview` base (96px), L1287 `.organization-fields`

## Fix requerido

Ajustar CSS (principalmente dentro del bloque `.app-compact` y sus bases) para que la pantalla **Configuración → Organización coincida EXACTAMENTE con el spec de arriba**. Cambio de CSS únicamente; no tocar lógica React, types ni datos.

Ajustes concretos:
1. **Topbar**: min-height 40→48px (revisar padding-block para que los ítems de 32px quepan centrados). El topbar afecta toda la app (es el shell global `.app-compact .topbar`), así que verifica que subir a 48px no descoloque las demás pantallas; si solo quieres un cambio local, al menos el alto de la franja en settings debe ser 48.
2. **Sidebar**: `grid-template-columns` de `10.5rem` → `13rem` (208px). Esto está en `.app-compact .settings-layout`.
3. **Main padding**: el contenido debe empezar en x:208 con padding de 24px (las tarjetas a x:232). Asegura que `.settings-content`/`.organization-settings` hereden ese offset y que las tarjetas queden a 24px del borde del main.
4. **Logo/Imagen**: 64×64 → **100×100px**, radio 8px. Ajustar `.logo-preview` en `.app-compact`.
5. **Header de tarjeta**: subir a **65px**, con padding 12px 16px y borde inferior (revisa si `.organization-card-heading` ya es flex con borde; corrígelo).
6. **Columnas del formulario**: 2 columnas de 807px con gap 16px (o, si el contenedor lo permite, `repeat(2, minmax(0,1fr))` con gap 16px de modo que el ancho resultante cuadre con 807 cada una dentro de la tarjeta de 1664 con padding 16).
7. **Bloque label+input**: alto 56px, gap 8px; **input alto 36px**, padding 4px 12px, font 14px / line-height 20px (input y select y controles de teléfono).
8. **Tarjeta Horarios**: alto ~155px, header 65px, misma estética. Separación entre las dos tarjetas: **24px**.

**Restricciones:**
- CSS UI only. Code/español tuteo en comentarios.
- Respeta el sistema de `.app-compact` (es lo que alinea settings a la referencia). No rompas el layout móvil (<767px) ni el intermedio (768-1099px); esos media queries quedan igual salvo que el cambio global lo exija, en cuyo caso documenta.
- No edites texto visible salvo que el spec lo pida.
- NO hagas commit.

## Verificación

1. `git diff` debe mostrar solo cambios CSS (app/globals.css) — idealmente los mínimos para alcanzar el spec.
2. Objetivo verificable: tarjeta en x:232, ancho 1664, alto ~432; logo 100×100; header tarjeta 65px; bloque label+input 56px; input 36px/14px.
3. No romper otras pantallas de settings (Plan, Usuarios, etc.) que comparten `.settings-layout`.

Entrega el diff sin commit para revisión del gatekeeper.