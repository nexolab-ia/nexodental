# BRIEF-CODEX-44-D — Reutilizar el formulario de alta de paciente existente (no el duplicado) en Nueva Cita

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + CSS en `app/globals.css`. Código en **español, tuteo** (nunca voseo). Respeta `DESIGN.md`.

## Diagnóstico (verificado en código)

En el brief 44-C se creó un **mini-formulario DUPLICADO** de alta de paciente dentro del diálogo de Nueva Cita (`agenda-client.tsx`: dialog `.create-patient-dialog` + action `features/patients/actions.ts`), con solo nombre/apellido/rut/teléfono/email/consentimiento. **Eso es incorrecto**: en la app YA existe un formulario de alta de paciente completo que debe reutilizarse.

**El formulario existente (canónico) es el `<dialog className="patient-dialog">` en `components/layout/topbar-actions.tsx`, abierto por el botón "+" de la barra superior.** Tiene:
- Tabs "Información personal" / "Información odontológica" (`.drawer-tabs`, `.drawer-body`).
- Campos completos: Nombres, Apellidos, RUT (`RutField`), Sexo, Fecha de nacimiento, Email, Teléfonos (`PhoneField`), Ciudad, Dirección, Convenio, Observaciones, y checkbox de consentimiento (`.consent-field`).
- Uses `action={createPatientFromTopbar}` y, al crear, `redirect(`/patients/${patientId}`)`.

**Action canónica:** `createPatientFromTopbar` en `app/(app)/patients/actions.ts` llama a `createPatient(tx, actor, input)` de `features/clinical-records/actions.ts` (que devuelve el `patientId`). Aquí está la verdadera creación de pacientes; todo lo demás es duplicado a eliminar.

## Fix requerido (obligatorio)

### A. Eliminar el duplicado
- Borrar `features/patients/actions.ts` (el `createPatient` duplicado creado en 44-C) y su uso.

### B. Reutilizar el formulario completo para Nueva Cita
En `features/scheduling/agenda-client.tsx` (diálogo Nueva Cita), **reemplazar el mini-dialog `.create-patient-dialog`** por el formulario completo de alta. La forma más limpia:
- **Extraer el cuerpo del formulario de paciente a un componente reutilizable** (p. ej. `components/patients/patient-create-form.tsx`) que renderice los tabs/campos del `topbar-actions.tsx` (o mover el `dialog` completo a componente compartido), o alternativamente renderizar el mismo contenido del `patient-dialog` dentro del diálogo de Nueva Cita.
- **Necesidad clave de comportamiento en este contexto:** al crear desde Nueva Cita NO debe hacer `redirect('/patients/{id}')` (que saldría de la agenda). Debe:
  1. Crear el paciente (llamar a la action que ya existe).
  2. Obtener el `id` y el nombre.
  3. **Seleccionarlo automáticamente en el campo Paciente** de la cita (`setPatientId`/`setPatientName`) y actualizar el resumen.
  4. Cerrar el diálogo de alta, quedándose en el diálogo de Nueva Cita preparado para crear la cita.

**Solución recomendada (si encaja):** en `features/clinical-records/actions.ts`, `createPatient` ya devuelve el id (o se le puede hacer devolver `{ id, name }`). Crear una server action de alta "para seleccionar" (p. ej. `createPatientForAppointment(input)` en un archivo `"use server"`) que llame a `createPatient(...)` (la canónica) y **devuelva `{ ok, id, name }` en vez de hacer redirect**. El formulario de Nueva Cita usa esa action (fetch al submit) y con el resultado selecciona al paciente en el cliente.
- **Reutilizar los MISMOS campos/tabs** que el formulario del topbar (RutField, PhoneField, Region select, Convenio, Consentimiento) — no simplificar.

### C. Consistencia
- Si el contenido del formulario queda compartido, asegurar que tanto el `+` del topbar como el de Nueva Cita usan el mismo formulario (extraído), para no mantener dos copias divergentes. El topbar sigue con su `redirect`; Nueva Cita con la versión "devuelve id para seleccionar".

## No hacer
- NO mantener dos formularios de alta de paciente.
- NO crear otra tabla ni migración (todo vive en `patients` ya).
- NO usar el `createPatient` duplicado de `features/patients/actions.ts` (se elimina).
- Tuteo, sin emoji (iconos SVG).

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. `npm run lint` + `git diff --check` OK.
3. `npm run build` OK.
4. Confirmar que NO queda `features/patients/actions.ts` ni el mini-dialog `.create-patient-dialog`; que Nueva Cita usa el formulario completo canónico y tras crear selecciona al paciente sin salir de la agenda.
5. Reportar archivos tocados (nuevos/eliminados) y cómo quedó la compartición del formulario.

## Nota al gatekeeper (Hermes)
Tras deploy, validar en Chromium: en `/agenda` abrir +Agendar → botón "Crear paciente" → debe abrir el formulario COMPLETO (tabs personal/odontológica, RUT, teléfonos, convenio, consentimiento) → crear → se selecciona el paciente en Nueva Cita (resumen lo muestra) y NO redirige fuera. Verificar en BD que se creó el paciente y limpiar datos de prueba. Confirmar que el "+" del topbar sigue igual funcionando.