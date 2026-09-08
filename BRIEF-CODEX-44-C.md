# BRIEF-CODEX-44-C — Botón "Crear paciente" en el diálogo de Nueva Cita

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + CSS en `app/globals.css`. Código en **español, tuteo** (nunca voseo), fechas es-CL, zona horaria Chile. Respeta `DESIGN.md`.

## Contexto

El diálogo de Nueva Cita implementado en 44-B tiene **autocompletado de pacientes existentes**, pero al escribir un nombre que NO está en la lista solo deja un texto libre (no crea la ficha). Según el diseño enviado por el usuario, junto al campo **Paciente** debe haber un botón **"Crear paciente"** (icono de persona + `+`) que abre un **mini-formulario para crear la ficha del paciente nuevo** y, al guardarlo, lo selecciona en la cita.

**Lee `DESIGN.md` primero y respétalo.**

## Diagnóstico (verificado en código)

1. **Diálogo actual** en `features/scheduling/agenda-client.tsx` (`AgendaCreateDialog`): campo Paciente con `<input>` + sugerencias del autocompletado (`matches`), y nota "Puedes escribir un nombre para una persona paciente nueva." **No hay botón ni flujo de creación**.
2. **Tabla `patients`** (migración 0004 + 0010): `id, organization_id, first_name, last_name, rut, phone, email, consent_granted, consented_at, notes` (+ sex, birth_date, phone_secondary, city, address, convenio_id). RLS tenant-scope. **La página `/patients` es solo un estado vacío** ("Aún no hay pacientes"); aún NO hay server action de creación de pacientes.
3. **Capability:** `patient:demographics` (en admin, assistant, independent_owner) — se usa para gestionar datos de pacientes. La server action debe `authorize(actor, "patient:demographics")`.
4. **`createAgendaAppointment`** (`agenda-create-actions.ts`) recibe `patientId` + `patientName`; valida que el `patientId` pertenezca a la org si viene. El nuevo flujo: crear paciente → obtener su id → seleccionarlo automáticamente en el diálogo (setear `patientId` + `patientName`).
5. **Ley 21.719 (Chile):** datos de salud/salud dental = categoría sensible; la ficha requiere consentimiento. La tabla tiene `consent_granted`/`consented_at`. **El formulario de nuevo paciente debe incluir un checkbox de consentimiento informado** y, si marcado, setear `consent_granted=true` + `consented_at=now()`.

## Cambios requeridos (obligatorios)

### A. Server action `createPatient` (nueva)
Nueva server action en `"use server"` (p. ej. `features/patients/actions.ts`), `createPatient(input)`:
- `authorize(actor, "patient:demographics")`.
- Input mínimo obligatorio: `firstName`, `lastName` (NOT NULL en BD). Opcionales: `rut`, `phone`, `email`, `consentGranted` (boolean).
- Validación: `firstName`/`lastName` no vacíos (con trim, límite 120 chars); si `email` viene, validar formato; si `rut` viene, formato básico (DDDDDDDD-D).
- INSERT en `patients` con `organization_id`, `first_name`, `last_name`, `rut` (nullable, respeta UNIQUE org+rut), `phone`, `email`, `consent_granted`, `consented_at` (now() si consentGranted; si no, sin consentimiento — decidir y documentar si se permite crear sin consentimiento o si es requerido; **sugerencia: requerir el consentimiento para poder crear** en este flujo, o dejarlo opcional pero marcarlo claro; el brief debe fijar UNA opción. Decisión: **consentimiento opcional por ahora, con label claro**, para no bloquear, y se puede endurecer después).
- Devolver `{ ok: true, id, name }`.
- Aplicar el patrón de serialización seguro (sin Dates crudos; fechas via `tx` ni aplica aquí, solo `consented_at = now()`).
- Registrar en `audit_logs`? Los pacientes no tienen historial obligatorio; si `audit_logs` aplica a esta acción usar `patient.created` con action conocida; si no hay entidad en `audit_logs` para pacientes, omitir el log (no romper). Verificar y documentar — si `audit_logs` guarda `entity` como texto, usar `'patient'`.

### B. Botón "Crear paciente" en el diálogo
En `AgendaCreateDialog` (`features/scheduling/agenda-client.tsx`):
- A la derecha del label/etiqueta del campo Paciente o junto a él, agregar un botón secundario compacto **"+ Crear paciente"** (icono de persona + `+` inline SVG, estilo del set existente; texto exacto "Crear paciente").
- Al hacer clic: abrir un **mini-diálogo o sección expandida dentro del mismo diálogo** de Nueva Cita (recomendado: un `<dialog>` anidado con `showModal`, o un panel colapsable; **usar un `<dialog>` anidado** patrón nativo) con el formulario de nuevo paciente:
  - Nombre * (first_name)
  - Apellido * (last_name)
  - RUT (opcional)
  - Teléfono (opcional)
  - Email (opcional)
  - Checkbox de **consentimiento informado** (según decisión A)
  - Footer: `Cancelar` + `Crear paciente`
- Al crear con éxito: llamar `createPatient`, guardar el `id` y `name` devueltos, **seleccionarlo en el campo Paciente** (`setPatientId`, `setPatientName`), actualizar el resumen en vivo ("Paciente: Nombre"), cerrar el mini-diálogo, y mostrar un notice corto de éxito. Sobre error: mostrarlo en el mini-diálogo sin cerrar.
- El paciente recién creado debe quedar visible en el autocompletado / como seleccionado. (Si la lista `patients` es prop estática, el nuevo paciente se añade al estado local `patients` del componente, o basta con setear `patientId`+`patientName` al seleccionarlo.)

### C. Estilo (DESIGN.md)
- Clases nuevas en `app/globals.css`: `.agenda-create-patient-button` (botón secundario compacto ~40px, borde `--border`, hover `--surface-2`, texto `--accent`), `.create-patient-dialog` (patrón dialog, campos en grid, footer sticky), `.agenda-create-patient-grid` (2 columnas responsive). Cian `--accent` único, contraste AA, `prefers-reduced-motion`. El botón "Crear paciente" complementa al input, ambos visibles en la fila.

## No hacer
- NO tocar la creación de citas ni la parte ya validada del diálogo (44/44-B) salvo lo necesario para añadir el botón y el sub-flujo de paciente.
- NO crear la página completa de gestión de pacientes (eso es otra feature; aquí solo el alta rápida desde la cita).
- NO instalar librerías.
- Tuteo, sin em-dash (excepto fijado), sin emoji en UI (el icono es SVG).

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. `npm run lint` + `git diff --check` OK.
3. `npm run build` OK.
4. Confirmar que `createPatient` valida y persiste, y que el botón abre el mini-formulario y tras crear selecciona al paciente en la cita.
5. Reportar archivos tocados + la decisión de consentimiento tomada.

## Nota al gatekeeper (Hermes)
Tras deploy, validar en Chromium con la demo: abrir `/agenda` → + Agendar → ver botón "Crear paciente" → abrir, llenar Nombre/Apellido (+consentimiento), crear → el paciente queda seleccionado en Paciente y en el Resumen; crear la cita y confirmar en BD que `patients` tiene la ficha nueva y la cita apunta a su `patient_id` (y `patient_name`). Limpiar la ficha y cita de prueba.**