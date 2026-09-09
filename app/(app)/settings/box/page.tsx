import { sql } from "@/db/client";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";
import { BoxManager, type BoxItem, type BoxUser } from "./box-manager";

export default async function BoxSettingsPage() {
  const actor = await requestTenantContext();
  const [items, users] = await runAsTenant(sql, actor, async (tx) => Promise.all([
    tx<BoxItem[]>`
      SELECT id, name, active
      FROM boxes
      WHERE organization_id = ${actor.organizationId}
      ORDER BY active DESC, name ASC
    `,
    tx<BoxUser[]>`
      SELECT m.id, u.name, m.role::text AS role
      FROM memberships m
      INNER JOIN users u ON u.id = m.user_id
      WHERE m.organization_id = ${actor.organizationId}
        AND m.status = 'active'
        AND m.role IN ('organization_admin', 'professional', 'independent_owner')
      ORDER BY u.name ASC
    `,
  ]));

  return <main className="session-types-settings"><BoxManager items={items} users={users} /></main>;
}
