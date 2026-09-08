import { BlocksPage } from "@/components/settings/blocks-page";
import { sql } from "@/db/client";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";
import { getAgendaBlocks } from "./actions";

export default async function BloqueosPage() {
  const actor = await requestTenantContext();
  const [blocks, boxes] = await Promise.all([
    getAgendaBlocks(),
    runAsTenant(sql, actor, (tx) => tx<Array<{ id: string; name: string }>>`
      SELECT id, name FROM boxes
      WHERE organization_id = ${actor.organizationId} AND active
      ORDER BY name ASC
    `),
  ]);
  return <BlocksPage initialBlocks={blocks} boxes={boxes} />;
}
