# BRIEF-CODEX-44-C-C — Fix definitivo createPatient: no pasar `tx.json(...)` como valor directo en audit_logs

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`. Código en **español, tuteo**. Respeta `DESIGN.md`.

## Diagnóstico (confirmado con runtime logs de Vercel + cluster de errores)

`createPatient` sigue fallando **en producción** con:

```
POST /agenda 500
TypeError: The "string" argument must be ... Received an instance of Object
code: 'ERR_INVALID_ARG_TYPE'  (digest 450508170)  → route /agenda (createPatient)
```

El SQL aislado (probado localmente contra el pooler con la config EXACTA de `db/client.ts`) **funciona**, por eso el fix anterior de `CASE WHEN now()` no bastó. La diferencia determinante:

- **`updatePermissions` (settings/permisos) y `updateCalendarSettings` (settings/calendario)** — que SÍ funcionan en producción — usan `tx.json(...)` **ENVUELTO dentro de `jsonb_build_object('clave', name="..."this?, ${tx.json(v)})`**. Ese uso lo digiere el bundle de postgres.js de Vercel correctamente.
- **`createPatient` (`features/patients/actions.ts`)** pasa `tx.json({...})` **como valor DIRECTO de una columna jsonb** en el INSERT a `audit_logs`:
  ```ts
  VALUES (..., ${tx.json({ firstName, lastName, rut, phone, email, consentGranted })}, ...)
  ```
  En el bundle de producción, `tx.json` como argumento directo de VALUES no se serializa (queda un Object) → `Function.str ... Received an instance of Object`.

## Fix requerido

En `features/patients/actions.ts`, en el INSERT a `audit_logs`, **reemplazar `tx.json({...})` por una expresión JSON literal** que postgres.js serialice siempre como texto:

```ts
const afterJson = JSON.stringify({ firstName, lastName, rut, phone, email, consentGranted });
await tx`
  INSERT INTO audit_logs
    (organization_id, actor_membership_id, action, entity, entity_id, after, reason)
  VALUES
    (${actor.organizationId}, ${actor.membershipId}, 'patient.created', 'patient', ${patient.id},
      ${afterJson}::jsonb, 'agenda.quick_patient_create')
`;
```

- `afterJson` es un **string** (JSON.stringify), postgres.js lo serializa sin problema, y `::jsonb` lo castea en BD.
- **El resto del archivo NO debe cambiar** (INSERT a `patients` ya está bien: primitivos + `CASE WHEN ${consentGranted} THEN now() ELSE NULL END`).
- Doble: asegurar que NO haya `tx.` ... ni fragmentos SQL interpolados como valores de columna en ninguna otra query del archivo.

## No hacer
- NO tocar UI, CSS, otras features ni la tabla.
- NO cambiar la firma de `createPatient` (el cliente ya la usa).

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. `npm run lint` + `git diff --check` OK.
3. `npm run build` OK.
4. Confirmar textualmente que `audit_logs` del createPatient usa `${afterJson}::jsonb` (string) y NO `tx.json(...)`.
5. Reportar archivos tocados (debe ser solo `features/patients/actions.ts`).

## Nota al gatekeeper (Hermes)
Tras deploy, revalidar en Chromium el flujo completo: abrir /agenda → +Agendar → Crear paciente → llenar + creación → debe cerrar el diálogo y **seleccionar al paciente** en el campo y el resumen. Crear la cita y confirmar en BD (patients tiene la ficha, appointments con patient_id/patient_name). Limpiar datos de prueba.