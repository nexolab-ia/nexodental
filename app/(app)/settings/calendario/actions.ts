"use server";

import { redirect } from "next/navigation";
import { sql } from "@/db/client";
import { authorize } from "@/features/tenant-identity/authorize";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

type CalendarSettings = {
  blockDuration?: number;
};

type OrganizationSettings = {
  calendar?: CalendarSettings;
  [key: string]: unknown;
};

const ALLOWED_BLOCK_DURATIONS = new Set([15, 30, 45, 60]);

export async function updateCalendarSettings(formData: FormData): Promise<void> {
  const actor = await requestTenantContext();
  authorize(actor, "organization:manage");

  const blockDuration = Number(formData.get("blockDuration"));
  if (!ALLOWED_BLOCK_DURATIONS.has(blockDuration)) {
    throw new Error("Selecciona una duración de bloque válida.");
  }

  const calendar = { blockDuration };

  await runAsTenant(sql, actor, async (tx) => {
    const previous = (await tx<Array<{ settings: OrganizationSettings | null }>>`
      SELECT settings FROM organizations WHERE id = ${actor.organizationId} FOR UPDATE
    `)[0];
    if (!previous) throw new Error("La organización no está disponible.");

    await tx`
      UPDATE organizations SET settings = COALESCE(settings, '{}'::jsonb)
        || jsonb_build_object('calendar', ${tx.json(calendar)})
      WHERE id = ${actor.organizationId}
    `;
    await tx`
      INSERT INTO audit_logs
        (organization_id, actor_membership_id, action, entity, entity_id, before, after, reason)
      VALUES (${actor.organizationId}, ${actor.membershipId}, 'settings.calendar_updated', 'organization',
        ${actor.organizationId}, ${tx.json({ calendar: previous.settings?.calendar ?? null })},
        ${tx.json({ calendar })}, 'settings.calendar')
    `;
  });

  redirect("/settings/calendario?ok=calendario");
}
