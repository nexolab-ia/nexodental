import { sql } from "@/db/client";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";
import { SessionTypesManager, type SessionTypeItem } from "./session-types-manager";

export default async function TiposSesionPage() {
  const actor = await requestTenantContext();
  const items = await runAsTenant(sql, actor, (tx) => tx<SessionTypeItem[]>`SELECT id, name, duration_minutes AS "durationMinutes", is_default AS "isDefault", active FROM session_types WHERE organization_id = ${actor.organizationId} ORDER BY is_default DESC, active DESC, name ASC`);
  return <main className="session-types-settings"><header className="organization-heading"><h1>Tipos de sesión</h1><p className="muted">Administra las atenciones disponibles y su duración predeterminada.</p></header><SessionTypesManager items={items}/></main>;
}
