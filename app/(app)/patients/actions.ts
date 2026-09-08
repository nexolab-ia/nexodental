"use server";

import { redirect } from "next/navigation";
import { sql } from "@/db/client";
import { createPatient } from "@/features/clinical-records/actions";
import { isValidRut, normalizeRut } from "@/lib/locale/cl";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

export type ConvenioOption = { id: string; name: string };
export type PatientSearchResult = {
  id: string;
  name: string;
  rut: string | null;
};

function patientInputFromFormData(formData: FormData) {
  const rut = String(formData.get("rut") ?? "").trim();
  if (rut && !isValidRut(rut))
    throw new Error(
      "El RUT no es válido. Revisa el número y el dígito verificador.",
    );

  return {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    rut: rut ? normalizeRut(rut) : undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
    email: String(formData.get("email") ?? "") || undefined,
    consentGranted: formData.get("consentGranted") === "on",
    sex:
      (String(formData.get("sex") ?? "").trim() as
        "female" | "male" | "other" | "unspecified") || undefined,
    birthDate: String(formData.get("birthDate") ?? "").trim() || undefined,
    phoneSecondary:
      String(formData.get("phoneSecondary") ?? "").trim() || undefined,
    city: String(formData.get("city") ?? "").trim() || undefined,
    address: String(formData.get("address") ?? "").trim() || undefined,
    convenioId: String(formData.get("convenioId") ?? "").trim() || undefined,
    observations:
      String(formData.get("observations") ?? "").trim() || undefined,
  };
}

export async function searchPatients(
  query: string,
): Promise<PatientSearchResult[]> {
  const actor = await requestTenantContext();
  const term = query.trim();
  if (term.length < 2) return [];
  const escaped = term.replace(/[\\%_]/g, "\\$&");
  const namePattern = `%${escaped}%`;
  const normalizedRut = normalizeRut(term);
  const rutPattern = `%${normalizedRut}%`;
  return runAsTenant(
    sql,
    actor,
    (tx) => tx<PatientSearchResult[]>`
    SELECT id, concat_ws(' ', first_name, last_name) AS name, rut
    FROM patients
    WHERE organization_id = ${actor.organizationId}
      AND (concat_ws(' ', first_name, last_name) ILIKE ${namePattern} ESCAPE '\\'
        OR regexp_replace(upper(coalesce(rut, '')), '[.\\-[:space:]]', '', 'g') LIKE ${rutPattern})
    ORDER BY first_name, last_name
    LIMIT 10
  `,
  );
}

export async function listActiveConvenios(): Promise<ConvenioOption[]> {
  const actor = await requestTenantContext();
  return runAsTenant(
    sql,
    actor,
    (tx) =>
      tx<
        ConvenioOption[]
      >`SELECT id, name FROM convenios WHERE organization_id = ${actor.organizationId} AND is_active ORDER BY name`,
  );
}

export async function createPatientFromTopbar(
  formData: FormData,
): Promise<void> {
  const actor = await requestTenantContext();
  const patientId = await runAsTenant(sql, actor, (tx) =>
    createPatient(tx, actor, patientInputFromFormData(formData)),
  );
  redirect(`/patients/${patientId}`);
}

export async function createPatientForAppointment(
  formData: FormData,
): Promise<{ ok: true; id: string; name: string }> {
  const actor = await requestTenantContext();
  const input = patientInputFromFormData(formData);
  const patientId = await runAsTenant(sql, actor, (tx) =>
    createPatient(tx, actor, input),
  );
  return {
    ok: true,
    id: patientId,
    name: `${input.firstName.trim()} ${input.lastName.trim()}`,
  };
}
