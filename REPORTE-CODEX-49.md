# REPORTE-CODEX-49

## Archivos modificados

- `components/settings/agenda-online-page.tsx`
- `app/(app)/settings/agenda-online/actions.ts`
- `REPORTE-CODEX-49.md`

## Bloqueo implementado

### Cliente

- El estado `locked` se deriva de `!enabled` y se actualiza inmediatamente al cambiar el interruptor maestro.
- El interruptor maestro permanece siempre habilitado.
- El slug, los controles de personalización y los interruptores de profesionales quedan deshabilitados mientras Agenda Online está apagada.
- Los paneles de Personalización y Profesionales habilitados siguen navegables, muestran el aviso solicitado y deshabilitan su botón Guardar cambios.
- El botón Guardar cambios de Estado y enlace permanece habilitado para permitir activar o desactivar Agenda Online.

### Servidor

- `updateAgendaOnlineSettings` lee `enabled` antes que cualquier otro campo.
- Cuando `enabled` es `false`, ignora los demás datos enviados, bloquea la organización con `FOR UPDATE` y persiste únicamente `enabled: false` sobre la configuración previa.
- La configuración existente se conserva para una reactivación posterior.
- Se mantienen la auditoría `settings.agenda_online_updated` con `before` y `after`, y la redirección existente.
- Cuando `enabled` es `true`, se conserva el flujo previo de validación y persistencia completa.

## Verificación

- `git diff --check`: correcto.
- Búsqueda de `Entrá`, `Conocé` y `¿Querés?` en los archivos modificados: 0 coincidencias.
- `npx tsc --noEmit`: correcto.
- `npm run lint`: correcto.
- `npm run build`: correcto. Next.js informó la advertencia preexistente sobre la convención `middleware` y Better Auth informó que el entorno de compilación usa el secreto predeterminado; la compilación terminó con código 0.

## Desvíos

- `npm run tsc --noEmit` no pudo ejecutarse porque `package.json` no define un script `tsc`. Se ejecutó el equivalente disponible `npx tsc --noEmit`, que terminó correctamente.
- No se realizó validación manual contra una base de datos ni navegación visual autenticada, porque el brief no proporcionó credenciales ni autorizó cambios de datos. La defensa del servidor quedó implementada dentro de la transacción existente.
- No se realizaron commits ni push.
