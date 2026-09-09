# BRIEF-CODEX-56 — Agenda Online: Profesionales habilitados con tipos de sesión por profesional

**Producto:** NexoDental — `/settings/agenda-online`, tab "Profesionales habilitados".
**Origen:** Bryan (2026-09-09), imágenes de referencia `img_38c2dc57834a.jpg` (estado 0 habilitados) e `img_454f17957f7c.jpg` (1 habilitado con sus tipos). Decisión confirmada: al activar un profesional NO se preseleccionan tipos (queda activo sin tipos hasta elegirlos).
**Reglas fijas:** implementa MONOLÍTICAMENTE, sin delegar. Copy EN ESPAÑOL, tuteo. NO commitees ni pushees. Respeta `DESIGN.md` y tokens/clases existentes (`agenda-online-*`, `perm-switch`). Working tree limpio (BRIEF-CODEX-55 pusheado). NO crear migración (se guarda en `organizations.settings.agendaOnline`, jsonb, como el resto).

## 1. Modelo (persistencia)

Extiende `organizations.settings.agendaOnline` (jsonb) con una clave nueva **`professionalSessionTypes`**: objeto `{ [membershipId]: sessionTypeId[] }` SOLO con los profesionales habilitados (`professionalIds`), donde cada valor es la lista (deduplicada) de tipos de sesión ACTIVOS de la organización asignados a ese profesional para reservas en línea. Los profesionales NO habilitados no llevan clave (se limpian al guardar). `professionalIds` (array de habilitados) se conserva como está. Sin migración: los objetos previos sin `professionalSessionTypes` siguen válidos (ausente = ninguno asignado).

## 2. Server — `app/(app)/settings/agenda-online/actions.ts`

`updateAgendaOnlineSettings`:
- Mantén el short-circuit `!enabled` actual (persiste `{...previous, enabled:false}`; conserva también `professionalSessionTypes` previo al hacer spread).
- Rama `enabled=true`: añade lectura/validación de un campo `professionalSessionTypes` (JSON string, como `professionalIds`): debe ser objeto; claves = membershipIds; SOLO se aceptan claves que estén dentro del conjunto YA validado de `professionalIds` (los habilitados de esta misma request) y valores = arrays de UUIDs. Cada id de tipo se valida contra `session_types` de la organización con `active = true` (query dentro del mismo `runAsTenant`); se descartan ids no pertenecientes/no activos y duplicados. Guarda en `agendaOnline` la clave `professionalSessionTypes` con ese objeto filtrado (solo claves habilitadas). Errores de formato → mensajes en español tuteo coherentes con los existentes.
- Validaciones de slug/color/mensajes sin cambios.

## 3. Server page — `app/(app)/settings/agenda-online/page.tsx`

Además de la query de profesionales actual, consulta los **tipos de sesión activos** de la organización (`id, name, duration_minutes` desde `session_types WHERE organization_id = ... AND active = true ORDER BY name ASC`) y pásalos al componente (`AgendaOnlinePage` recibe prop `sessionTypes`). Lee también `settings.agendaOnline.professionalSessionTypes` y pásalo como estado inicial.

## 4. UI — `components/settings/agenda-online-page.tsx` (panel "Profesionales habilitados")

Rehacer el panel según las imágenes:

1. **Barra superior del panel**: contador actual ("N de M profesionales habilitados") a la izquierda; a la derecha: link de acción masiva **"Habilitar todos"** (cuando hay ≥1 profesional no habilitado) o **"Deshabilitar todos"** (cuando hay ≥1 habilitado) + **botón azul "Guardar cambios"** (submit del panel). Elimina el botón Guardar del pie de ESTE panel (los otros dos paneles conservan el suyo en el pie — no tocar su layout). El "Guardar cambios" superior guarda TODO el form (mismos campos que hoy; ver §2).
2. **Filas de profesionales** (una por profesional habilitable, orden actual): avatar+nombre+rol+email a la izquierda y switch (`perm-switch`, patrón actual) a la derecha. Copia de descripción del panel ajustada a: *"Selecciona los profesionales que recibirán reservas y los tipos de sesión que ofrecerán en línea."*
3. **Al activar el switch de un profesional** (estado local, sin recargar): la fila se EXPANDE (debajo del nombre/email, como la imagen 2) mostrando el bloque **"Tipos de sesión disponibles para este profesional"** con una fila por cada tipo activo de la clínica: checkbox + nombre del tipo + duración ("30 min" — texto muted). Chequeado = asignado a ese profesional. Estado local inicial: lo que venga de `professionalSessionTypes` (sin preselección al activar por primera vez — decisión Bryan). Si el profesional habilitado NO tiene tipos asignados, mostrar bajo el título el aviso muted: *"Sin tipos asignados. El profesional no podrá recibir reservas en línea hasta que elijas al menos uno."*
4. **Al desactivar** el switch: colapsa la sección de tipos y limpia la asignación local de ese profesional.
5. **"Habilitar todos"** activa todos los profesionales (expandiendo sus tipos, sin preseleccionar) y **"Deshabilitar todos"** los apaga y colapsa todo.
6. **Estados vacíos**: sin profesionales habilitables → mantener CTA actual a `/settings/members`. Además, al pie del panel, link de ayuda (como la referencia): **"+ ¿Necesitas crear más tipos de sesión? Ir a Tipos de Sesión"** enlazando a `/settings/tipos-sesion`.
7. `locked` (agenda deshabilitada): TODO lo anterior queda inerte y gris (BRIEF-CODEX-52/49 intactos): switches, tipos, acciones masivas y Guardar deshabilitados; avisos existentes.
8. Campos ocultos del form: conserva `professionalIds` (JSON) y agrega `professionalSessionTypes` (JSON del objeto §1) construido SIEMPRE del estado local (para que coincidan).

## 5. CSS — `app/globals.css`

Estilos nuevos con tokens existentes: sección de tipos bajo la fila (sangría, `muted`, filas compactas tipo lista con checkbox pequeño), bloque/link de acciones masivas alineado a la derecha, y variantes disabled (gris 52). Sin colores nuevos, sin romper responsive/mobile (los tipos deben verse bien en celular).

## 6. Criterios de aceptación (gatekeeper verifica en Chromium + BD)

1. `npx tsc --noEmit`, `npm run lint`, `npm run build` OK.
2. Con agenda ACTIVA (enabled=true) y 0 habilitados: panel muestra contador "0 de N", "Habilitar todos" y filas sin expandir (imagen 1). Al activar 1 profesional: se expande su bloque de tipos sin ninguno chequeado + aviso de "Sin tipos asignados" (decisión Bryan); "Habilitar todos" pasa a "Deshabilitar todos" (imagen 2 tras marcar).
3. Marcar Limpieza/Urgencia/Evaluación en un profesional y Guardar: en BD `agendaOnline.professionalSessionTypes` queda `{membershipId: [ids]}` y `professionalIds` contiene al profesional; al recargar la página, los tipos aparecen chequeados.
4. Deshabilitar a un profesional y Guardar: su clave desaparece de `professionalSessionTypes` y de `professionalIds`.
5. Requests manipulados (tipo de otro profesional / tipo inactivo / membership no habilitada) se descartan en servidor.
6. Con agenda deshabilitada todo queda bloqueado/gris como hoy; al activarla vuelve todo habilitado.
7. Sin voseo; `/agenda` y demás rutas intactas.

## 7. Entrega

Cambios en el working tree, sin commit. Reporta: archivos tocados, forma del payload/validación, y desvíos con justificación breve.