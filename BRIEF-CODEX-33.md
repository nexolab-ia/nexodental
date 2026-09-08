# BRIEF-CODEX-33 — Modal "Configurar Horarios de Trabajo" por usuario (pantalla Usuarios)

**Orquestador:** Hermes (gatekeeper)
**Motor de código:** Codex CLI
**Repo local:** /home/hermes/.hermes/home/proyectos/dental-saas
**Base:** main (HEAD 3972522)

## Contexto

La pantalla "Usuarios" (`/settings/members`) ya lista miembros con su disponibilidad
semanal. Hoy, el icono de calendario en cada tarjeta es un `Link` a `/agenda` ("Ver
agenda"). El cliente (Bryan) pide que ese icono **abra un modal centrado**
"Configurar Horarios de Trabajo" para definir/editar los horarios semanales de ESE
usuario, y persista en `professional_availability`.

Referencia visual entregada (capturas en el chat, dictan el diseño EXACTO — replicar
pixel a pixel, no inventar variantes).

## CRÍTICO — regla de diseño del cliente

- **Definir el CSS de calidad ANTES de escribir el código**: el video/capturas de Bryan
  son la especificación. Replicar exactamente el modal de la referencia (dark theme,
  tarjetas por día, toggle switch, inputs de hora, botón "+ Agregar Horario").
- Texto en **español chileno, tuteo** ("Define los horarios…", no "Definí").
- No gastar rediseño: la pantalla Usuarios actual NO se rediseña, solo se agrega el
  modal + su apertura desde el icono de calendario.

## Cambios requeridos

### 1. Server action: leer y persistir disponibilidad por miembro

Archivo: `features/scheduling/actions.ts` (o un nuevo `features/scheduling/availability-actions.ts`; decidir según consistencia del repo).

- `getProfessionalAvailability(sql, actor, membershipId)`:
  - Autorización: quien invoca debe tener `appointment:schedule` o ser el dueño de la
    membresía (role `organization_admin`/`independent_owner`, o `professional` sobre su
    propia membresía). Reutilizar `can`/`authorize` de `features/tenant-identity/authorize`.
  - Devolver horarios de la org del actor para esa membresía, agrupados por día:
    `{ weekday, siteId, periods: [{ startsAt, endsAt }] }[]` con los 7 días de
    `weekdays` (días sin registros → `periods: []`).
  - Query: `SELECT weekday, site_id, starts_at::text, ends_at::text FROM professional_availability
    WHERE organization_id = ${actor.organizationId} AND professional_membership_id = ${membershipId}`.
  - IMPORTANTE RLS: `professional_availability` está bajo FORCE RLS por tenant. Ejecutar
    dentro de `runAsTenant(sql, actor, tx => …)`.

- `saveProfessionalAvailability(sql, actor, membershipId, days)`:
  - `days`: `{ weekday, periods: [{ startsAt, endsAt }] }[]` (solo días activos; los
    inactivos se representan como `periods: []` o ausentes).
  - Validar: `startsAt < endsAt`, formato HH:MM, dentro de los 7 días válidos
    (reutilizar tipos `Weekday` en `features/scheduling/domain`). Rechazar con
    `SchedulingValidationError` si viola las reglas del dominio.
  - Persistir REEMPLAZANDO el bloque de horarios del miembro en la org del actor:
    - `DELETE FROM professional_availability WHERE organization_id = ${actor.organizationId}
      AND professional_membership_id = ${membershipId}` (incluye todas las sedes o solo
      las que el actor administra — decidir y documentar; si el modal no edita sedes,
      usar `site_id IS NULL` como se siembra para independientes, o conservar la sede
      existente).
    - `INSERT` de cada `(weekday, starts_at, ends_at)` activo.
  - La acción de servidor Next debe llamar a `requestTenantContext()`, `authorize(...)`
    y `runAsTenant(...)`. Firmadas en un `.ts` con `"use server"` (o seguir el patrón de
    actions existentes de settings, p.ej. `app/(app)/settings/.../actions.ts`).
  - Devolver `{ ok: true }` o lanzar error con mensaje en español.

### 2. Modal client "Configurar Horarios de Trabajo"

Nuevo componente `components/settings/schedule-dialog.tsx` (patrón similar al
`members-dialog` existente: `<dialog>` nativo + `showModal()`).

- **Apertura**: el icono de calendario en `MemberCard` (`components/settings/members-page.tsx`)
  cambia de `Link href="/agenda"` a un `<button className="icon-button">` que abre el
  modal para esa membresía. Cuando el miembro no tiene disponibilidad, el icono YA
  NO debe estar `is-disabled` (ahora sí tiene función: configurar horarios).
  Mantener `aria-label` "Configurar horarios de {nombre}".
- **Header**: título "Configurar Horarios de Trabajo" + subtítulo
  "Define los horarios de trabajo para {nombre}" (tuteo).
- **Carga de datos**: al abrir, llamar a la server action `getProfessionalAvailability`
  para precargar los días con sus horarios. Estados: loading (esqueleto/deshabilitado),
  error (mensaje en español), dato.
- **Lista de días** (Lunes→Domingo), cada día en su tarjeta:
  - Badge cuadrado azul con la letra inicial del día (L, M, X, J, V, S, D).
  - Nombre del día + subtexto "N horario(s) configurado(s)".
  - **Toggle switch** para activar/desactivar el día (desactivado oculta sus horarios
    del guardado; los registros previos del día se limpian).
  - Al activar: se despliega la sección de horarios.
- **Sección de horarios** del día activo:
  - Bloque "Horario N" con icono de reloj + campos "Hora de inicio" y "Hora de fin"
    (`<input type="time">`), en 2 columnas.
  - Botón **"+ Agregar Horario"** agrega otro bloque al mismo día.
  - Permitir quitar un bloque de horario (botón/quitar por bloque; definir UX clara,
    p.ej. X en el borde del bloque).
- **Footer** sticky: botón "Cancelar" (outlined) + **"Guardar Horarios"** (primario
  azul). Al guardar: validar, llamar `saveProfessionalAvailability`, mostrar
  confirmación/error, cerrar modal en éxito.
- A11y: `role="dialog"`, `aria-modal`, focus inicial, cierre con Esc (nativo), foco
  restaurado al icono que abrió.

### 3. Estilos (CSS)

En `app/globals.css` (sección junto a `.members-*`, ~línea 1890). Replicar de la
referencia:
- Fondo modal azul marino oscuro (`#0A0F1D`), borde `#172033`, radius 8–12px, ancho ~600px.
- Tarjeta de día: borde sutil, badge azul `#3B82F6` con letra blanca.
- Toggle switch azul con perilla blanca (estado ON).
- Bloque de horario: fondo más oscuro (`#070B14`), inputs `time` con fondo `#080C16`
  y borde `#1E293B`.
- Botón "+ Agregar Horario": dashed/border, texto centrado.
- Botones: "Cancelar" outlined, "Guardar Horarios" azul sólido `#3B82F6`/`#2563EB`.
- Consistencia con tokens existentes del tema (ver `.members-*` y `.settings-*`).

## Criterios de aceptación

1. En `/settings/members`, clickear el icono de calendario de un miembro abre el modal
   "Configurar Horarios de Trabajo" centrado con ese miembro.
2. Los horarios precargados del miembro aparecen en el modal (ej. Simón Mendoza tiene
   L-V 10:00-20:00 → Lunes 10:00-20:00, Martes 10:00-20:00, etc.).
3. Se pueden activar/desactivar días, agregar/quitar bloques, editar horas.
4. "Guardar Horarios" persiste en `professional_availability` (org del actor) y al
   reabrir el modal los cambios persisten; la tarjeta de Usuarios refleja los días
   activos (grilla `weekday-grid`).
5. "Cancelar" descarta sin guardar.
6. RLS respetado: solo puede configurar quien tiene permiso; un profesional solo sus
   propios horarios.
7. Validaciones: hora de fin posterior a inicio, días válidos; errores en español.
8. Texto en español chileno (tuteo). Sin voseo.
9. `npm run build` compila sin errores.
10. No se rediseña el resto de la pantalla Usuarios.

## No hacer (scope)

- NO tocar la agenda (`/agenda`) ni el flujo de citas.
- NO eliminar el enlace "Ver agenda" como funcionalidad de otro icono (el ojo puede
  seguir siendo placeholder "Disponible pronto"; NO tocar esa parte salvo que se indique).
- NO cambiar RLS ni roles existentes.
- NO reescribir `members/page.tsx` de server (solo el Client Component del modal y la
  apertura desde la tarjeta).
- Sin voseo, sin texto en otro idioma que no sea español chileno.

## Verificación (gatekeeper)

Tras el fix: build OK, smoke en producción con la cuenta demo admin
(organización "Clínica Sonrisa Andes") configurando/guardando horarios de un
profesional, y reapertura del modal reflejando el cambio. Validar que la BD no quedó
con basura (los días desactivados se limpian).