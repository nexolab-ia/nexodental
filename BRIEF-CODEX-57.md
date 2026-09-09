# BRIEF-CODEX-57 — Pantalla Notificaciones (Configuración): pestañas "Al paciente" y "Al equipo"

**Producto:** NexoDental — `/settings/notifications` (hoy es solo un status de entregas; se reemplaza por la pantalla de configuración).
**Origen:** Bryan (2026-09-09), 5 imágenes de referencia (`img_c10ee8def306.jpg`, `img_656f7842fca8.jpg`, `img_22e4b74cdf7a.jpg`, `img_0f58d8437a39.jpg`, `img_dc94252a75a4.jpg`). Decisiones confirmadas: (1) alcance = **solo UI + persistencia de la configuración**; los envíos reales (WhatsApp, recordatorios, emails) se conectan en fase posterior — NO modificar la infraestructura de envío existente (`features/notifications/*`) ni sus keys actuales. (2) Variables del editor: `{nombreCliente}`, `{nombreProfesional}`, `{diaSemana}`, `{fechaCita}`, `{horaCita}`, `{nombreClinica}`, `{direccionClinica}`, `{telefonoClinica}`, `{urlConfirmacion}` — usar EXACTAMENTE esos tokens con llaves simples.
**Reglas fijas:** implementa MONOLÍTICAMENTE, sin delegar. Copy EN ESPAÑOL, tuteo (nunca voseo), sin em-dash. NO commitees ni pushees. Respeta `DESIGN.md`, tokens/clases de `app/globals.css` y los patrones de pantallas de settings recientes (tabs + panel por pestaña + Guardar por pestaña, como Agenda Online). Working tree limpio (BRIEF-CODEX-56 pusheado).

## 1. Persistencia (sin migración)

Nueva clave `notifications` en `organizations.settings` (jsonb), ADITIVA (no tocar keys existentes como `notificationEmail`/`bookingNoticesEnabled`). Estructura (los nombres de campo son sugerencia; mantenla estable y documentada):
```jsonc
{
  "patient": {
    "confirmEmailEnabled": false,   // "Correos de confirmación"
    "reminderEmailEnabled": false,  // "Correos de recordatorio"
    "reminderTime": "09:00",        // hora HH:MM del recordatorio diario
    "whatsappConfirmEnabled": false,// "Mensaje de confirmación por WhatsApp"
    "whatsappTone": "formal",       // formal | conciso | detallado | amigable
    "whatsappMessage": ""           // texto efectivo (≤1600), inicializado al preset del tone
  },
  "team": {
    "professionalEvents": {          // profesional asignado a la cita
      "reserveNew":  { "email": false, "mobile": false },
      "confirmed":   { "email": false, "mobile": false },
      "cancelled":   { "email": false, "mobile": false },
      "rescheduled": { "email": false, "mobile": false }
    },
    "otherUsers": {                  // key = membershipId, SOLO usuarios con recepción activada
      "<membershipId>": { "email": false, "mobile": false }
    }
  }
}
```
Valores default: todo apagado, `reminderTime: "09:00"`, tone formal. ESCRITURA: patrón obligatorio del repo — `const j = JSON.stringify(obj); ... ${j}::jsonb` (NUNCA `tx.json`, ver BRIEF-CODEX-50). Merge sobre `settings` objeto con `COALESCE(settings,'{}'::jsonb) || jsonb_build_object('notifications', ${j}::jsonb)`.

## 2. Server

### A) `app/(app)/settings/notifications/page.tsx` (server)
- `requestTenantContext` + `runAsTenant`: lee `organizations.settings.notifications` (aplicando defaults completos) y la lista de usuarios activos de la org (memberships `active` con rol `organization_admin | professional | independent_owner`; id, name, email, role — como en Agenda Online). Renderiza el nuevo `NotificationsPage` (client) con settings + users + las dos server actions.

### B) `app/(app)/settings/notifications/actions.ts` (server, "use server")
- `updatePatientNotifications(formData)` y `updateTeamNotifications(formData)` (o una action con `tab` — decide): `authorize(actor, "organization:manage")`, validan y persisten solo su rama (`patient` o `team`), con auditoría `settings.notifications_patient_updated` / `settings.notifications_team_updated` (mismo patrón audit_logs con JSON.stringify::jsonb) y redirect `/settings/notifications?ok=1` o revalidatePath.
- Validaciones: booleans estrictos; `reminderTime` formato `HH:MM`; `whatsappMessage` ≤ 1600 chars; `whatsappTone` ∈ {formal, conciso, detallado, amigable}; `otherUsers` claves = membershipIds activos de la org con rol habilitable y valores {email,mobile} booleanos (descarta el resto). Errores en español tuteo.

## 3. UI — `components/settings/notifications-page.tsx` (client) + CSS en `app/globals.css` (clases `notif-*`)

Estructura: `<h1>Notificaciones</h1>` + muted (ej. "Configura los avisos automáticos a pacientes y a tu equipo."), TABS "Al paciente" / "Al equipo" (patrón `agenda-online-tabs`), un formulario por pestaña con botón azul **"Guardar cambios"** arriba a la derecha de cada panel (como las imágenes).

