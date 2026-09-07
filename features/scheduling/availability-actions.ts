import type { Sql, TransactionSql } from "postgres";
import { authorize, can } from "@/features/tenant-identity/authorize";
import type { TenantContext } from "@/lib/tenancy";
import { SchedulingValidationError, weekdays, type Weekday } from "./domain";

type SchedulingSql = Sql | TransactionSql;
export type AvailabilityPeriod = { startsAt: string; endsAt: string };
export type AvailabilityDay = { weekday: Weekday; siteId: string | null; periods: AvailabilityPeriod[] };
export type AvailabilityDayInput = { weekday: Weekday; periods: AvailabilityPeriod[] };

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function authorizeAvailability(actor: TenantContext, membershipId: string): void {
  if (can(actor, "appointment:schedule")) {
    authorize(actor, "appointment:schedule");
    return;
  }
  authorize({ ...actor, ownsAppointment: actor.role === "professional" && actor.membershipId === membershipId }, "appointment:own");
}

function validateDays(days: readonly AvailabilityDayInput[]): void {
  const seen = new Set<Weekday>();
  for (const day of days) {
    if (!weekdays.includes(day.weekday)) throw new SchedulingValidationError("El día seleccionado no es válido.");
    if (seen.has(day.weekday)) throw new SchedulingValidationError("Cada día debe aparecer una sola vez.");
    seen.add(day.weekday);
    for (const period of day.periods) {
      if (!TIME_PATTERN.test(period.startsAt) || !TIME_PATTERN.test(period.endsAt)) {
        throw new SchedulingValidationError("Ingresa las horas en formato HH:MM.");
      }
      if (period.startsAt >= period.endsAt) {
        throw new SchedulingValidationError("La hora de fin debe ser posterior a la hora de inicio.");
      }
    }
  }
}

export async function getProfessionalAvailability(sql: SchedulingSql, actor: TenantContext, membershipId: string): Promise<AvailabilityDay[]> {
  authorizeAvailability(actor, membershipId);
  const rows = await sql<Array<{ weekday: Weekday; siteId: string | null; startsAt: string; endsAt: string }>>`
    SELECT weekday, site_id AS "siteId", starts_at::text AS "startsAt", ends_at::text AS "endsAt"
    FROM professional_availability
    WHERE organization_id = ${actor.organizationId}
      AND professional_membership_id = ${membershipId}
    ORDER BY weekday, starts_at
  `;
  return weekdays.map((weekday) => {
    const dayRows = rows.filter((row) => row.weekday === weekday);
    return {
      weekday,
      siteId: dayRows[0]?.siteId ?? null,
      periods: dayRows.map(({ startsAt, endsAt }) => ({ startsAt: startsAt.slice(0, 5), endsAt: endsAt.slice(0, 5) })),
    };
  });
}

export async function saveProfessionalAvailability(sql: SchedulingSql, actor: TenantContext, membershipId: string, days: readonly AvailabilityDayInput[]): Promise<{ ok: true }> {
  authorizeAvailability(actor, membershipId);
  validateDays(days);
  const membership = await sql<Array<{ id: string }>>`
    SELECT id FROM memberships
    WHERE id = ${membershipId} AND organization_id = ${actor.organizationId} AND status = 'active'
  `;
  if (!membership[0]) throw new SchedulingValidationError("El usuario no está disponible en esta organización.");

  await sql`
    DELETE FROM professional_availability
    WHERE organization_id = ${actor.organizationId}
      AND professional_membership_id = ${membershipId}
  `;
  // This editor configures one organization-wide schedule, so replacement rows intentionally use a null site.
  for (const day of days) {
    for (const period of day.periods) {
      await sql`
        INSERT INTO professional_availability
          (organization_id, professional_membership_id, site_id, weekday, starts_at, ends_at)
        VALUES (${actor.organizationId}, ${membershipId}, NULL, ${day.weekday}, ${period.startsAt}, ${period.endsAt})
      `;
    }
  }
  return { ok: true };
}
