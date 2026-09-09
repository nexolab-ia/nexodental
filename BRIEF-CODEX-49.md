# BRIEF-CODEX-49 — Agenda Online: bloquear opciones cuando está deshabilitada

**Producto:** NexoDental (dental.nexolabs.cloud) — `/settings/agenda-online`.
**Origen:** corrección de Bryan (2026-09-09): con Agenda Online desactivada, la UI hoy permite ingresar/modificar opciones de Personalización y Profesionales; solo deben activarse cuando Agenda Online esté activada.
**Reglas fijas:** implementa MONOLÍTICAMENTE, sin delegar a subagentes. Código y copy EN ESPAÑOL, TUTEO (nunca voseo). NO commitees ni pushees: deja los cambios locales, Hermes revisa (gatekeeper). Respeta `DESIGN.md` (1 acento cian de marca, verde SOLO dinero, sin data fantasma).

## 1. Problema (bug actual)

En `components/settings/agenda-online-page.tsx`, el switch maestro `enabled` (tab "Estado y enlace") solo cambia estado visual propio. El resto de campos (`slug`, `themeColor`, `welcomeMessage`, `minCancellationHours`, `postBookingMessage`, `arrivalInstructions` y los checkboxes de profesionales) permanecen editables y guardables aunque `enabled = false`. La server action `updateAgendaOnlineSettings` (en `app/(app)/settings/agenda-online/actions.ts`) valida y persiste todos los campos siempre, sin importar el estado de `enabled`.

**Requisito:** cuando Agenda Online está **deshabilitada**, no debe ser posible ingresar datos ni modificar ninguna de esas opciones. Solo deben habilitarse (editable/guardable) cuando Agenda Online esté **activada**.

## 2. Cambio — Cliente (`components/settings/agenda-online-page.tsx`)

Deriva `const locked = !enabled;` (o nombre similar) del estado ya existente.

1. **Switch maestro** (tab "Estado y enlace", `name="enabled"`): ÚNICO control que permanece siempre interactivo. Es el interruptor de activación.
2. **Todos los demás inputs del formulario** se renderizan con `disabled={locked}`: slug (tab 1), `themeColor`, `welcomeMessage`, `minCancellationHours`, `postBookingMessage`, `arrivalInstructions` (tab Personalización) y los checkboxes de profesionales (tab Profesionales habilitados).
3. **Tabs "Personalización" y "Profesionales habilitados"**: siguen visibles y navegables (se pueden mirar), pero cuando `locked`:
   - sus controles se ven deshabilitados (estilo `disabled` nativo + apariencia consistente con el diseño actual),
   - agregar un aviso visible en cada panel: **"Activa Agenda Online para configurar esta sección."** (tuteo, estilo muted, coherente con el diseño),
   - sus botones "Guardar cambios" se muestran deshabilitados (`disabled`); el de "Estado y enlace" permanece activo.
4. Al activar el switch (`enabled` pasa a true), todo se habilita al instante, sin recargar (reactividad de estado actual, ya existe).

Detalle de estilo: usar las variantes `disabled`/clases existentes del proyecto (por ejemplo el patrón de `perm-switch` y `button`); no introducir estilos arbitrarios ni colores nuevos; no romper el layout responsive ni los estados ARIA existentes (`role="switch"`, `aria-selected`, `aria-disabled` donde aplique).

## 3. Cambio — Servidor (`app/(app)/settings/agenda-online/actions.ts`)

`updateAgendaOnlineSettings` debe leer `enabled` PRIMERO (`formData.get("enabled") === "on"`).

- **Si `enabled === false`:** ignorar por completo los demás campos del form (no validarlos, no usarlos). Persistir **solo** el cambio de `enabled` a `false`, **conservando el resto de valores ya guardados** en `organizations.settings.agendaOnline` (nada de resetear: si reactivan, recuperan su configuración). Se mantiene la misma auditoría (`settings.agenda_online_updated` con before/after) y el mismo `redirect("/settings/agenda-online?ok=agenda-online")`. Esto impide modificar opciones "por debajo" con un request construido a mano mientras está apagado.
- **Si `enabled === true`:** flujo de validación y persistencia actual, sin cambios (todos los campos se validan y guardan como hoy).

Forma sugerida de leer el valor previo: el bloque `FOR UPDATE` ya existente trae `previous.settings?.agendaOnline`; construir el nuevo objeto con spread `{ ...previousSettings, enabled: false }` (o equivalente) antes del `UPDATE`.

## 4. Criterios de aceptación (gatekeeper lo verifica)

1. `npm run tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores nuevos.
2. Con el switch apagado (persistido `enabled: false`): al entrar a `/settings/agenda-online`, los inputs de slug/personalización/profesionales están deshabilitados, los botones Guardar de esos paneles están deshabilitados, y se ve el aviso "Activa Agenda Online para configurar esta sección." en ambos paneles.
3. Guardar con el switch apagado (tab 1) funciona: persiste `enabled: false` y NO altera los demás valores guardados (verificable en BD: `organizations.settings.agendaOnline` conserva themeColor/welcome/mensajes/profesionales previos).
4. Al prender el switch, todos los controles se habilitan sin recargar y el guardado posterior persiste todo como antes (caso ya existente).
5. Sin voseo (grep de "Entrá/Conocé/¿Querés?" = 0).

## 5. Instrucción de entrega

Deja los cambios en el working tree (sin commit). Reporta: archivos modificados, cómo quedó el bloqueo (cliente y servidor), y cualquier desvío con justificación breve.