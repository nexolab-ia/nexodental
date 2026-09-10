# BRIEF-CODEX-60 — Organización: la tarjeta debe abarcar todo el ancho del área de contenido (fix CSS)

**Fecha:** 2026-09-10
**Tipo:** Bugfix de layout (CSS únicamente, no cambia lógica ni datos)
**Repo:** nexolab-ia/nexodental (rama main)

## Contexto

Bryan reportó que en la pantalla **Configuración → Organización**, la tarjeta "Información de la clínica" (y por ende "Horarios de Atención") se ve **angosta**: no abarca todo el ancho del área de contenido, como sí lo hace en la referencia de diseño (imagen de cimaos/referencia 1920).

## Diagnóstico (verificado con mediciones en producción, viewport 1920px)

La causa raíz es una regla CSS en `app/globals.css` (línea 2861), dentro del bloque `.app-compact`:

```css
.app-compact .settings-layout { grid-template-columns: 10.5rem minmax(0, 1fr); max-width: 72rem; }
```

El `max-width: 72rem` (equivalente a 1152px) recorta el contenedor del layout de settings. Esto hace que el área de contenido (y por tanto las tarjetas) terminen en x=1152px, dejando **~768px de espacio vacío a la derecha** en pantallas anchas (1920px).

Mediciones en vivo:
- Viewport: 1920px
- `.settings-layout`: 0 → 1152px (cortado por el max-width:72rem)
- Tarjeta: 184 → 1152px (solo 968px de ancho)
- Espacio muerto a la derecha: ~768px

En la **referencia el diseño NO tiene este recorte**: la tarjeta abarca todo el ancho del área de contenido, alineada con el borde derecho donde está el enlace "? Ayuda".

## Fix requerido

**Quitar el `max-width: 72rem`** del `.settings-layout` dentro del bloque `.app-compact` para que el layout de settings use todo el ancho disponible del `.app-content`, tal como lo hace el resto de la app. El grid de 2 columnas (sidebar 10.5rem + contenido `minmax(0,1fr)`) se mantiene.

Resultado esperado: en pantallas anchas (1920px), las tarjetas "Información de la clínica" y "Horarios de Atención" se estiran hasta el borde derecho del área de contenido, sin espacio vacío lateral, igual que la referencia.

**Restricciones:**
- Cambio de CSS únicamente, preferiblemente en el bloque `.app-compact` (línea 2861). No se debe tocar el media query `@media (max-width: 767px)` de la línea 2949 (ese `max-width:none` para móvil es correcto y no sobra aunque quites el del escritorio, pero verifica que no haya contradicciones).
- NO cambies la lógica React, el grid de columnas, ni los tamaños de fuente/inputs ya definidos (esos estaban bien según la referencia). Solo se corrige el ancho del contenedor.
- Respeta `app/globals.css` tal cual está estructurado; no reescribas el archivo.

## Verificación

1. `git diff` debe mostrar solo la regla `.app-compact .settings-layout` (y cualquier ajuste mínimo necesario próximo en el mismo bloque CSS para coherencia, nada más).
2. El cambio debe ser idempotente con el resto del CSS de `.app-compact` (los estilos de la tarjeta, logo 64px, hr entre secciones, h1 1.0625rem, etc. NO cambian).
3. No debe romper el layout móvil (<767px) ni el punto intermedio (768-1099px).

No hagas commit. Entrega el diff para revisión del gatekeeper.