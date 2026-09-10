# REPORTE-CODEX-58

## Resultado

Se implementó la densidad compacta global del shell autenticado bajo `.app-compact`. Las páginas públicas conservaron la escala global existente.

## Archivos modificados

- `components/layout/app-shell.tsx`: añade la clase `app-compact` al wrapper autenticado.
- `app/globals.css`: incorpora la escala tipográfica, densidad de controles, topbar, navegación, sidebar, filas, tarjetas, editor de WhatsApp y restauración táctil móvil bajo `.app-compact`.
- `docs/verificacion/58/`: contiene las capturas de escritorio, móvil y comparación pública.
- `REPORTE-CODEX-58.md`: documenta implementación y evidencia.

## Valores medidos en 1280 x 800

| Ruta | H1 | Botón principal visible | Fila de settings | Alto total de página |
| --- | ---: | ---: | ---: | ---: |
| `/dashboard` | 20 px | 33,59 px | No aplica | 1446 px |
| `/agenda` | 20 px | No aplica | No aplica | 1396 px |
| `/settings/notifications` | 20 px | 33,59 px | 47,19 px | 943 px |
| `/settings/organizacion` | 20 px | 32,28 px | No aplica | 943 px |

La ruta `/settings/notifications` cumple los cuatro límites del brief: H1 menor o igual a 22 px, botón menor o igual a 34 px, fila menor o igual a 50 px y página menor o igual a 950 px.

## Verificación móvil

En 390 x 844, `/settings/notifications` conserva los objetivos táctiles:

- Botón principal: 44 px.
- Tab: 44 px.
- El textarea mantiene su altura funcional de 189,16 px.
- El editor pasa a una columna bajo 900 px.

## Capturas

### Comparación principal

- Antes: `docs/verificacion/58/settings-notifications-antes.jpg`.
- Después: `docs/verificacion/58/settings-notifications.png`.

### Rutas verificadas

- `docs/verificacion/58/dashboard.png`.
- `docs/verificacion/58/agenda.png`.
- `docs/verificacion/58/settings-notifications.png`.
- `docs/verificacion/58/settings-organizacion.png`.
- `docs/verificacion/58/settings-notifications-mobile.png`.

### Páginas públicas intactas

- Antes: `docs/verificacion/58/landing-antes.png`.
- Después: `docs/verificacion/58/landing-despues.png`.
- H1 hero antes y después: 56 px, 125,44 px de alto.
- Alto total antes y después: 1374 px.
- SHA-256 de ambas capturas: `5d629296c642d9cfd6961bd7ff02474aad80bc4d7e4fd69b65b008a23d212c2b`.

Las capturas pública anterior y posterior son idénticas a nivel de bytes.

## Verificación técnica

- `npm run build`: exit 0.
- TypeScript: correcto dentro del build.
- Playwright Core: login demo correcto con una base PostgreSQL efímera local.
- Chromium: binario `chromium-1243`, viewport de escritorio 1280 x 800.
- `git diff --check`: sin errores.

El build muestra el aviso existente de Next.js sobre la convención `middleware` y mensajes de Better Auth por no definir un secreto durante la fase de prerender. No impiden la compilación. Para las capturas se usó un secreto local efímero.

## Entrega

No se creó ningún commit y no se hizo push.
