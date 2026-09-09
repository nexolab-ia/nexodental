import { AgendaClient } from "@/features/scheduling/agenda-client";
import type { AgendaBlock } from "@/features/scheduling/agenda-actions";
import { loadAgendaAppointments } from "@/features/scheduling/agenda-queries";
import { addLocalDays, santiagoDateKey, santiagoDateKeyToUtc, startOfLocalWeek } from "@/features/scheduling/domain";
import { sql } from "@/db/client";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

type ProfessionalRow = { id: string; name: string };
type BoxRow = { id: string; name: string };
type PatientRow = { id: string; firstName: string; lastName: string; email: string | null; phone: string | null };
type SessionTypeRow = { id: string; name: string; durationMinutes: number };
type ConvenioRow = { id: string; name: string };
type AvailabilityRow = { professionalMembershipId: string; weekday: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"; startsAt: string; endsAt: string };
type OrganizationSettings = { calendar?: { blockDuration?: number } };

export default async function AgendaPage() {
  const actor = await requestTenantContext();
  const [professionals, boxes, availability, patients, organization, sessionTypes, convenios] = await runAsTenant(sql, actor, async (tx) => Promise.all([
    tx<ProfessionalRow[]>`SELECT m.id, u.name FROM memberships m INNER JOIN users u ON u.id = m.user_id WHERE m.organization_id = ${actor.organizationId} AND m.status = 'active' AND m.role IN ('professional', 'independent_owner', 'organization_admin') ORDER BY u.name ASC`,
    tx<BoxRow[]>`SELECT id, name FROM boxes WHERE organization_id = ${actor.organizationId} AND active ORDER BY name ASC`,
    tx<AvailabilityRow[]>`SELECT professional_membership_id AS "professionalMembershipId", weekday, starts_at::text AS "startsAt", ends_at::text AS "endsAt" FROM professional_availability WHERE organization_id = ${actor.organizationId}`,
    tx<PatientRow[]>`SELECT id, first_name AS "firstName", last_name AS "lastName", email, phone FROM patients WHERE organization_id = ${actor.organizationId} ORDER BY first_name, last_name`,
    tx<Array<{ settings: OrganizationSettings | null }>>`SELECT settings FROM organizations WHERE id = ${actor.organizationId}`,
    tx<SessionTypeRow[]>`SELECT id, name, duration_minutes AS "durationMinutes" FROM session_types WHERE organization_id = ${actor.organizationId} AND active ORDER BY name ASC`,
    tx<ConvenioRow[]>`SELECT id, name FROM convenios WHERE organization_id = ${actor.organizationId} AND is_active ORDER BY name`,
  ]));
  const initialDate = santiagoDateKey(new Date()); const monday = startOfLocalWeek(initialDate);
  const rangeEnd = addLocalDays(monday, 7);
  const [initialAppointments, blocks] = await Promise.all([
    loadAgendaAppointments(actor, santiagoDateKeyToUtc(monday).toISOString(), santiagoDateKeyToUtc(rangeEnd).toISOString()),
    runAsTenant(sql, actor, (tx) => tx<AgendaBlock[]>`
      SELECT id, scope::text AS scope, box_id AS "boxId", reason::text AS reason,
        starts_on::text AS "startsOn", ends_on::text AS "endsOn", all_day AS "allDay",
        starts_at::text AS "startsAt", ends_at::text AS "endsAt"
      FROM agenda_blocks
      WHERE organization_id = ${actor.organizationId}
        AND starts_on <= ${rangeEnd}::date
        AND ends_on >= ${monday}::date
      ORDER BY starts_on ASC, starts_at ASC NULLS FIRST
    `),
  ]);
  const enrichedProfessionals = professionals.map((professional) => ({ ...professional, availability: availability.filter((item) => item.professionalMembershipId === professional.id).map(({ weekday, startsAt, endsAt }) => ({ weekday, startsAt: startsAt.slice(0, 5), endsAt: endsAt.slice(0, 5) })) }));
  const agendaPatients = patients.map((patient) => ({ id: patient.id, name: `${patient.firstName} ${patient.lastName}`.trim(), email: patient.email, phone: patient.phone }));
  const blockDuration = organization[0]?.settings?.calendar?.blockDuration ?? 30;
  return <main><AgendaClient professionals={enrichedProfessionals} boxes={boxes} patients={agendaPatients} convenios={convenios} sessionTypes={sessionTypes} blockDuration={blockDuration} initialAppointments={initialAppointments} blocks={blocks} initialDate={initialDate} /></main>;
}
