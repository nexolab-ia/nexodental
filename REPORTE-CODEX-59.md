# REPORTE-CODEX-59

## Alcance implementado

- Se alineó el chrome autenticado de settings dentro de `.app-compact` con la referencia de 1920×925.
- Se limitó el layout de settings a 72rem y se configuró la sidebar en 10.5rem.
- Se compactó la topbar a 40px, la marca a 18px, los iconos a 16px y los enlaces principales a 30px.
- Se unificaron los títulos principales de settings en 17px con subtítulos de 12px.
- Se añadió el detalle punteado de acento al enlace activo de la sidebar.
- Se reorganizó Organización con ayuda en el heading, encabezados con iconos, logo de 64px, campos en dos columnas y tarjeta separada de Horarios de Atención.
- Se conservaron los nombres de campos, las server actions y la persistencia existentes.

## Archivos modificados

- `app/globals.css`
- `app/(app)/settings/organizacion/page.tsx`
- `components/settings/org-logo-picker.tsx`
- `docs/verificacion/59/measurements.json`
- `docs/verificacion/59/organizacion-1920x925.png`
- `docs/verificacion/59/organizacion-1280x800.png`
- `docs/verificacion/59/notifications-1920x925.png`
- `docs/verificacion/59/notifications-1280x800.png`
- `docs/verificacion/59/dashboard-1920x925.png`
- `docs/verificacion/59/dashboard-1280x800.png`

## Verificación

- `npm run build`: EXIT=0. Compilación y TypeScript correctos.
- Chromium Playwright `chromium-1243`: seis capturas generadas contra la build standalone y datos demo temporales aislados.
- `/settings/organizacion` a 1920×925: topbar 40px; layout 1152px; columnas 168px + 968px; h1 17px; inputs 30px; logo 64×64px.
- `/settings/organizacion` a 1280×800: topbar 40px; layout 1152px; columnas 168px + 968px; h1 17px; inputs 30px; logo 64×64px.
- `/settings/notifications` en ambas resoluciones: topbar 40px; layout 1152px; columnas 168px + 968px; h1 17px.
- `/dashboard` en ambas resoluciones: topbar 40px; contenido fuera del layout de settings.
- Landing pública: h1 medido en 56px, intacto.
- La inspección visual final confirma el orden logo, grilla de datos en dos columnas y grilla de horarios en dos columnas.
- El build conserva un aviso preexistente de Next.js sobre la convención `middleware` y mensajes preexistentes de Better Auth por no definir secreto durante el prerender; el proceso finalizó correctamente.
- No se modificaron actions ni persistencia.
- No se realizó commit ni push.
