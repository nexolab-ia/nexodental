import type { Sql, TransactionSql } from "postgres";
import { authorize } from "@/features/tenant-identity/authorize";
import type { TenantContext } from "@/lib/tenancy";

type MemberSql = Sql | TransactionSql;
export const absenceTypes = ["vacation", "medical_leave", "personal", "holiday", "other"] as const;
export const absenceDurations = ["full_day", "specific_hours"] as const;
export type AbsenceType = (typeof absenceTypes)[number];
export type AbsenceDuration = (typeof absenceDurations)[number];
export type MemberAbsence = { id: string; membershipId: string; absenceType: AbsenceType; startsOn: string; endsOn: string; duration: AbsenceDuration; startsAt: string | null; endsAt: string | null; description: string | null; createdAt: string };
export type MemberAbsenceInput = { absenceType: AbsenceType; startsOn: string; endsOn: string; duration: AbsenceDuration; startsAt?: string | null; endsAt?: string | null; description?: string | null };
export class AbsenceValidationError extends Error {}
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function validateId(value: string): void { if (!UUID_PATTERN.test(value)) throw new AbsenceValidationError("El identificador no es válido."); }
function validDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
export function validateAbsenceInput(input: MemberAbsenceInput): Required<Omit<MemberAbsenceInput, "description">> & { description: string | null } {
  if (!absenceTypes.includes(input.absenceType)) throw new AbsenceValidationError("El tipo de ausencia no es válido.");
  if (!absenceDurations.includes(input.duration)) throw new AbsenceValidationError("La duración de la ausencia no es válida.");
  if (!validDate(input.startsOn) || !validDate(input.endsOn) || input.startsOn > input.endsOn) throw new AbsenceValidationError("Selecciona un rango de fechas válido.");
  let startsAt: string | null = null; let endsAt: string | null = null;
  if (input.duration === "specific_hours") {
    if (input.startsOn !== input.endsOn) throw new AbsenceValidationError("El horario específico solo puede registrarse para un día.");
    if (!input.startsAt || !input.endsAt || !TIME_PATTERN.test(input.startsAt) || !TIME_PATTERN.test(input.endsAt) || input.startsAt >= input.endsAt) throw new AbsenceValidationError("La hora de fin debe ser posterior a la hora de inicio.");
    startsAt = input.startsAt; endsAt = input.endsAt;
  }
  const description = input.description?.trim() || null;
  if (description && description.length > 2000) throw new AbsenceValidationError("La descripción no puede superar los 2000 caracteres.");
  return { ...input, startsAt, endsAt, description };
}
export async function getMemberAbsences(sql: MemberSql, actor: TenantContext, membershipId: string): Promise<MemberAbsence[]> {
  validateId(membershipId);
  const member = await sql<{ id: string }[]>`SELECT id FROM memberships WHERE id=${membershipId} AND organization_id=${actor.organizationId}`;
  if (!member[0]) throw new AbsenceValidationError("El usuario no está disponible en esta organización.");
  return sql<MemberAbsence[]>`SELECT id,membership_id AS "membershipId",absence_type AS "absenceType",starts_on::text AS "startsOn",ends_on::text AS "endsOn",duration,starts_at::text AS "startsAt",ends_at::text AS "endsAt",description,created_at::text AS "createdAt" FROM absences WHERE organization_id=${actor.organizationId} AND membership_id=${membershipId} ORDER BY starts_on DESC,created_at DESC`;
}
export async function createMemberAbsence(sql: MemberSql, actor: TenantContext, membershipId: string, input: MemberAbsenceInput): Promise<MemberAbsence> {
  authorize(actor, "membership:manage"); validateId(membershipId); const valid = validateAbsenceInput(input);
  const member = await sql<{ id: string }[]>`SELECT id FROM memberships WHERE id=${membershipId} AND organization_id=${actor.organizationId} AND status <> 'removed'`;
  if (!member[0]) throw new AbsenceValidationError("El usuario no está disponible en esta organización.");
  const rows = await sql<MemberAbsence[]>`INSERT INTO absences(organization_id,membership_id,absence_type,starts_on,ends_on,duration,starts_at,ends_at,description) VALUES(${actor.organizationId},${membershipId},${valid.absenceType},${valid.startsOn},${valid.endsOn},${valid.duration},${valid.startsAt},${valid.endsAt},${valid.description}) RETURNING id,membership_id AS "membershipId",absence_type AS "absenceType",starts_on::text AS "startsOn",ends_on::text AS "endsOn",duration,starts_at::text AS "startsAt",ends_at::text AS "endsAt",description,created_at::text AS "createdAt"`;
  if (!rows[0]) throw new Error("No se pudo crear la ausencia."); return rows[0];
}
export async function deleteMemberAbsence(sql: MemberSql, actor: TenantContext, absenceId: string): Promise<{ ok: true }> {
  authorize(actor, "membership:manage"); validateId(absenceId);
  const rows = await sql<{ id: string }[]>`DELETE FROM absences WHERE id=${absenceId} AND organization_id=${actor.organizationId} RETURNING id`;
  if (!rows[0]) throw new AbsenceValidationError("La ausencia no está disponible."); return { ok: true };
}
