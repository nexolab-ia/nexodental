"use server";

import { redirect } from "next/navigation";
import { sql } from "@/db/client";
import { authorize } from "@/features/tenant-identity/authorize";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

type ContactSettings = { country?: string; city?: string; address?: string; primaryPhone?: string; secondaryPhone?: string; contactEmail?: string };
type ScheduleSettings = { openTime?: string; closeTime?: string };
type OrganizationSettings = {
  contact?: ContactSettings;
  schedule?: ScheduleSettings;
  logo?: string;
  [key: string]: unknown;
};

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const PHONE_PATTERN = /^[\d +-]{6,20}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const LOGO_PATTERN = /^data:image\/(?:png|jpeg|webp);base64,/;

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function updateOrganizationProfile(formData: FormData): Promise<void> {
  const actor = await requestTenantContext();
  authorize(actor, "organization:manage");
  const name = field(formData, "name");
  const city = field(formData, "city");
  const address = field(formData, "address");
  const primaryPhone = field(formData, "primaryPhone");
  const secondaryPhone = field(formData, "secondaryPhone");
  const contactEmail = field(formData, "contactEmail").toLowerCase();
  const logo = field(formData, "logo") || null;
  const logoClear = field(formData, "logoClear") === "1";

  if (name.length < 2 || name.length > 160) throw new Error("Ingresa el nombre de la clínica.");
  if (!address) throw new Error("Ingresa la dirección de la clínica.");
  if (!city || city.length > 120) throw new Error("Selecciona la ciudad de la clínica.");
  if (!EMAIL_PATTERN.test(contactEmail)) throw new Error("Ingresa un email de contacto válido.");
  if (!PHONE_PATTERN.test(primaryPhone)) throw new Error("Ingresa un teléfono principal válido.");
  if (secondaryPhone && !PHONE_PATTERN.test(secondaryPhone)) throw new Error("Ingresa un teléfono secundario válido.");
  if (logo && (!LOGO_PATTERN.test(logo) || logo.length > 220_000)) {
    throw new Error("El logo debe ser PNG, JPG o WebP de máximo 200×200 px.");
  }

  await runAsTenant(sql, actor, async (tx) => {
    const previous = (await tx<Array<{ name: string; settings: OrganizationSettings | null }>>`
      SELECT name, settings FROM organizations WHERE id = ${actor.organizationId} FOR UPDATE
    `)[0];
    if (!previous) throw new Error("La organización no está disponible.");
    const country = typeof previous.settings?.contact?.country === "string" ? previous.settings.contact.country : "Chile";
    const contact = { country, city, address, primaryPhone, ...(secondaryPhone ? { secondaryPhone } : {}), contactEmail };

    const updated = logo
      ? (await tx<Array<{ settings: OrganizationSettings }>>`
          UPDATE organizations SET name = ${name}, settings = COALESCE(settings, '{}'::jsonb)
            || jsonb_build_object('contact', ${JSON.stringify(contact)}::jsonb) || jsonb_build_object('logo', ${logo})
          WHERE id = ${actor.organizationId} RETURNING settings
        `)[0]
      : logoClear
        ? (await tx<Array<{ settings: OrganizationSettings }>>`
            UPDATE organizations SET name = ${name}, settings =
              (COALESCE(settings, '{}'::jsonb) || jsonb_build_object('contact', ${JSON.stringify(contact)}::jsonb)) - 'logo'
            WHERE id = ${actor.organizationId} RETURNING settings
          `)[0]
        : (await tx<Array<{ settings: OrganizationSettings }>>`
            UPDATE organizations SET name = ${name}, settings = COALESCE(settings, '{}'::jsonb)
              || jsonb_build_object('contact', ${JSON.stringify(contact)}::jsonb)
            WHERE id = ${actor.organizationId} RETURNING settings
          `)[0];

    await tx`
      INSERT INTO audit_logs
        (organization_id, actor_membership_id, action, entity, entity_id, before, after, reason)
      VALUES (${actor.organizationId}, ${actor.membershipId}, 'organization.updated', 'organization',
        ${actor.organizationId}, ${JSON.stringify({ name: previous.name, contact: previous.settings?.contact ?? null })}::jsonb,
        ${JSON.stringify({ name, contact: updated?.settings.contact ?? contact })}::jsonb, 'settings.organization_profile')
    `;
  });
  redirect("/settings/organizacion?ok=profile");
}

export async function updateOrganizationSchedule(formData: FormData): Promise<void> {
  const actor = await requestTenantContext();
  authorize(actor, "organization:manage");
  const openTime = field(formData, "openTime");
  const closeTime = field(formData, "closeTime");
  if (!TIME_PATTERN.test(openTime)) throw new Error("Ingresa la hora de apertura.");
  if (!TIME_PATTERN.test(closeTime)) throw new Error("Ingresa la hora de cierre.");
  if (openTime >= closeTime) throw new Error("La hora de cierre debe ser posterior a la de apertura.");

  await runAsTenant(sql, actor, async (tx) => {
    const previous = (await tx<Array<{ settings: OrganizationSettings | null }>>`
      SELECT settings FROM organizations WHERE id = ${actor.organizationId} FOR UPDATE
    `)[0];
    if (!previous) throw new Error("La organización no está disponible.");
    const schedule = { openTime, closeTime };
    await tx`UPDATE organizations SET settings = COALESCE(settings, '{}'::jsonb)
      || jsonb_build_object('schedule', ${JSON.stringify(schedule)}::jsonb) WHERE id = ${actor.organizationId}`;
    await tx`
      INSERT INTO audit_logs
        (organization_id, actor_membership_id, action, entity, entity_id, before, after, reason)
      VALUES (${actor.organizationId}, ${actor.membershipId}, 'organization.updated', 'organization',
        ${actor.organizationId}, ${JSON.stringify({ schedule: previous.settings?.schedule ?? null })}::jsonb,
        ${JSON.stringify({ schedule })}::jsonb, 'settings.organization_schedule')
    `;
  });
  redirect("/settings/organizacion?ok=schedule");
}
