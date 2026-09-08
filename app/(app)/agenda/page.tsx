import { AgendaClient } from "@/features/scheduling/agenda-client";
import { loadAgendaAppointments } from "@/features/scheduling/agenda-queries";
import { addLocalDays, santiagoDateKey, santiagoDateKeyToUtc, startOfLocalWeek } from "@/features/scheduling/domain";
import { sql } from "@/db/client";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

type ProfessionalRow = { id: string; name: string };
type BoxRow = { id: string; name: string };
type AvailabilityRow = { professionalMembershipId: string; weekday: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"; startsAt: string; endsAt: string };

export default async function AgendaPage() {
  const actor = await requestTenantContext();
  const [professionals, boxes, availability] = await runAsTenant(sql, actor, async (tx) => Promise.all([
    tx<ProfessionalRow[]>`SELECT m.id, u.name FROM memberships m INNER JOIN users u ON u.id = m.user_id WHERE m.organization_id = ${actor.organizationId} AND m.status = 'active' AND m.role IN ('professional', 'independent_owner', 'organization_admin') ORDER BY u.name ASC`,
    tx<BoxRow[]>`SELECT id, name FROM boxes WHERE organization_id = ${actor.organizationId} AND active ORDER BY name ASC`,
    tx<AvailabilityRow[]>`SELECT professional_membership_id AS "professionalMembershipId", weekday, starts_at::text AS "startsAt", ends_at::text AS "endsAt" FROM professional_availability WHERE organization_id = ${actor.organizationId}`,
  ]));
  const initialDate = santiagoDateKey(new Date()); const monday = startOfLocalWeek(initialDate);
  const initialAppointments = await loadAgendaAppointments(actor, santiagoDateKeyToUtc(monday), santiagoDateKeyToUtc(addLocalDays(monday, 7)));
  const enrichedProfessionals = professionals.map((professional) => ({ ...professional, availability: availability.filter((item) => item.professionalMembershipId === professional.id).map(({ weekday, startsAt, endsAt }) => ({ weekday, startsAt: startsAt.slice(0, 5), endsAt: endsAt.slice(0, 5) })) }));
  return <main><AgendaClient professionals={enrichedProfessionals} boxes={boxes} initialAppointments={initialAppointments} initialDate={initialDate} /></main>;
}
