import type { Sql, TransactionSql } from "postgres";
import { authorize, can, type Capability } from "@/features/tenant-identity/authorize";
import type { TenantContext } from "@/lib/tenancy";
import { assertInterval, assertSantiagoTimezone, isWithinHours, localWeekday, localTime, SchedulingConflictError, SchedulingValidationError, type AppointmentStatus, type Weekday } from "./domain";
import {scheduleConfiguredAppointmentNotice} from "@/features/notifications/integration";

export type AppointmentInput = { organizationId: string; siteId?: string | null; professionalMembershipId: string; boxId?: string | null; patientName: string; patientContact?: string | null; startsAt: Date; endsAt: Date; status?: AppointmentStatus; source?: "internal" | "public"; notes?: string | null };
type HourRow = { weekday: Weekday; startsAt: string; endsAt: string };
type SchedulingSql = Sql | TransactionSql;

function assertSchedulingAccess(actor: TenantContext, siteId?: string | null): void {
  const capability: Capability = actor.role === "professional" ? "appointment:own" : "appointment:schedule";
  if (!can({ ...actor, resourceSiteId: siteId ?? undefined, ownsAppointment: true }, capability)) throw new SchedulingValidationError("No tienes permisos para modificar esta agenda.");
}

async function availability(sql: SchedulingSql, input: AppointmentInput): Promise<HourRow[]> {
  const weekday = localWeekday(input.startsAt);
  return sql<HourRow[]>`SELECT weekday, starts_at::text AS "startsAt", ends_at::text AS "endsAt" FROM professional_availability WHERE organization_id = ${input.organizationId} AND professional_membership_id = ${input.professionalMembershipId} AND site_id IS NOT DISTINCT FROM ${input.siteId ?? null} AND weekday = ${weekday}`;
}

function cleanInput(input: AppointmentInput): void {
  assertSantiagoTimezone("America/Santiago"); assertInterval(input.startsAt, input.endsAt);
  if (!input.patientName.trim()) throw new SchedulingValidationError("Ingresa el nombre de la persona paciente.");
}

export async function createAppointment(sql: SchedulingSql, actor: TenantContext, input: AppointmentInput): Promise<string> {
  cleanInput(input); assertSchedulingAccess(actor, input.siteId);
  const hours = await availability(sql, input);
  if (!isWithinHours(input.startsAt, input.endsAt, hours)) throw new SchedulingValidationError("Ese horario está fuera de la disponibilidad configurada.");
  try {
    const rows = await sql<{ id: string }[]>`INSERT INTO appointments (organization_id, site_id, professional_membership_id, box_id, patient_name, patient_contact, starts_at, ends_at, status, source, notes) VALUES (${input.organizationId}, ${input.siteId ?? null}, ${input.professionalMembershipId}, ${input.boxId ?? null}, ${input.patientName.trim()}, ${input.patientContact?.trim() || null}, ${input.startsAt.toISOString()}::timestamptz, ${input.endsAt.toISOString()}::timestamptz, ${input.status ?? "confirmed"}, ${input.source ?? "internal"}, ${input.notes ?? null}) RETURNING id`;
    const id = rows[0]?.id; if (!id) throw new Error("No se pudo crear la cita.");
    await sql`INSERT INTO appointment_history (organization_id, appointment_id, actor_membership_id, action, after) VALUES (${input.organizationId}, ${id}, ${actor.membershipId}, 'created', ${JSON.stringify({ startsAt: input.startsAt.toISOString(), endsAt: input.endsAt.toISOString() as string})}::jsonb)`;
    await scheduleConfiguredAppointmentNotice(sql,actor,id,"booking");
    return id;
  } catch (error) {
    if (error instanceof SchedulingValidationError) throw error;
    if (error instanceof Error && /excl|overlap|conflict/i.test(error.message)) throw new SchedulingConflictError("Ese horario acaba de ser reservado. Elige otro disponible.");
    throw error;
  }
}

