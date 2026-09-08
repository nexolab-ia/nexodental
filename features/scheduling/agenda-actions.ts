"use server";

import { requestTenantContext } from "@/lib/request-context";
import { sql } from "@/db/client";
import { runAsTenant } from "@/lib/tenancy";
import { loadAgendaAppointments, type AgendaAppointment } from "./agenda-queries";

export type { AgendaAppointment } from "./agenda-queries";

export type AgendaBlock = {
  id: string;
  scope: "clinic" | "box";
  boxId: string | null;
  reason: "meeting" | "training" | "procedure" | "permission" | "holiday" | "maintenance" | "other";
  startsOn: string;
  endsOn: string;
  allDay: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDateRange(from: string, to: string): boolean {
  if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to) || from > to) return false;
  const startsOn = new Date(`${from}T00:00:00.000Z`);
  const endsOn = new Date(`${to}T00:00:00.000Z`);
  return Number.isFinite(startsOn.getTime()) && Number.isFinite(endsOn.getTime()) && startsOn.toISOString().slice(0, 10) === from && endsOn.toISOString().slice(0, 10) === to && endsOn.getTime() - startsOn.getTime() <= 8 * 24 * 60 * 60 * 1000;
}

export async function getAgendaAppointments(from: string, to: string): Promise<AgendaAppointment[]> {
  const startsAt = new Date(from); const endsAt = new Date(to);
  const maximumRange = 8 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt >= endsAt || endsAt.getTime() - startsAt.getTime() > maximumRange) throw new Error("El rango de la agenda no es válido.");
  const actor = await requestTenantContext();
  return loadAgendaAppointments(actor, startsAt.toISOString(), endsAt.toISOString());
}

export async function getAgendaBlocksForRange(fromIso: string, toIso: string): Promise<AgendaBlock[]> {
  if (!validDateRange(fromIso, toIso)) throw new Error("El rango de bloqueos no es válido.");
  const actor = await requestTenantContext();
  return runAsTenant(sql, actor, (tx) => tx<AgendaBlock[]>`
    SELECT id, scope::text AS scope, box_id AS "boxId", reason::text AS reason,
      starts_on::text AS "startsOn", ends_on::text AS "endsOn", all_day AS "allDay",
      starts_at::text AS "startsAt", ends_at::text AS "endsAt"
    FROM agenda_blocks
    WHERE organization_id = ${actor.organizationId}
      AND starts_on <= ${toIso}::date
      AND ends_on >= ${fromIso}::date
    ORDER BY starts_on ASC, starts_at ASC NULLS FIRST
  `);
}
