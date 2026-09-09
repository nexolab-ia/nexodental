# BRIEF-CODEX-54 — Tipos de Sesión: alinear pantalla a la referencia de Bryan (listado, modales, duración 15/30/45/60, descripción, ocultar deshabilitados; eliminar "Predeterminado")

**Producto:** NexoDental — `/settings/tipos-sesion`.
**Origen:** Bryan (2026-09-09), decisiones confirmadas: (1) duración restringida a **15/30/45/60** con dropdown; (2) **quitar** el concepto/columna "Predeterminado" (listado 100% como la imagen: nombre, duración, acciones toggle/editar); (3) alcance = SOLO la pantalla Tipos de Sesión (imágenes de referencia: listado `img_35884873acb8.jpg`, modal agregar `img_911648f4f637.jpg`, modal editar `img_332101c9a9f1.jpg`, dropdown duración `img_3aff83434f3d.jpg`). La asociación tipos↔profesional en Agenda Online es fase futura, NO tocar.
**Reglas fijas:** implementa MONOLÍTICAMENTE, sin delegar. Copy EN ESPAÑOL, tuteo. NO commitees ni pushees. Respeta `DESIGN.md` y tokens de `app/globals.css` (estilos `session-types-*` existentes). Working tree limpio (BRIEF-CODEX-53 commiteado).

## 1. Cambios de esquema — NUEVA migración `db/migrations/0015_session_types_polish.sql` (el 0014 ya existe)

1. `ALTER TABLE session_types ADD COLUMN description varchar(150) NOT NULL DEFAULT '';`
2. Reemplaza el CHECK de duración: suelta la constraint `session_types_duration_minutes_check` (BETWEEN 10 AND 240) y agrega `CHECK (duration_minutes IN (15, 30, 45, 60))`. Verifica ANTES en la migración que no haya filas fuera de {15,30,45,60} (datos actuales: solo 30/45/60); si las hubiera, normalízalas a la preset más cercana antes de aplicar el CHECK (y documéntalo).
3. `ALTER TABLE session_types DROP COLUMN is_default;` (arrastra consigo el índice parcial `session_types_one_default_per_organization_idx`).
4. GRANTs: el GRANT a nivel de tabla existente ya cubre la columna nueva (no agregar column-grants).
5. No crear tablas nuevas. RLS intacta. Idempotente/no destructivo más allá de lo pedido.

## 2. Cambios de UI

### A) `app/(app)/settings/tipos-sesion/session-types-manager.tsx` (y CSS en globals.css)
Alinear al listado de referencia:
- **Encabezado del card**: título "Tipos de sesión" + subtítulo *"Gestiona los tipos de sesión disponibles en tu clínica"*; botón "+" azul para agregar (ícono o "Añadir tipo" — mantén estilo compacto actual, alineado a la derecha).
- **"Ocultar deshabilitados"**: checkbox visible sobre la lista (estilo compacto existente de checkbox), **marcado por defecto**; al marcarlo se ocultan los tipos `active=false`; al desmarcarlo se muestran todos (los inactivos en fila atenuada/gris, sin romper el look).
- **Filas**: NOMBRE + DURACIÓN ("30 min") + acciones a la derecha: botón **Editar** (ícono o texto según estilo actual) y **toggle/switch** activar↔desactivar (usa el patrón `perm-switch` o equivalente del proyecto; el toggle DESACTIVA con `active=false` y el checkbox "Ocultar deshabilitados" lo oculta de la lista). **ELIMINA** la columna "Predeterminado", la columna "Estado" (el estado se lee del toggle y del atenuado) y el texto "Marcar como predeterminado". La fila ya no necesita el formulario de default.
- **Estados vacíos**: mantener con copy coherente.

### B) Modal crear (referencia `img_911648f4f637.jpg`)
- Título **"Agregar tipo de sesión"**; botón primario **"Crear tipo"**; botón "Cancelar".
- Campos: **Nombre** (input, required, minLength 2, maxLength 120), **Duración** (dropdown/select con opciones 15/30/45/60 minutos, default 30), **Descripción** (textarea OPCIONAL, maxLength 150, con nota: *"Se mostrará en la página de reservas en línea (máx. 150 caracteres)"* o copy equivalente en tuteo).
- SIN checkbox de predeterminado.

### C) Modal editar (referencia `img_332101c9a9f1.jpg`)
- Mismos campos pre-cargados (nombre, duración seleccionada, descripción existente). Título **"Editar tipo de sesión"**, botón **"Guardar cambios"**, "Cancelar". Sin checkbox de predeterminado.

### D) `app/(app)/settings/tipos-sesion/actions.ts`
- `createSessionType`: validar duración ∈ {15,30,45,60} y descripción ≤150; INSERT sin `is_default` (name, duration_minutes, description, active default true).
- `updateSessionType`: mismo set (sin is_default); descripción actualizable.
- `toggleSessionType`: solo cambia `active` (sin el CASE WHEN de is_default).
- **ELIMINAR** `setDefaultSessionType`.
- Errores en español tuteo, coherentes con los actuales.

### E) Consumidores de `is_default` (fuera de settings)
- `app/(app)/agenda/page.tsx`: quitar `is_default` de la query y del tipo; ordenar los activos de forma estable (ej. `ORDER BY name ASC`).
- `features/scheduling/agenda-client.tsx` (línea ~239): hoy hace `sessionTypes.find((item) => item.isDefault)`. Reemplazar por: preseleccionar el **primer tipo de sesión activo** de la lista (la lista ya viene ordenada); si no hay tipos, conservar el comportamiento actual de fallback (duración 30) que ya existe para `defaultType === null`. NO cambiar el resto de la lógica de creación de citas.
- Cualquier seed/fixture que inserte `is_default` en session_types: actualizarlo (quitar la columna).

## 3. Criterios de aceptación (gatekeeper verifica en Chromium + BD)

1. `npx tsc --noEmit`, `npm run lint`, `npm run build` OK.
2. Migración 0015 aplicada limpia en Supabase: columna `description` presente, CHECK (15,30,45,60), `is_default` ya no existe; datos intactos.
3. Pantalla `/settings/tipos-sesion` igual a la referencia: listado nombre+duración+editar+toggle, checkbox "Ocultar deshabilitados" marcado por defecto que filtra inactivos, botón agregar.
4. Modal crear: título "Agregar tipo de sesión", Nombre + Duración dropdown (15/30/45/60) + Descripción opcional ≤150; botón "Crear tipo"; crea y persiste (con description).
5. Modal editar: precarga y guarda cambios (incluida descripción); toggle activa/desactiva y el filtro lo refleja.
6. Sin voseo. Nueva cita en /agenda sigue funcionando y preselecciona un tipo activo (o 30 min si no hay tipos).

## 4. Entrega

Cambios en el working tree, sin commit. Reporta: nombre de la migración, archivos tocados, manejo de filas fuera de presets (si hubo), y desvíos.