export async function rescheduleAppointment(sql: SchedulingSql, actor: TenantContext, appointmentId: string, input: Pick<AppointmentInput, "startsAt" | "endsAt" | "siteId" | "boxId" | "professionalMembershipId">): Promise<void> {
  assertSchedulingAccess(actor, input.siteId); assertInterval(input.startsAt, input.endsAt);
  const before = await sql<{ organizationId: string; startsAt: Date; endsAt: Date }[]>`SELECT organization_id AS "organizationId", starts_at AS "startsAt", ends_at AS "endsAt" FROM appointments WHERE id = ${appointmentId} AND status <> 'cancelled'`;
  if (!before[0]) throw new SchedulingValidationError("La cita no está disponible para reagendar.");
  const hours = await availability(sql, { ...input, organizationId: before[0].organizationId, patientName: "reschedule" });
  if (!isWithinHours(input.startsAt, input.endsAt, hours)) throw new SchedulingValidationError("Ese horario está fuera de la disponibilidad configurada.");
  try {
    await sql`UPDATE appointments SET starts_at = ${input.startsAt.toISOString()}::timestamptz, ends_at = ${input.endsAt.toISOString()}::timestamptz, site_id = ${input.siteId ?? null}, box_id = ${input.boxId ?? null}, professional_membership_id = ${input.professionalMembershipId}, updated_at = now() WHERE id = ${appointmentId}`;
    await sql`INSERT INTO appointment_history (organization_id, appointment_id, actor_membership_id, action, before, after) VALUES (${before[0].organizationId}, ${appointmentId}, ${actor.membershipId}, 'rescheduled', ${JSON.stringify({ startsAt: before[0].startsAt.toISOString(), endsAt: before[0].endsAt.toISOString() })}::jsonb, ${JSON.stringify({ startsAt: input.startsAt.toISOString(), endsAt: input.endsAt.toISOString() })}::jsonb)`;
    await scheduleConfiguredAppointmentNotice(sql,actor,appointmentId,"reschedule");
  } catch (error) { if (error instanceof Error && /excl|overlap|conflict/i.test(error.message)) throw new SchedulingConflictError("Ese horario acaba de ser reservado. Elige otro disponible."); throw error; }
}

export async function cancelAppointment(sql: SchedulingSql, actor: TenantContext, appointmentId: string, reason: string): Promise<void> {
  assertSchedulingAccess(actor); if (!reason.trim()) throw new SchedulingValidationError("Indica el motivo de la cancelación.");
  const rows = await sql<{ organizationId: string; status: AppointmentStatus }[]>`UPDATE appointments SET status = 'cancelled', cancellation_reason = ${reason.trim()}, updated_at = now() WHERE id = ${appointmentId} AND status <> 'cancelled' RETURNING organization_id AS "organizationId", status`;
  if (!rows[0]) throw new SchedulingValidationError("La cita no está disponible para cancelar.");
  await sql`INSERT INTO appointment_history (organization_id, appointment_id, actor_membership_id, action, after, reason) VALUES (${rows[0].organizationId}, ${appointmentId}, ${actor.membershipId}, 'cancelled', ${JSON.stringify({ status: "cancelled" })}::jsonb, ${reason.trim()})`;
  await scheduleConfiguredAppointmentNotice(sql,actor,appointmentId,"cancellation");
}

type MutableAppointment={organizationId:string;siteId:string|null;professionalMembershipId:string;kind:"appointment"|"block";status:AppointmentStatus;attendance:"attended"|"missed"|null};
async function mutableAppointment(sql:SchedulingSql,actor:TenantContext,appointmentId:string):Promise<MutableAppointment>{
 const row=(await sql<MutableAppointment[]>`SELECT organization_id AS "organizationId",site_id AS "siteId",professional_membership_id AS "professionalMembershipId",kind,status,attendance FROM appointments WHERE id=${appointmentId}`)[0];
 if(!row)throw new SchedulingValidationError("La cita no está disponible.");
 if(actor.role==="professional"){if(row.professionalMembershipId!==actor.membershipId)throw new SchedulingValidationError("No tienes permisos para modificar esta agenda.");}
 else {try{authorize({...actor,resourceSiteId:row.siteId},"appointment:schedule");}catch{throw new SchedulingValidationError("No tienes permisos para modificar esta agenda.");}}
 return row;
}
export async function confirmAppointment(sql:SchedulingSql,actor:TenantContext,appointmentId:string):Promise<void>{
 const before=await mutableAppointment(sql,actor,appointmentId);if(before.kind!=="appointment"||before.status!=="pending")throw new SchedulingValidationError("La cita no está pendiente de confirmación.");
 await sql`UPDATE appointments SET status='confirmed',updated_at=now() WHERE id=${appointmentId}`;
 await sql`INSERT INTO appointment_history(organization_id,appointment_id,actor_membership_id,action,before,after) VALUES(${before.organizationId},${appointmentId},${actor.membershipId},'status.confirmed',${JSON.stringify({status:before.status})}::jsonb,${JSON.stringify({status:"confirmed"})}::jsonb)`;
}
export async function markAppointmentAttendance(sql:SchedulingSql,actor:TenantContext,appointmentId:string,attendance:"attended"|"missed"):Promise<void>{
 if(attendance!=="attended"&&attendance!=="missed")throw new SchedulingValidationError("La asistencia no es válida.");
 const before=await mutableAppointment(sql,actor,appointmentId);if(before.kind!=="appointment"||before.status==="cancelled")throw new SchedulingValidationError("No puedes marcar asistencia en esta cita.");
 await sql`UPDATE appointments SET attendance=${attendance},updated_at=now() WHERE id=${appointmentId}`;
 await sql`INSERT INTO appointment_history(organization_id,appointment_id,actor_membership_id,action,before,after) VALUES(${before.organizationId},${appointmentId},${actor.membershipId},'attendance.marked',${JSON.stringify({attendance:before.attendance})}::jsonb,${JSON.stringify({attendance})}::jsonb)`;
}

export { localTime };
