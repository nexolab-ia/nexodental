# BRIEF-CODEX-44-C-B — Fix: createPatient da "Received an instance of Object"

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`. Código en **español, tuteo**. Respeta `DESIGN.md`.

## Diagnóstico (confirmado con panel de errores de Vercel)

El botón "Crear paciente" del diálogo de Nueva Cita abre el formulario, pero al guardar falla con error de server action:

```
TypeError: The "string" argument must be ... Received an instance of Object
code: 'ERR_INVALID_ARG_TYPE'  (routes=/agenda)
```

**Causa raíz:** en `features/patients/actions.ts`, el INSERT de `createPatient` usa:

```ts
${consentGranted ? tx`now()` : null}
```

Aquí **`tx`now()`` es un fragmento SQL de postgres.js (un objeto `Fragment`)**, y pasarlo como valor parametrizado de una columna hace que postgres.js falle al serializarlo (`Function.str ... Received an instance of Object`). Igual que los bugs Date anteriores (43-C/D), el entorno de producción no lo tolera.

## Fix requerido

En `features/patients/actions.ts`, dentro del INSERT, reemplazar el fragmento por una expresión SQL que deje `now()` **literal** y use el boolean solo como parámetro:

```ts
INSERT INTO patients
  (organization_id, first_name, last_name, rut, phone, email, consent_granted, consented_at)
VALUES
  (${actor.organizationId}, ${firstName}, ${lastName}, ${rut}, ${phone}, ${email},
    ${consentGranted}, CASE WHEN ${consentGranted} THEN now() ELSE NULL END)
RETURNING id
```

- `${consentGranted}` (boolean) es un parámetro válido; **`CASE WHEN ... THEN now() ELSE NULL END` es SQL literal** (sin fragmentos postgres.js). Verifica que el query compile y `consented_at` quede con `now()` al otorgar consentimiento y `NULL` en caso contrario.
- Confirmar que NO queda ningún `tx`...`` interpolado dentro de VALUES u otros puntos de postgres.js en este archivo.

## No hacer
- NO tocar el diálogo UI ni el resto de `agenda-client.tsx` (solo `actions.ts`).
- NO tocar `db`, CSS ni otras features.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. `npm run lint` + `git diff --check` OK.
3. `npm run build` OK.
4. Confirmar textualmente que ya no hay fragmentos `tx`...`` como valor de columna en el INSERT de patients (solo `CASE WHEN ... now()`).
5. Reportar archivos tocados (debe ser solo `features/patients/actions.ts`).

## Nota al gatekeeper (Hermes)
Tras deploy, revalidar en Chromium: abrir el diálogo → "Crear paciente" → llenar nombre/apellido (+consentimiento) → crear → debe seleccionar al paciente y cerrar sin error. Verificar en BD que la ficha se insertó con `consented_at` correcto, y crear la cita (persiste `patient_id`/`patient_name`). Limpiar datos de prueba.