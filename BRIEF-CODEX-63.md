# BRIEF-CODEX-63 — Fix auto-guardado Organización: usar la server action directamente en el <form> (el redirect se traga en el try/catch)

**Fecha:** 2026-09-10
**Tipo:** Bugfix de comportamiento (auto-save)
**Repo:** nexolab-ia/nexodental (rama main)

## Problema verificado en producción

El auto-guardado NO guarda. Verificado en vivo (Chromium, cuenta demo, `https://dental.nexolabs.cloud/settings/organizacion`):
- Al cambiar un campo con el formulario completo y válido, `requestSubmit()` SÍ se dispara (`rs:1`, `valid:true`, sin eventos `invalid`).
- Pero el estado termina en **"No se pudo guardar"** y el dato NO persiste.

**Causa raíz:** en `components/settings/auto-save-form.tsx`, el `<form action={guardar}>` usa una función cliente `guardar()` que hace `await action(formData)` dentro de un `try/catch`. Las server actions `updateOrganizationProfile` / `updateOrganizationSchedule` terminan con `redirect("/settings/organizacion?ok=…")`. Al invocarse la action manualmente desde el cliente (y no como `action` del `<form>`), Next no procesa el redirect como navegación; el redirect sale por el `catch` y se muestra "No se pudo guardar", sin persistir ni refrescar.

## Fix requerido

### 1. `components/settings/auto-save-form.tsx`
Pasar la server action **directamente** como `action` del `<form>` para que Next maneje la server action y su `redirect` de forma nativa (que es como ya funcionaba el guardado con botón):

- `<form ref={formRef} action={action} onChange={programarGuardado} onSubmit={manejarEnvio} ...>` (usar el prop `action`, no la función `guardar`).
- Eliminar la función `guardar` con su `try/catch` (es la que se traga el redirect).
- En `programarGuardado` (el handler de `onChange` sobre el form): si `formRef.current` es válido, marcar el estado en "guardando…" y programar el `requestSubmit()` con el debounce de ~500ms; si NO es válido (`checkValidity()` false), llamar a `reportValidity()` (burbujas nativas del navegador) y NO cambiar a estado de error permanente.
- Mantener el indicador transitorio y el `useEffect` que lee `?ok=<successKey>` de la URL para mostrar "Guardado" (el redirect de la server action deja `?ok=profile` / `?ok=schedule`): al detectarlo, mostrar "guardado", limpiar el parámetro con `history.replaceState` y ocultar a los ~2s. (Esto ya está implementado; debe seguir funcionando.)
- Quitar la dependencia de la función `guardar`/del `catch` para el estado "Guardado": el éxito se refleja vía el `redirect` + `?ok=`, no vía el retorno del await.
- Todo lo demás (estilos `.auto-save-status`, accesibilidad, `prefers-reduced-motion`) se mantiene.

No hace falta tocar `app/(app)/settings/organizacion/actions.ts` ni `page.tsx`: las acciones siguen con `redirect(...?ok=…)` y el form pasa la action tal cual.

### Restricciones
- Código y comentarios en español, tuteo.
- No cambies las server actions ni el esquema.
- No toques otras pantallas de settings.
- No rompas mobile ni el punto intermedio.
- NO hagas commit.

## Verificación (obligatoria)
1. `npm run build` + tsc OK.
2. En vivo (o en local con Playwright): rellenar el formulario de perfil completo y válido, cambiar un campo → el indicador muestra "Guardando…" y luego "Guardado"; al recargar, el dato persiste. Igual para el formulario de Horarios (2 campos).
3. Confirmar que el parámetro `?ok=` se limpia de la URL tras mostrar "Guardado".

Entrega el diff sin commit para revisión del gatekeeper.