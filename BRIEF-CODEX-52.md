# BRIEF-CODEX-52 — Agenda Online: opciones deshabilitadas con apariencia grisácea (referencia visual Bryan)

**Producto:** NexoDental — `/settings/agenda-online`.
**Origen:** Bryan (2026-09-09): cuando Agenda Online está deshabilitada, las opciones (Configuración básica / slug en "Estado y enlace", y los paneles "Personalización" y "Profesionales habilitados") deben verse **visiblemente grisáceas/atenuadas**, como en las imágenes de referencia que envió (reserva.cimaus.com / capturas de las 13:47): en ellas, todo el bloque deshabilitado (icono, título, descripción, input, texto de ayuda) baja a una opacidad/contraste gris muy reducido, claramente inerte. Hoy el `disabled={locked}` del BRIEF-CODEX-49 bloquea la interacción pero **los controles conservan casi el mismo color** → no se nota que están apagados.
**Reglas fijas:** implementa MONOLÍTICAMENTE, sin delegar. Copy EN ESPAÑOL, tuteo. NO commitees ni pushees. Respeta `DESIGN.md` (1 acento de marca cian/azul existente, sin colores arbitrarios nuevos; verde SOLO dinero).

## 1. Estado actual

En `components/settings/agenda-online-page.tsx`, `locked = !enabled` ya agrega `disabled` a inputs/botones y un aviso *"Activa Agenda Online para configurar esta sección."* (BRIEF-CODEX-49, verificado). Los estilos viven en `app/globals.css` (clases `agenda-online-*`, `perm-switch`).

## 2. Cambio pedido

### A) Marca de estado en el componente
Añade al `<form>` (o a los contenedores adecuados) una clase condicional cuando `locked`, ej. `agenda-online-locked`, para poder apuntar el CSS sin tocar cada control. NO cambies la lógica de `disabled` ni el comportamiento (solo presentación).

### B) CSS (globals.css) — apariencia grisácea del estado bloqueado
Cuando `agenda-online-locked`, todo el contenido **excepto la fila del switch maestro** ("Agenda online habilitada", que debe seguir viéndose normal porque es el control activo) debe atenuarse a un gris claramente apagado, siguiendo la referencia:
- Inputs, textareas, selects y el preview de URL: borde gris apagado (sin acento), texto gris tenue, fondo neutro, cursor `not-allowed`.
- Títulos de sección/iconos, descripciones y textos de ayuda del bloque: color gris atenuado (menos contraste), incluyendo el aviso *"Activa Agenda Online para configurar esta sección."* en tono gris consistente.
- El slug (subsección "Nombre de la URL" dentro de "Estado y enlace") y AMBOS paneles (Personalización, Profesionales) deben verse grisáceos al estar bloqueados; el contador "0 de N profesionales" y los nombres/emails también atenuados.
- Switches `perm-switch` deshabilitados: track y knob en grises apagados (sin color de marca cuando `disabled`).
- Botones "Guardar cambios" deshabilitados: estilo gris, sin el color primario.
- Mantén buena legibilidad (contraste suficiente para leer, ~55-65% de opacidad o equivalente en gris; la referencia baja más pero no queremos texto ilegible — usa gris medio sobre el fondo oscuro actual, sin opacidad extrema sobre texto importante).
- No uses opacidad `opacity` sobre contenedores enteros si degrada demasiado: prefiere colores grises explícitos sobre los controles/copy.
- Aplica también a `:disabled` genérico de esos controles para cubrir navegación por teclado/estados.

## 3. Criterios de aceptación (gatekeeper verifica en Chromium)

1. `npx tsc --noEmit`, `npm run lint`, `npm run build` OK.
2. Con `enabled=false`: captura de pantalla mostrando que slug + paneles Personalización/Profesionales se ven claramente grises/inertes (comparables a la referencia), mientras la fila del switch "Agenda online habilitada" conserva su color normal.
3. Con `enabled=true`: todo vuelve a los colores normales (sin gris residual).
4. Sin voseo; sin cambios de layout/responsive; sin data fantasma.

## 4. Entrega

Cambios en el working tree (el working tree ya trae cambios sin commitear de BRIEF-CODEX-49/50 y posiblemente 51 — NO los toques, trabaja solo sobre `components/settings/agenda-online-page.tsx` y `app/globals.css`). Reporta archivos tocados y desvíos.