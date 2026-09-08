"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/db/client";
import { authorize } from "@/features/tenant-identity/authorize";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

const agendaBlockScopes = ["clinic", "box"] as const;
const agendaBlockReasons = ["meeting", "training", "procedure", "permission", "holiday", "maintenance", "other"] as const;

export type AgendaBlockScope = (typeof agendaBlockScopes)[number];
export type AgendaBlockReason = (typeof agendaBlockReasons)[number];
export type AgendaBlock = {
  id: string;
  scope: AgendaBlockScope;
  boxId: string | null;
  boxName: string | null;
  reason: AgendaBlockReason;
  startsOn: string;
  endsOn: string;
  allDay: boolean;
  startsAt: string | null;
  endsAt: string | null;
  description: string | null;
  createdAt: string;
};
export type AgendaBlockInput = {
  scope: AgendaBlockScope;
  boxId?: string | null;
  reason: AgendaBlockReason;
  startsOn: string;
  endsOn: string;
  allDay: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  description?: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function validDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validateInput(input: AgendaBlockInput) {
  if (!agendaBlockScopes.includes(input.scope)) throw new Error("Selecciona qué se bloqueará.");
  if (!agendaBlockReasons.includes(input.reason)) throw new Error("Selecciona un motivo válido.");
  if (!validDate(input.startsOn) || !validDate(input.endsOn) || input.startsOn > input.endsOn) throw new Error("Selecciona un rango de fechas válido.");
  const boxId = input.scope === "box" ? input.boxId?.trim() || null : null;
  if (input.scope === "box" && (!boxId || !UUID_PATTERN.test(boxId))) throw new Error("Selecciona un box válido.");
  let startsAt: string | null = null;
  let endsAt: string | null = null;
  if (!input.allDay) {
    if (!input.startsAt || !input.endsAt || !TIME_PATTERN.test(input.startsAt) || !TIME_PATTERN.test(input.endsAt) || input.startsAt >= input.endsAt) throw new Error("La hora de fin debe ser posterior a la hora de inicio.");
    startsAt = input.startsAt;
    endsAt = input.endsAt;
  }
  const description = input.description?.trim() || null;
  if (description && description.length > 2000) throw new Error("La descripción no puede superar los 2000 caracteres.");
  return { ...input, boxId, startsAt, endsAt, description };
}

export async function getAgendaBlocks(): Promise<AgendaBlock[]> {
  const actor = await requestTenantContext();
  return runAsTenant(sql, actor, (tx) => tx<AgendaBlock[]>`
    SELECT ab.id, ab.scope, ab.box_id AS "boxId", b.name AS "boxName", ab.reason,
      ab.starts_on::text AS "startsOn", ab.ends_on::text AS "endsOn", ab.all_day AS "allDay",
      ab.starts_at::text AS "startsAt", ab.ends_at::text AS "endsAt", ab.description,
      ab.created_at::text AS "createdAt"
    FROM agenda_blocks ab
    LEFT JOIN boxes b ON b.id = ab.box_id AND b.organization_id = ab.organization_id
    WHERE ab.organization_id = ${actor.organizationId}
    ORDER BY ab.starts_on DESC, ab.created_at DESC
  `);
}

export async function createAgendaBlock(input: AgendaBlockInput): Promise<AgendaBlock> {
  const actor = await requestTenantContext();
  authorize(actor, "operations:manage");
  const valid = validateInput(input);
  const created = await runAsTenant(sql, actor, async (tx) => {
    if (valid.boxId) {
      const box = (await tx<{ id: string }[]>`SELECT id FROM boxes WHERE id = ${valid.boxId} AND organization_id = ${actor.organizationId} AND active`)[0];
      if (!box) throw new Error("El box seleccionado no está disponible.");
    }
    const row = (await tx<AgendaBlock[]>`
      INSERT INTO agenda_blocks
        (organization_id, scope, box_id, reason, starts_on, ends_on, all_day, starts_at, ends_at, description)
      VALUES
        (${actor.organizationId}, ${valid.scope}, ${valid.boxId}, ${valid.reason}, ${valid.startsOn}::date,
          ${valid.endsOn}::date, ${valid.allDay}, ${valid.startsAt}::time, ${valid.endsAt}::time, ${valid.description})
      RETURNING id, scope, box_id AS "boxId", NULL::text AS "boxName", reason,
        starts_on::text AS "startsOn", ends_on::text AS "endsOn", all_day AS "allDay",
        starts_at::text AS "startsAt", ends_at::text AS "endsAt", description, created_at::text AS "createdAt"
    `)[0];
    if (!row) throw new Error("No se pudo crear el bloqueo.");
    await tx`
      INSERT INTO audit_logs
        (organization_id, actor_membership_id, action, entity, entity_id, after, reason)
      VALUES
        (${actor.organizationId}, ${actor.membershipId}, 'agenda_block.created', 'agenda_block', ${row.id},
          ${JSON.stringify({ scope: row.scope, boxId: row.boxId, reason: row.reason, startsOn: row.startsOn, endsOn: row.endsOn, allDay: row.allDay, startsAt: row.startsAt, endsAt: row.endsAt, description: row.description })}::jsonb,
          'settings.agenda_blocks')
    `;
    return row;
  });
  revalidatePath("/settings/bloqueos");
  return created;
}

export async function deleteAgendaBlock(id: string): Promise<{ ok: true }> {
  const actor = await requestTenantContext();
  authorize(actor, "operations:manage");
  if (!UUID_PATTERN.test(id)) throw new Error("El identificador del bloqueo no es válido.");
  await runAsTenant(sql, actor, async (tx) => {
    const removed = (await tx<AgendaBlock[]>`
      DELETE FROM agenda_blocks
      WHERE id = ${id} AND organization_id = ${actor.organizationId}
      RETURNING id, scope, box_id AS "boxId", NULL::text AS "boxName", reason,
        starts_on::text AS "startsOn", ends_on::text AS "endsOn", all_day AS "allDay",
        starts_at::text AS "startsAt", ends_at::text AS "endsAt", description, created_at::text AS "createdAt"
    `)[0];
    if (!removed) throw new Error("El bloqueo ya no está disponible.");
    await tx`
      INSERT INTO audit_logs
        (organization_id, actor_membership_id, action, entity, entity_id, before, reason)
      VALUES
        (${actor.organizationId}, ${actor.membershipId}, 'agenda_block.deleted', 'agenda_block', ${removed.id},
          ${JSON.stringify({ scope: removed.scope, boxId: removed.boxId, reason: removed.reason, startsOn: removed.startsOn, endsOn: removed.endsOn, allDay: removed.allDay, startsAt: removed.startsAt, endsAt: removed.endsAt, description: removed.description })}::jsonb,
          'settings.agenda_blocks')
    `;
  });
  revalidatePath("/settings/bloqueos");
  return { ok: true };
}
