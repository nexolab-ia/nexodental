"use server";

import { redirect } from "next/navigation";
import { sql } from "@/db/client";
import { authorize } from "@/features/tenant-identity/authorize";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

const TONES = new Set(["formal", "conciso", "detallado", "amigable"]);
const EVENTS = ["reserveNew", "confirmed", "cancelled", "rescheduled"] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Channels = { email: boolean; mobile: boolean };

function parseObject(formData: FormData, field: string, error: string): Record<string, unknown> {
  const raw = formData.get(field);
  if (typeof raw !== "string") throw new Error(error);
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new Error(error); }
}

function strictBoolean(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new Error(`${label} debe ser verdadero o falso.`);
  return value;
}

function readChannels(value: unknown, label: string): Channels {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} no es válido.`);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "email" && key !== "mobile")) throw new Error(`${label} contiene canales no válidos.`);
  return { email: strictBoolean(record.email, `Email de ${label}`), mobile: strictBoolean(record.mobile, `Celular de ${label}`) };
}

async function persistBranch(branch: "patient" | "team", value: unknown, action: string) {
  const actor = await requestTenantContext();
  authorize(actor, "organization:manage");
  await runAsTenant(sql, actor, async (tx) => {
    const previous = (await tx<Array<{ notifications: Record<string, unknown> | null }>>`
      SELECT settings->'notifications' AS notifications FROM organizations
      WHERE id = ${actor.organizationId} FOR UPDATE
    `)[0];
    if (!previous) throw new Error("La organización no está disponible.");
    const notifications = { ...(previous.notifications ?? {}), [branch]: value };
    const j = JSON.stringify(notifications);
    const before = JSON.stringify({ notifications: previous.notifications });
    const after = JSON.stringify({ notifications });
    await tx`UPDATE organizations SET settings = COALESCE(settings, '{}'::jsonb)
      || jsonb_build_object('notifications', ${j}::text::jsonb) WHERE id = ${actor.organizationId}`;
    await tx`INSERT INTO audit_logs
      (organization_id, actor_membership_id, action, entity, entity_id, before, after, reason)
      VALUES (${actor.organizationId}, ${actor.membershipId}, ${action}, 'organization', ${actor.organizationId},
      ${before}::text::jsonb, ${after}::text::jsonb, ${action})`;
  });
}

export async function updatePatientNotifications(formData: FormData): Promise<void> {
  const value = parseObject(formData, "patient", "La configuración para pacientes no es válida.");
  const reminderTime = value.reminderTime;
  const whatsappTone = value.whatsappTone;
  const whatsappMessage = value.whatsappMessage;
  if (typeof reminderTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) throw new Error("Escribe una hora de recordatorio válida en formato HH:MM.");
  if (typeof whatsappTone !== "string" || !TONES.has(whatsappTone)) throw new Error("Selecciona un tono de WhatsApp válido.");
  if (typeof whatsappMessage !== "string") throw new Error("El mensaje de WhatsApp no es válido.");
  if (whatsappMessage.length > 1600) throw new Error("El mensaje de WhatsApp no puede superar los 1600 caracteres.");
  const patient = {
    confirmEmailEnabled: strictBoolean(value.confirmEmailEnabled, "Correos de confirmación"),
    reminderEmailEnabled: strictBoolean(value.reminderEmailEnabled, "Correos de recordatorio"), reminderTime,
    whatsappConfirmEnabled: strictBoolean(value.whatsappConfirmEnabled, "Mensaje de confirmación por WhatsApp"),
    whatsappTone, whatsappMessage,
  };
  await persistBranch("patient", patient, "settings.notifications_patient_updated");
  redirect("/settings/notifications?ok=patient");
}

export async function updateTeamNotifications(formData: FormData): Promise<void> {
  const value = parseObject(formData, "team", "La configuración para el equipo no es válida.");
  const rawEvents = value.professionalEvents;
  const rawOtherUsers = value.otherUsers;
  if (typeof rawEvents !== "object" || rawEvents === null || Array.isArray(rawEvents)) throw new Error("Los avisos del profesional no son válidos.");
  if (typeof rawOtherUsers !== "object" || rawOtherUsers === null || Array.isArray(rawOtherUsers)) throw new Error("Los usuarios que reciben avisos no son válidos.");
  const eventRecord = rawEvents as Record<string, unknown>;
  if (Object.keys(eventRecord).some((key) => !EVENTS.includes(key as typeof EVENTS[number]))) throw new Error("Los avisos del profesional contienen eventos no válidos.");
  const professionalEvents = Object.fromEntries(EVENTS.map((event) => [event, readChannels(eventRecord[event], event)]));

  const actor = await requestTenantContext();
  authorize(actor, "organization:manage");
  const requestedIds = Object.keys(rawOtherUsers).filter((id) => UUID_PATTERN.test(id));
  const validRows = requestedIds.length === 0 ? [] : await runAsTenant(sql, actor, (tx) => tx<Array<{ id: string }>>`
    SELECT id FROM memberships WHERE id = ANY(${requestedIds}::uuid[])
      AND organization_id = ${actor.organizationId} AND status = 'active'
      AND role IN ('organization_admin', 'professional', 'independent_owner')
  `);
  const validIds = new Set(validRows.map((row) => row.id));
  const otherUsers = Object.fromEntries(Object.entries(rawOtherUsers).flatMap(([id, channels]) => (
    validIds.has(id) ? [[id, readChannels(channels, "avisos del usuario")]] : []
  )));
  await persistBranch("team", { professionalEvents, otherUsers }, "settings.notifications_team_updated");
  redirect("/settings/notifications?ok=team");
}
