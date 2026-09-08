import "server-only";

import { sql } from "@/db/client";
import { runAsTenant, type TenantContext } from "@/lib/tenancy";

export type AgendaAppointment = {
  id: string; siteId: string | null; professionalMembershipId: string; boxId: string | null;
  sessionTypeId: string | null; sessionTypeName: string | null;
  kind: "appointment" | "block"; status: "pending" | "confirmed" | "cancelled"; source: string; attendance: string | null; patientName: string;
  patientContact: string | null; startsAt: string; endsAt: string; notes: string | null;
};

type AppointmentRow = Omit<AgendaAppointment, "startsAt" | "endsAt"> & { startsAt: string; endsAt: string };

export async function loadAgendaAppointments(actor: TenantContext, startsAtIso: string, endsAtIso: string): Promise<AgendaAppointment[]> {
  const startsAt = new Date(startsAtIso);
  const endsAt = new Date(endsAtIso);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt >= endsAt) {
    throw new Error("El rango de la agenda no es válido.");
  }

  const rows = await runAsTenant(sql, actor, (tx) => tx<AppointmentRow[]>`
    SELECT a.id, a.site_id AS "siteId", a.professional_membership_id AS "professionalMembershipId",
      a.box_id AS "boxId", a.session_type_id AS "sessionTypeId", st.name AS "sessionTypeName", a.kind::text AS kind, a.status::text AS status,
      a.source, a.attendance,
      a.patient_name AS "patientName", a.patient_contact AS "patientContact",
      a.starts_at::text AS "startsAt", a.ends_at::text AS "endsAt", a.notes
    FROM appointments a
    LEFT JOIN session_types st ON st.id = a.session_type_id AND st.organization_id = a.organization_id
    WHERE a.organization_id = ${actor.organizationId}
      AND a.starts_at >= ${startsAtIso}::timestamptz AND a.starts_at < ${endsAtIso}::timestamptz
    ORDER BY a.starts_at ASC
  `);

  return rows.map((row) => ({
    ...row,
    startsAt: new Date(row.startsAt).toISOString(),
    endsAt: new Date(row.endsAt).toISOString(),
  }));
}
