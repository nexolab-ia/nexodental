"use server";

import { redirect } from "next/navigation";
import { sql } from "@/db/client";
import { authorize } from "@/features/tenant-identity/authorize";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

type AgendaOnlineSettings = {
  enabled: boolean;
  slug: string;
  themeColor: string;
  welcomeMessage: string;
  minCancellationHours: number;
  postBookingMessage: string;
  arrivalInstructions: string;
  professionalIds: string[];
};

type OrganizationSettings = {
  agendaOnline?: AgendaOnlineSettings;
  [key: string]: unknown;
};

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_CANCELLATION_HOURS = new Set([1, 2, 4, 12, 24, 48]);

function readText(formData: FormData, name: string, maxLength: number, label: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (value.length > maxLength) {
    throw new Error(`${label} no puede superar los ${maxLength} caracteres.`);
  }
  return value;
}

function readProfessionalIds(formData: FormData) {
  const raw = String(formData.get("professionalIds") ?? "[]");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("La selección de profesionales no es válida.");
  }
  if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) {
    throw new Error("La selección de profesionales no es válida.");
  }
  return [...new Set(value.filter((id) => UUID_PATTERN.test(id)))];
}

export async function updateAgendaOnlineSettings(formData: FormData): Promise<void> {
  const actor = await requestTenantContext();
  authorize(actor, "organization:manage");

  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (slug.length < 3 || !SLUG_PATTERN.test(slug)) {
    throw new Error("Escribe un nombre de URL válido de al menos 3 caracteres, usando letras minúsculas, números o guiones.");
  }

  const themeColor = String(formData.get("themeColor") ?? "").trim();
  if (!HEX_PATTERN.test(themeColor)) {
    throw new Error("Escribe un color hexadecimal válido con el formato #RRGGBB.");
  }

  const minCancellationHours = Number(formData.get("minCancellationHours"));
  if (!ALLOWED_CANCELLATION_HOURS.has(minCancellationHours)) {
    throw new Error("Selecciona un plazo de cancelación válido.");
  }

  const requestedProfessionalIds = readProfessionalIds(formData);
  const professionalIds = await runAsTenant(sql, actor, async (tx) => {
    if (requestedProfessionalIds.length === 0) return [];
    const rows = await tx<Array<{ id: string }>>`
      SELECT id
      FROM memberships
      WHERE id = ANY(${requestedProfessionalIds}::uuid[])
        AND organization_id = ${actor.organizationId}
        AND status = 'active'
        AND role IN ('professional', 'independent_owner', 'organization_admin')
    `;
    return rows.map((row) => row.id);
  });

  const agendaOnline: AgendaOnlineSettings = {
    enabled: formData.get("enabled") === "on",
    slug,
    themeColor: themeColor.toLowerCase(),
    welcomeMessage: readText(formData, "welcomeMessage", 200, "El mensaje de bienvenida"),
    minCancellationHours,
    postBookingMessage: readText(formData, "postBookingMessage", 300, "El mensaje posterior a la reserva"),
    arrivalInstructions: readText(formData, "arrivalInstructions", 500, "Las instrucciones para llegar"),
    professionalIds,
  };

  await runAsTenant(sql, actor, async (tx) => {
    const previous = (await tx<Array<{ settings: OrganizationSettings | null }>>`
      SELECT settings FROM organizations WHERE id = ${actor.organizationId} FOR UPDATE
    `)[0];
    if (!previous) throw new Error("La organización no está disponible.");

    await tx`
      UPDATE organizations SET settings = COALESCE(settings, '{}'::jsonb)
        || jsonb_build_object('agendaOnline', ${tx.json(agendaOnline)})
      WHERE id = ${actor.organizationId}
    `;
    await tx`
      INSERT INTO audit_logs
        (organization_id, actor_membership_id, action, entity, entity_id, before, after, reason)
      VALUES (${actor.organizationId}, ${actor.membershipId}, 'settings.agenda_online_updated', 'organization',
        ${actor.organizationId}, ${tx.json({ agendaOnline: previous.settings?.agendaOnline ?? null })},
        ${tx.json({ agendaOnline })}, 'settings.agenda_online')
    `;
  });

  redirect("/settings/agenda-online?ok=agenda-online");
}
