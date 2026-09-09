import { AgendaOnlinePage } from "@/components/settings/agenda-online-page";
import { sql } from "@/db/client";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";
import { updateAgendaOnlineSettings } from "./actions";

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
  agendaOnline?: Partial<AgendaOnlineSettings>;
  [key: string]: unknown;
};

type ProfessionalRow = {
  id: string;
  name: string;
  email: string;
  role: "organization_admin" | "professional" | "independent_owner";
};

const DEFAULT_SETTINGS: AgendaOnlineSettings = {
  enabled: false,
  slug: "",
  themeColor: "#22d3ee",
  welcomeMessage: "",
  minCancellationHours: 2,
  postBookingMessage: "",
  arrivalInstructions: "",
  professionalIds: [],
};

export default async function AgendaOnlineSettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const [{ ok }, actor] = await Promise.all([searchParams, requestTenantContext()]);
  const [organization, professionals] = await runAsTenant(sql, actor, async (tx) => Promise.all([
    tx<Array<{ settings: OrganizationSettings | null }>>`
      SELECT settings FROM organizations WHERE id = ${actor.organizationId}
    `,
    tx<ProfessionalRow[]>`
      SELECT m.id, u.name, u.email, m.role::text AS role
      FROM memberships m
      INNER JOIN users u ON u.id = m.user_id
      WHERE m.organization_id = ${actor.organizationId}
        AND m.status = 'active'
        AND m.role IN ('professional', 'independent_owner', 'organization_admin')
      ORDER BY u.name ASC
    `,
  ]));
  if (!organization[0]) throw new Error("La organización no está disponible.");

  const saved = organization[0].settings?.agendaOnline ?? {};
  const settings: AgendaOnlineSettings = { ...DEFAULT_SETTINGS, ...saved };

  return (
    <main className="agenda-online-settings">
      <header className="organization-heading">
        <h1>Agenda Online</h1>
        <p className="muted">Administra la configuración de reservas en línea para pacientes</p>
      </header>
      {ok === "agenda-online" && (
        <p className="inline-notice notice-banner" role="status">Configuración de agenda online actualizada.</p>
      )}
      <AgendaOnlinePage settings={settings} professionals={professionals} updateAction={updateAgendaOnlineSettings} />
    </main>
  );
}
