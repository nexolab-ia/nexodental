"use server";

import { sql } from "@/db/client";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";
import { createAppointment } from "./actions";
import { SchedulingValidationError } from "./domain";

export type CreateAgendaAppointmentInput = {
  professionalMembershipId: string;
  boxId?: string | null;
  patientId?: string | null;
  patientName: string;
  patientContact?: string | null;
  startsAtIso: string;
  endsAtIso: string;
  siteId?: string | null;
  notes?: string | null;
};

function parseInstant(value: string, label: string): Date {
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) throw new SchedulingValidationError(`La ${label} de la cita no es válida.`);
  return instant;
}

export async function createAgendaAppointment(input: CreateAgendaAppointmentInput): Promise<{ ok: true; id: string }> {
  const actor = await requestTenantContext();
  const startsAt = parseInstant(input.startsAtIso, "hora de inicio");
  const endsAt = parseInstant(input.endsAtIso, "hora de término");

  const id = await runAsTenant(sql, actor, async (tx) => {
    const patientId = input.patientId?.trim() || null;
    if (patientId) {
      const patient = (await tx<{ id: string }[]>`SELECT id FROM patients WHERE id = ${patientId} AND organization_id = ${actor.organizationId}`)[0];
      if (!patient) throw new SchedulingValidationError("La persona paciente seleccionada ya no está disponible.");
    }
    return createAppointment(tx, actor, {
      organizationId: actor.organizationId,
      siteId: input.siteId ?? null,
      professionalMembershipId: input.professionalMembershipId,
      boxId: input.boxId ?? null,
      patientName: input.patientName,
      patientContact: input.patientContact ?? null,
      startsAt,
      endsAt,
      notes: input.notes ?? null,
    });
  });

  return { ok: true, id };
}