### Pestaña "Al paciente" (img `img_c10ee8def306.jpg` / `img_656f7842fca8.jpg`)
1. **Sección "Correo"**: filas switch: "Correos de confirmación" (desc: se envía al confirmar la cita) y "Correos de recordatorio" (desc: se envía el día antes). Si recordatorio activo → aparece campo **"Hora del recordatorio"** (input `type="time"`, default 09:00).
2. **Sección "WhatsApp"**: switch "Mensaje de confirmación por WhatsApp". Cuando está activo, se muestra el editor (si está apagado, la sección queda gris/atenuada estilo BRIEF-CODEX-52 o colapsada — decide la opción más limpia y consistente):
   - Fila de plantillas: pills **Formal · Conciso · Detallado · Amigable** (resaltada la activa). Al elegir una, carga su texto en el editor y fija `whatsappTone`.
   - Área de texto (textarea) con contador "X/1600" y botón **"+ Variables"** que despliega el listado de las 9 variables (llaves simples); al hacer clic en una variable se inserta en la posición del cursor del textarea. Ayuda muted: "Las variables se reemplazan con los datos de cada cita."
   - Panel **"Vista previa"** a la derecha (responsive: apilado en mobile): muestra el texto con las variables reemplazadas por EJEMPLOS ficticios claros (María González, Dra. Emilia Torres, lunes 12 de enero, 10:30, Clínica Sonrisa Andes, Av. Providencia 123, +56 2 2123 4567, https://sonrisa-andes.reserva.dental.nexolabs.cloud/confirmar) — valores de ejemplo estáticos solo para previsualizar; sin romper si hay variables sin reemplazo (se muestran tal cual).
3. **Plantillas (textos por defecto, es tuteo, ≤1600 c/u)** — úsalas como preset inicial al elegir tone:
   - Formal: "Estimado/a {nombreCliente}: le confirmamos su cita en {nombreClinica} el {diaSemana} {fechaCita} a las {horaCita} con {nombreProfesional}. Para confirmar o reagendar su hora, ingrese a: {urlConfirmacion}. Dirección: {direccionClinica}. Teléfono: {telefonoClinica}."
   - Conciso: "Hola {nombreCliente}, tu cita con {nombreProfesional} quedó agendada el {fechaCita} a las {horaCita} en {nombreClinica}. Confírmala aquí: {urlConfirmacion}"
   - Detallado: "Hola {nombreCliente}: te confirmamos tu cita en {nombreClinica}. Profesional: {nombreProfesional}. Día: {diaSemana} {fechaCita} a las {horaCita}. Dirección: {direccionClinica}. Teléfono: {telefonoClinica}. Si no puedes asistir, cancela o reagenda con anticipación aquí: {urlConfirmacion}"
   - Amigable: "¡Hola {nombreCliente}! Te esperamos el {diaSemana} {fechaCita} a las {horaCita} con {nombreProfesional} en {nombreClinica}. Si necesitas mover tu hora, solo avísanos por este medio o entra a {urlConfirmacion} 💛"
   (Nota: en "Amigable" evita emoji si contradice DESIGN.md — usa un tono cálido sin emoji si la convención del repo lo prohíbe; decide con el criterio anti-slop del repo.)

### Pestaña "Al equipo" (img `img_22e4b74cdf7a.jpg` / `img_0f58d8437a39.jpg` / `img_dc94252a75a4.jpg`)
1. **Sección "Profesional asignado a la cita"**: tabla/lista de eventos **Reserva nueva · Confirmada · Cancelada · Reagendada**, cada fila con switches **Email** y **Celular** (matriz 4×2 compacta, controles parejos del mismo tamaño). Descripción muted: "Avisos que recibe el profesional dueño de la cita."
2. **Sección "Otros usuarios de la clínica"**: subtítulo + lista de usuarios activos (solo los que tengan toggle de recepción activado se guardan en `otherUsers`). Cada fila: avatar+nombre+rol (+email muted), switch "Recibir avisos" y, cuando está activo, switches Email/Celular (aplican a todos los eventos). Si nadie está activado, mostrar estado vacío sutil ("Sin usuarios seleccionados").
3. Guardar persistente todo el tab.

## 4. Criterios de aceptación (gatekeeper verifica en Chromium + BD)

1. `npx tsc --noEmit`, `npm run lint`, `npm run build` OK.
2. Tab "Al paciente": switches correo/WhatsApp, hora recordatorio condicional, plantillas cargan sus textos, contador 1600, "+ Variables" inserta las 9 variables exactas, vista previa reemplaza con ejemplos.
3. Tab "Al equipo": matriz 4 eventos × Email/Celular para el profesional; otros usuarios con recibir+canales.
4. Guardar persiste en `organizations.settings.notifications` (verificado en BD, estructura §1); recargar muestra lo guardado; branch team no pisa patient y viceversa.
5. Request manipulado (usuario inválido/rol no habilitable, texto >1600, hora mala) → rechazado con error en español.
6. Pantalla anterior (status de entregas) no se rompe: puedes conservar un bloque informativo al final o bajo otra ruta SOLO si no interfiere; lo importante es que `/settings/notifications` quede como pantalla de configuración y nada más use esas keys nuevas todavía.
7. Sin voseo; responsive mobile OK.

## 5. Entrega

Cambios en el working tree, sin commit. Reporta: archivos, estructura final del jsonb guardado, decisiones de UI (colapso/gris en WhatsApp off, manejo del emoji en Amigable), y desvíos.