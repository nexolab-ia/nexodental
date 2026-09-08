# BRIEF-CODEX-32 — Fix: la pantalla "Usuarios" no se ve (ruta desalineada)

**Orquestador:** Hermes (gatekeeper)
**Motor de código:** Codex CLI
**Repo local:** /home/hermes/.hermes/home/proyectos/dental-saas
**Base:** main (HEAD f345ae0)

## Contexto

La pantalla de Usuarios (usuario/permisos de la clínica) **ya está implementada** y
desplegada en producción, pero ningún usuario puede verla: el ítem "Usuarios" del menú
lateral de Configuración no apunta a la página real, por lo que se renderiza el
placeholder "En desarrollo".

## Causa raíz (verificada)

- `SettingsNav.ITEM_USUARIOS` enlace: `http: /settings/usuarios`
  - componente: `components/settings/settings-nav.tsx` ~línea 14
  - → `{ key: "usuarios", href: "/settings/usuarios", label: "Usuarios", icon: "users" }`
- La ruta `/settings/usuarios` NO tiene página propia; la captura el fallback dinámico
  `app/(app)/settings/[seccion]/page.tsx`, que muestra el placeholder
  `SETTINGS_PLACEHOLDERS.usuarios` = "Usuarios · En desarrollo".
- La página real está en `app/(app)/settings/members/page.tsx` (componente
  `components/settings/members-page.tsx`), que renderiza el listado completo (tabs,
  filtros de rol, contador profesionales, tarjetas de usuario con Owner/Activo/horarios).

## Cambio requerido (mínimo, 1 línea)

En `components/settings/settings-nav.tsx`: corregir el `href` del ítem `usuarios` de
`/settings/usuarios` a `/settings/members`.

Antes:
```ts
{ key: "usuarios", href: "/settings/usuarios", label: "Usuarios", icon: "users" },
```
Después:
```ts
{ key: "usuarios", href: "/settings/members", label: "Usuarios", icon: "users" },
```

## Criterios de aceptación

1. El menú lateral Configuración → "Mi clínica" → "Usuarios" navega a
   `/settings/members` (NO a `/settings/usuarios`).
2. En esa ruta se renderiza la página real de Usuarios (título "Usuarios", subtítulo,
   botón "Invitar Usuario", tabs Todos/Activos/Invitaciones, filtro de roles,
   contador "X de Y profesionales utilizados" y tarjetas de miembros con datos vivos
   de la BD).
3. En la ruta `/settings/usuarios` ya NO se muestra el placeholder "En desarrollo"
   (puede devolver 404 o redirigir — lo relevante es que el menú no use esa ruta).
4. `npm run build` (o el build de Vercel) compila sin errores.
5. El estado `key: "usuarios"` en `SETTINGS_PLACEHOLDERS` de
   `[seccion]/page.tsx` puede quedar (es inofensivo) o eliminarse; si se elimina,
   `/settings/usuarios` devolverá 404 vía `notFound()`.

## No hacer (scope)

- NO rediseñar la página de Usuarios (ya cumple la referencia).
- NO tocar `members/page.tsx` ni `members-page.tsx` (solo el nav).
- NO alterar otros ítems del menú.
- NO revertir nada de auth/migración Vercel-Supabase.

## Verificación (gatekeeper)

Tras el fix, verificar en producción que `/settings/members` carga la pantalla real de
Usuarios y que el enlace del menú apunta ahí.