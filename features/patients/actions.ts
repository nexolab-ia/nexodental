"use server";

import { sql } from "@/db/client";
import { authorize } from "@/features/tenant-identity/authorize";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

export type CreatePatientInput = {
  firstName: string;
  lastName: string;
  rut?: string | null;
  phone?: string | null;
  email?: string | null;
  consentGranted?: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RUT_PATTERN = /^\d{7,8}-[\dkK]$/;

function requiredName(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`Ingresa el ${label} del paciente.`);
  if (normalized.length > 120) throw new Error(`El ${label} no puede superar los 120 caracteres.`);
  return normalized;
}

export async function createPatient(input: CreatePatientInput): Promise<{ ok: true; id: string; name: string }> {
  const actor = await requestTenantContext();
  authorize(actor, "patient:demographics");

  const firstName = requiredName(input.firstName, "nombre");
  const lastName = requiredName(input.lastName, "apellido");
  const rut = input.rut?.trim().toUpperCase() || null;
  const phone = input.phone?.trim() || null;
  const email = input.email?.trim().toLowerCase() || null;
  const consentGranted = input.consentGranted === true;

  if (rut && !RUT_PATTERN.test(rut)) throw new Error("Ingresa un RUT válido con el formato 12345678-9.");
  if (email && !EMAIL_PATTERN.test(email)) throw new Error("Ingresa un email válido.");

  return runAsTenant(sql, actor, async (tx) => {
    const patient = (await tx<Array<{ id: string }>>`
      INSERT INTO patients
        (organization_id, first_name, last_name, rut, phone, email, consent_granted, consented_at)
      VALUES
        (${actor.organizationId}, ${firstName}, ${lastName}, ${rut}, ${phone}, ${email},
          ${consentGranted}, CASE WHEN ${consentGranted} THEN now() ELSE NULL END)
      RETURNING id
    `)[0];
    if (!patient) throw new Error("No pudimos crear el paciente. Intenta nuevamente.");

    await tx`
      INSERT INTO audit_logs
        (organization_id, actor_membership_id, action, entity, entity_id, after, reason)
      VALUES
        (${actor.organizationId}, ${actor.membershipId}, 'patient.created', 'patient', ${patient.id},
          ${tx.json({ firstName, lastName, rut, phone, email, consentGranted })}, 'agenda.quick_patient_create')
    `;

    return { ok: true, id: patient.id, name: `${firstName} ${lastName}` };
  });
}
