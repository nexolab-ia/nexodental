# REPORTE-CODEX-53

## Archivos tocados

- `components/settings/agenda-online-page.tsx`
- `app/globals.css`
- `REPORTE-CODEX-53.md`

## Implementación

- El panel "Estado y enlace" muestra, solo con la Agenda Online activada, una caja "URL pública" entre el switch maestro y la configuración del slug.
- La caja presenta la URL completa en minúsculas y un enlace "Abrir ↗" que usa la misma URL, abre una pestaña nueva e incluye `rel="noopener noreferrer"` y una etiqueta accesible.
- La URL responde al cambio del switch y del slug de inmediato. Con la agenda desactivada, el bloque no se renderiza y se conserva el estado bloqueado y grisáceo existente.
- Se eliminó el preview anterior para evitar dos URLs visibles en el mismo panel.
- En pantallas estrechas, el botón se apila debajo de la URL para evitar desbordes.

## Desvíos

- La validación visual en Chromium no pudo ejecutarse porque el binario disponible no inicia en el entorno: falta la biblioteca del sistema `libatk-1.0.so.0`. La implementación sí quedó validada por TypeScript, ESLint y el build de producción.
- La página pública todavía no está implementada. El enlace queda apuntando al dominio solicitado aunque actualmente pueda responder con DNS/404.

## Verificación

- `npx tsc --noEmit`: OK.
- `npm run lint`: OK.
- `npm run build`: OK. El build mantiene los avisos preexistentes sobre `BETTER_AUTH_SECRET` por defecto y la convención deprecada de `middleware`.
