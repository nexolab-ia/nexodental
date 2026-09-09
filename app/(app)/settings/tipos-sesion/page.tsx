import { sql } from "@/db/client";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";
import { SessionTypesManager, type SessionTypeItem } from "./session-types-manager";

export default async function TiposSesionPage() {
  const actor = await requestTenantContext();
  const items = await runAsTenant(sql, actor, (tx) => tx<SessionTypeItem[]>`SELECT id, name, duration_minutes AS "durationMinutes", description, active FROM session_types WHERE organization_id = ${actor.organizationId} ORDER BY name ASC`);
  return <main className="session-types-settings"><SessionTypesManager items={items}/></main>;
}
