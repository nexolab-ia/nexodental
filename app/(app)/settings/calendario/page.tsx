import { sql } from "@/db/client";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";
import { updateCalendarSettings } from "./actions";

type OrganizationSettings = {
  calendar?: {
    blockDuration?: number;
  };
};

const BLOCK_DURATION_OPTIONS = [15, 30, 45, 60];

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const [{ ok }, actor] = await Promise.all([searchParams, requestTenantContext()]);
  const organization = await runAsTenant(sql, actor, async (tx) => (await tx<Array<{
    settings: OrganizationSettings | null;
  }>>`SELECT settings FROM organizations WHERE id = ${actor.organizationId}`)[0]);
  if (!organization) throw new Error("La organización no está disponible.");

  const blockDuration = organization.settings?.calendar?.blockDuration ?? 30;

  return (
    <main className="calendar-settings">
      <header className="organization-heading">
        <h1>Calendario</h1>
        <p className="muted">Administra la configuración de bloques del calendario</p>
      </header>
      {ok === "calendario" && <p className="inline-notice notice-banner" role="status">Configuración del calendario actualizada.</p>}

      <form action={updateCalendarSettings} className="calendar-settings-form">
        <section className="settings-card calendar-settings-card">
          <header>
            <h2 className="calendar-settings-heading"><ClockIcon />Configuración de Bloques de Calendario</h2>
            <p className="muted">Define la duración de los bloques de tiempo para citas</p>
          </header>
          <div className="calendar-setting-row">
            <div className="calendar-setting-copy">
              <label className="calendar-setting-title" htmlFor="blockDuration">Duración de bloques</label>
              <p className="calendar-setting-description">Define cuántos minutos durará cada bloque de tiempo en el calendario para agendar citas</p>
            </div>
            <select className="calendar-duration-select" id="blockDuration" name="blockDuration" defaultValue={blockDuration}>
              {BLOCK_DURATION_OPTIONS.map((duration) => <option key={duration} value={duration}>{duration} minutos</option>)}
            </select>
          </div>
          <div className="settings-card-actions calendar-settings-actions">
            <button type="submit" className="button button-primary">Guardar cambios</button>
          </div>
        </section>
      </form>
    </main>
  );
}
