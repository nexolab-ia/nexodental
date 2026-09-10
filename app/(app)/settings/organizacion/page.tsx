import { COUNTRY_OPTIONS } from "@/app/onboarding/regions";
import { PhoneField } from "@/components/forms/phone-field";
import { OrgLogoPicker } from "@/components/settings/org-logo-picker";
import { sql } from "@/db/client";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";
import { updateOrganizationProfile, updateOrganizationSchedule } from "./actions";

type OrganizationSettings = {
  contact?: { city?: string; address?: string; primaryPhone?: string; secondaryPhone?: string; contactEmail?: string };
  schedule?: { openTime?: string; closeTime?: string };
  logo?: string;
};

export default async function OrganizacionPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const [{ ok }, actor] = await Promise.all([searchParams, requestTenantContext()]);
  const organization = await runAsTenant(sql, actor, async (tx) => (await tx<Array<{
    name: string;
    settings: OrganizationSettings | null;
  }>>`SELECT name, settings FROM organizations WHERE id = ${actor.organizationId}`)[0]);
  if (!organization) throw new Error("La organización no está disponible.");

  const settings = organization.settings ?? {};
  const contact = settings.contact ?? {};
  const schedule = settings.schedule ?? {};
  const regions = COUNTRY_OPTIONS[0]?.regions ?? [];
  const knownCities = new Set(regions.flatMap((region) => region.cities));

  return <main className="organization-settings">
    <header className="organization-heading">
      <div><h1>Organización</h1><p className="muted">Administra la información básica y configuración de tu clínica.</p></div>
      <a className="organization-help" href="#" aria-label="Ayuda sobre la configuración de la organización">
        <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.35 2.35 0 1 1 3.76 1.88c-.94.7-1.56 1.22-1.56 2.37M12 17h.01"/></svg>
        <span>Ayuda</span>
      </a>
    </header>
    {ok === "profile" && <p className="inline-notice notice-banner" role="status">Datos de la clínica actualizados.</p>}
    {ok === "schedule" && <p className="inline-notice notice-banner" role="status">Horario de atención actualizado.</p>}

    <form action={updateOrganizationProfile}><section className="settings-card organization-profile-card">
      <header className="organization-card-heading">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 9h2a2 2 0 0 1 2 2v10M8 7h4M8 11h4M8 15h4M3 21h18"/></svg>
        <div><h2>Información de la clínica</h2><p className="muted">Imagen, datos básicos y de contacto.</p></div>
      </header>
      <div className="organization-logo-row">
        <OrgLogoPicker name="logo" initial={settings.logo ?? null}>
          <strong>Imagen de la clínica</strong>
          <p className="muted">Logo o imagen representativa (200×200 px máximo)</p>
        </OrgLogoPicker>
      </div>
      <div className="organization-fields">
        <div className="organization-col">
          <label>Nombre de la clínica<input name="name" defaultValue={organization.name} minLength={2} maxLength={160} required/></label>
          <label>Ciudad<select name="city" defaultValue={contact.city ?? ""} required>
            <option value="" disabled>Selecciona la ciudad…</option>
            {contact.city && !knownCities.has(contact.city) && <option value={contact.city}>{contact.city}</option>}
            {regions.map((region) => <optgroup key={region.id} label={region.label}>{region.cities.map((city) => <option key={city} value={city}>{city}</option>)}</optgroup>)}
          </select></label>
          <PhoneField name="primaryPhone" label="Teléfono principal" initialValue={contact.primaryPhone} required/>
        </div>
        <div className="organization-col">
          <label>Dirección<input name="address" defaultValue={contact.address ?? ""} required/></label>
          <label>Email de contacto<input type="email" name="contactEmail" defaultValue={contact.contactEmail ?? ""} required/></label>
          <PhoneField name="secondaryPhone" label="Teléfono secundario" initialValue={contact.secondaryPhone} optional/>
        </div>
      </div>
      <div className="settings-card-actions"><button type="submit" className="button button-primary">Guardar cambios</button></div>
    </section></form>

    <form action={updateOrganizationSchedule}><section className="settings-card organization-schedule-card">
      <header className="organization-card-heading">
        <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
        <div><h2>Horarios de Atención</h2><p className="muted">Define el horario de apertura y cierre de la clínica.</p></div>
      </header>
      <div className="form-row organization-hours">
        <label>Hora de apertura<input type="time" name="openTime" defaultValue={schedule.openTime ?? ""} required/></label>
        <label>Hora de cierre<input type="time" name="closeTime" defaultValue={schedule.closeTime ?? ""} required/></label>
      </div>
      <div className="settings-card-actions"><button type="submit" className="button button-primary">Guardar horario</button></div>
    </section></form>
  </main>;
}
