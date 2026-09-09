"use server";

import { redirect } from "next/navigation";
import { sql } from "@/db/client";
import { authorize } from "@/features/tenant-identity/authorize";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

type PermissionsSettings = {
  calendar: {
    restrictModification: boolean;
    allowPastScheduling: boolean;
  };
  treatments: {
    restrictDiscounts: boolean;
    fullAccess: boolean;
    dashboardLastPayments: boolean;
    deleteFees: boolean;
    assistantsManage: boolean;
    restrictCollaboratorDiscounts: boolean;
    adminsOnlyPayments: boolean;
    hideDiscountsInPrints: boolean;
    customToothZone: boolean;
  };
};

type OrganizationSettings = {
  permissions?: PermissionsSettings;
  [key: string]: unknown;
};

function checked(formData: FormData, name: string): boolean {
  return formData.has(`permissions[${name}]`);
}

export async function updatePermissions(formData: FormData): Promise<void> {
  const actor = await requestTenantContext();
  authorize(actor, "organization:manage");

  const permissions: PermissionsSettings = {
    calendar: {
      restrictModification: checked(formData, "calendar.restrictModification"),
      allowPastScheduling: checked(formData, "calendar.allowPastScheduling"),
    },
    treatments: {
      restrictDiscounts: checked(formData, "treatments.restrictDiscounts"),
      fullAccess: checked(formData, "treatments.fullAccess"),
      dashboardLastPayments: checked(formData, "treatments.dashboardLastPayments"),
      deleteFees: checked(formData, "treatments.deleteFees"),
      assistantsManage: checked(formData, "treatments.assistantsManage"),
      restrictCollaboratorDiscounts: checked(formData, "treatments.restrictCollaboratorDiscounts"),
      adminsOnlyPayments: checked(formData, "treatments.adminsOnlyPayments"),
      hideDiscountsInPrints: checked(formData, "treatments.hideDiscountsInPrints"),
      customToothZone: checked(formData, "treatments.customToothZone"),
    },
  };

  await runAsTenant(sql, actor, async (tx) => {
    const previous = (await tx<Array<{ settings: OrganizationSettings | null }>>`
      SELECT settings FROM organizations WHERE id = ${actor.organizationId} FOR UPDATE
    `)[0];
    if (!previous) throw new Error("La organización no está disponible.");

    await tx`
      UPDATE organizations SET settings = COALESCE(settings, '{}'::jsonb)
        || jsonb_build_object('permissions', ${JSON.stringify(permissions)}::jsonb)
      WHERE id = ${actor.organizationId}
    `;
    await tx`
      INSERT INTO audit_logs
        (organization_id, actor_membership_id, action, entity, entity_id, before, after, reason)
      VALUES (${actor.organizationId}, ${actor.membershipId}, 'settings.permissions_updated', 'organization',
        ${actor.organizationId}, ${JSON.stringify({ permissions: previous.settings?.permissions ?? null })}::jsonb,
        ${JSON.stringify({ permissions })}::jsonb, 'settings.permissions')
    `;
  });

  redirect("/settings/permisos?ok=permisos");
}
