import { NotificationsPage, type NotificationsSettings, type NotificationUser } from "@/components/settings/notifications-page";
import { sql } from "@/db/client";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";
import { updatePatientNotifications, updateTeamNotifications } from "./actions";

type OrganizationSettings = { notifications?: Partial<NotificationsSettings>; [key: string]: unknown };
const EVENTS = ["reserveNew", "confirmed", "cancelled", "rescheduled"] as const;

function normalizeSettings(saved: Partial<NotificationsSettings> | undefined): NotificationsSettings {
  const patient = saved?.patient;
  const professionalEvents = saved?.team?.professionalEvents;
  return {
    patient: {
      confirmEmailEnabled: patient?.confirmEmailEnabled === true,
      reminderEmailEnabled: patient?.reminderEmailEnabled === true,
      reminderTime: typeof patient?.reminderTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(patient.reminderTime) ? patient.reminderTime : "09:00",
      whatsappConfirmEnabled: patient?.whatsappConfirmEnabled === true,
      whatsappTone: ["formal", "conciso", "detallado", "amigable"].includes(patient?.whatsappTone ?? "") ? patient!.whatsappTone : "formal",
      whatsappMessage: typeof patient?.whatsappMessage === "string" ? patient.whatsappMessage.slice(0, 1600) : "",
    },
    team: {
      professionalEvents: Object.fromEntries(EVENTS.map((event) => [event, {
        email: professionalEvents?.[event]?.email === true,
        mobile: professionalEvents?.[event]?.mobile === true,
      }])) as NotificationsSettings["team"]["professionalEvents"],
      otherUsers: typeof saved?.team?.otherUsers === "object" && saved.team.otherUsers !== null ? saved.team.otherUsers : {},
    },
  };
}

export default async function NotificationSettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const [{ ok }, actor] = await Promise.all([searchParams, requestTenantContext()]);
  const [organization, users] = await runAsTenant(sql, actor, async (tx) => Promise.all([
    tx<Array<{ settings: OrganizationSettings | null }>>`SELECT settings FROM organizations WHERE id = ${actor.organizationId}`,
    tx<NotificationUser[]>`
      SELECT m.id, u.name, u.email, m.role::text AS role
      FROM memberships m INNER JOIN users u ON u.id = m.user_id
      WHERE m.organization_id = ${actor.organizationId} AND m.status = 'active'
        AND m.role IN ('organization_admin', 'professional', 'independent_owner')
      ORDER BY u.name ASC
    `,
  ]));
  if (!organization[0]) throw new Error("La organización no está disponible.");
  const settings = normalizeSettings(organization[0].settings?.notifications);
  settings.team.otherUsers = Object.fromEntries(users.flatMap((user) => {
    const saved = settings.team.otherUsers[user.id];
    return saved ? [[user.id, { email: saved.email === true, mobile: saved.mobile === true }]] : [];
  }));
  return <main className="notif-settings">
    <header className="organization-heading"><h1>Notificaciones</h1><p className="muted">Configura los avisos automáticos a pacientes y a tu equipo.</p></header>
    {ok === "patient" && <p className="inline-notice notice-banner" role="status">Configuración para pacientes actualizada.</p>}
    {ok === "team" && <p className="inline-notice notice-banner" role="status">Configuración para el equipo actualizada.</p>}
    <NotificationsPage settings={settings} users={users} updatePatientAction={updatePatientNotifications} updateTeamAction={updateTeamNotifications} />
  </main>;
}
