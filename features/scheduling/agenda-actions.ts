"use server";

import { sql } from "@/db/client";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

export type AgendaAppointment = {
  id: string; siteId: string | null; professionalMembershipId: string; boxId: string | null;
  kind: "appointment" | "block"; status: "pending" | "confirmed"; patientName: string;
  patientContact: string | null; startsAt: string; endsAt: string; notes: string | null;
};
type AppointmentRow = Omit<AgendaAppointment, "startsAt" | "endsAt"> & { startsAt: Date; endsAt: Date };

export async function getAgendaAppointments(from: string, to: string): Promise<AgendaAppointment[]> {
  const startsAt = new Date(from); const endsAt = new Date(to);
  const maximumRange = 8 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt >= endsAt || endsAt.getTime() - startsAt.getTime() > maximumRange) throw new Error("El rango de la agenda no es válido.");
  const actor = await requestTenantContext();
  const rows = await runAsTenant(sql, actor, (tx) => tx<AppointmentRow[]>`
    SELECT id, site_id AS "siteId", professional_membership_id AS "professionalMembershipId",
      box_id AS "boxId", kind::text AS kind, status::text AS status,
      patient_name AS "patientName", patient_contact AS "patientContact",
      starts_at AS "startsAt", ends_at AS "endsAt", notes
    FROM appointments
    WHERE organization_id = ${actor.organizationId} AND status <> 'cancelled'
      AND starts_at >= ${startsAt} AND starts_at < ${endsAt}
    ORDER BY starts_at ASC
  `);
  return rows.map((row) => ({ ...row, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString() }));
}
