# BRIEF-CODEX-53 — Agenda Online activada: mostrar "URL pública" con botón Abrir (referencia Bryan)

**Producto:** NexoDental — `/settings/agenda-online`, panel "Estado y enlace".
**Origen:** Bryan (2026-09-09), con imagen de referencia (app cimaos, `img_f2c487379320.jpg`): cuando la Agenda Online está **habilitada**, el bloque superior debe mostrar, bajo el switch, una caja **"URL pública"** con el enlace completo **y un botón "Abrir ↗"** que abre la página pública en una pestaña nueva. Hoy la implementación (BRIEF-CODEX-48) solo muestra un párrafo de preview en texto apagado, sin la caja ni el botón.
**Reglas fijas:** implementa MONOLÍTICAMENTE, sin delegar. Copy EN ESPAÑOL, tuteo. NO commitees ni pushees. Respeta `DESIGN.md` y los estilos/tokens existentes de `app/globals.css` (clases `agenda-online-*`). NO rompas el bloqueo `locked` (BRIEF-CODEX-49) ni el grisáceo (BRIEF-CODEX-52).

## 1. Comportamiento deseado (solo presentación en el panel "Estado y enlace")

El working tree está limpio (BRIEF-CODEX-52 ya commiteado y pusheado). Trabaja solo sobre `components/settings/agenda-online-page.tsx` y `app/globals.css`.

### A) Componente `components/settings/agenda-online-page.tsx`
En el panel `#agenda-online-panel-status`, entre la fila del switch maestro (`label.agenda-online-setting-row` con "Agenda online habilitada") y la subsección "Nombre de la URL", agrega **solo cuando `!locked`** (agenda activada) un bloque de URL pública:

- Estructura sugerida (adaptable al estilo existente):
  - Etiqueta "URL pública" + descripción corta (ej. "Esta es la dirección que compartes con tus pacientes para que reserven" — copy en tuteo, coherente con el resto).
  - Caja/campo de solo lectura con la URL completa `https://{slug || "mi-clinica"}.reserva.dental.nexolabs.cloud` (slug en minúsculas, igual que el preview actual) y, alineado a la derecha dentro de la misma caja, un enlace/botón **"Abrir ↗"** (`<a>` con `target="_blank"` y `rel="noopener noreferrer"`, `aria-label` tipo "Abrir la página pública de reservas en una pestaña nueva"). La URL destino es la misma URL pública.
- Cuando `locked` (agenda desactivada), este bloque NO se renderiza (el estado apagado ya muestra todo gris/atenuado, y no hay página pública activa).
- Elimina el párrafo de preview duplicado actual (`p.agenda-online-url-preview`, el `https://…reserva.dental.nexolabs.cloud` en texto apagado) si queda redundante con la nueva caja; si prefieres conservarlo como ayuda bajo el input del slug, mantenlo solo cuando `!locked` (evita duplicar la URL visible en el mismo panel).

### B) CSS `app/globals.css`
Estilos para la caja de URL pública + botón "Abrir": contenedor con borde/background tipo campo (usa tokens: `--surface`, `--border`, `--muted`), la URL en color de texto normal legible, el "Abrir ↗" en el acento de marca existente (color del enlace del proyecto), foco visible y responsive (que no se desborde en mobile; si no cabe, apila el botón bajo la URL). Sin colores arbitrarios nuevos.

## 2. Criterios de aceptación (gatekeeper verifica en Chromium)

1. `npx tsc --noEmit`, `npm run lint`, `npm run build` OK.
2. Con `enabled=true` y slug válido guardado: el panel "Estado y enlace" muestra la caja "URL pública" con `https://{slug}.reserva.dental.nexolabs.cloud` y el botón "Abrir ↗" (enlace `_blank` a esa URL).
3. Con `enabled=false` (estado bloqueado): la caja NO aparece; todo sigue grisáceo como BRIEF-CODEX-52; al prender el switch aparece al instante (sin recargar).
4. No hay dos URLs visibles redundantes en el mismo panel.
5. Sin voseo; sin cambios de layout en los otros dos paneles ni en el resto de la app.

## 3. Nota de producto (no bloquee el merge)

El dominio `{slug}.reserva.dental.nexolabs.cloud` aún no tiene página pública (fase futura); el botón quedará apuntando a esa URL aunque hoy devuelva error de DNS/404. Menciónalo en el reporte.

## 4. Entrega

Cambios en el working tree (sobre el BRIEF-CODEX-52 sin commitear), sin commit. Reporta: archivos tocados, cómo quedó la caja, y desvíos.