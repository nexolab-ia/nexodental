"use client";

import Link from "next/link";
import { useState } from "react";

type AgendaOnlineSettings = {
  enabled: boolean;
  slug: string;
  themeColor: string;
  welcomeMessage: string;
  minCancellationHours: number;
  postBookingMessage: string;
  arrivalInstructions: string;
  professionalIds: string[];
  professionalSessionTypes: Record<string, string[]>;
};

type Professional = {
  id: string;
  name: string;
  email: string;
  role: "organization_admin" | "professional" | "independent_owner";
};

type SessionType = { id: string; name: string; durationMinutes: number };

type TabId = "status" | "customization" | "professionals";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "status", label: "Estado y enlace" },
  { id: "customization", label: "Personalización" },
  { id: "professionals", label: "Profesionales habilitados" },
];
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

function normalizeSlug(value: string) {
  return value.toLowerCase().trimStart().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-{2,}/g, "-").slice(0, 63);
}

function roleLabel(role: Professional["role"]) {
  if (role === "organization_admin") return "Administrador";
  if (role === "independent_owner") return "Profesional independiente";
  return "Profesional";
}

function SectionIcon({ kind }: { kind: "status" | "link" | "customization" | "professionals" }) {
  if (kind === "link") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" /></svg>;
  if (kind === "professionals") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>;
  if (kind === "customization") return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5M12 16h.01" /></svg>;
}

export function AgendaOnlinePage({ settings, professionals, sessionTypes, updateAction }: {
  settings: AgendaOnlineSettings;
  professionals: Professional[];
  sessionTypes: SessionType[];
  updateAction: (formData: FormData) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("status");
  const [enabled, setEnabled] = useState(settings.enabled);
  const [slug, setSlug] = useState(settings.slug);
  const [themeColor, setThemeColor] = useState(settings.themeColor);
  const [professionalIds, setProfessionalIds] = useState(settings.professionalIds.filter((id) => professionals.some((professional) => professional.id === id)));
  const [professionalSessionTypes, setProfessionalSessionTypes] = useState<Record<string, string[]>>(() => Object.fromEntries(
    Object.entries(settings.professionalSessionTypes ?? {})
      .filter(([professionalId]) => settings.professionalIds.includes(professionalId) && professionals.some(({ id }) => id === professionalId))
      .map(([professionalId, ids]) => [professionalId, [...new Set(ids)].filter((id) => sessionTypes.some((type) => type.id === id))]),
  ));
  const locked = !enabled;
  const slugIsValid = slug.length >= 3 && SLUG_PATTERN.test(slug);
  const colorIsValid = HEX_PATTERN.test(themeColor);
  const publicUrl = `https://${(slug || "mi-clinica").toLowerCase()}.reserva.dental.nexolabs.cloud`;
  const professionalNoun = professionals.length === 1 ? "profesional habilitado" : "profesionales habilitados";

  function toggleProfessional(id: string) {
    setProfessionalIds((current) => {
      if (!current.includes(id)) return [...current, id];
      setProfessionalSessionTypes((assignments) => {
        const next = { ...assignments };
        delete next[id];
        return next;
      });
      return current.filter((item) => item !== id);
    });
  }

  function toggleSessionType(professionalId: string, sessionTypeId: string) {
    setProfessionalSessionTypes((current) => {
      const selected = current[professionalId] ?? [];
      return {
        ...current,
        [professionalId]: selected.includes(sessionTypeId)
          ? selected.filter((id) => id !== sessionTypeId)
          : [...selected, sessionTypeId],
      };
    });
  }

  function toggleAllProfessionals() {
    if (professionalIds.length > 0) {
      setProfessionalIds([]);
      setProfessionalSessionTypes({});
      return;
    }
    setProfessionalIds(professionals.map(({ id }) => id));
  }

  return (
    <form action={updateAction} className={`agenda-online-form${locked ? " agenda-online-locked" : ""}`}>
      <div className="agenda-online-tabs" role="tablist" aria-label="Configuración de agenda online">
        {TABS.map((tab) => (
          <button className="agenda-online-tab" id={`agenda-online-tab-${tab.id}`} key={tab.id} type="button" role="tab" aria-controls={`agenda-online-panel-${tab.id}`} aria-selected={activeTab === tab.id} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>

      <section className="agenda-online-panel settings-card" id="agenda-online-panel-status" role="tabpanel" aria-labelledby="agenda-online-tab-status" hidden={activeTab !== "status"}>
        <header className="agenda-online-section-heading"><h2><SectionIcon kind="status" />Estado general</h2><p className="muted">Habilita las reservas en línea desde tu enlace público</p></header>
        <label className="agenda-online-setting-row">
          <span className="agenda-online-setting-copy"><strong className="agenda-online-setting-title">Agenda online habilitada</strong><span className="agenda-online-setting-description">Permite que tus pacientes reserven citas en línea</span></span>
          <span className="perm-switch"><input type="checkbox" role="switch" name="enabled" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} aria-label="Agenda online habilitada" /><span className="perm-switch-track" aria-hidden="true"><span /></span></span>
        </label>
        {!locked && (
          <div className="agenda-online-public-url">
            <div className="agenda-online-public-url-copy">
              <strong>URL pública</strong>
              <span>Esta es la dirección que compartes con tus pacientes para que reserven</span>
            </div>
            <div className="agenda-online-public-url-box">
              <span>{publicUrl}</span>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir la página pública de reservas en una pestaña nueva">Abrir ↗</a>
            </div>
          </div>
        )}
        <div className="agenda-online-subsection">
          <header className="agenda-online-section-heading"><h2><SectionIcon kind="link" />Nombre de la URL</h2><p className="muted">Elige el nombre que identificará el enlace público de tu agenda</p></header>
          <label className="agenda-online-field" htmlFor="agenda-online-slug"><span>Nombre de la URL</span><span className="agenda-online-url-control"><input id="agenda-online-slug" name="slug" value={slug} onChange={(event) => setSlug(normalizeSlug(event.target.value))} placeholder="mi-clinica" minLength={3} maxLength={63} pattern="[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?" required disabled={locked} aria-describedby={slug.length > 0 && !slugIsValid ? "agenda-online-slug-error" : undefined} aria-invalid={slug.length > 0 && !slugIsValid} /><span className="agenda-online-url-suffix">.reserva.dental.nexolabs.cloud</span></span></label>
          {slug.length > 0 && !slugIsValid && <p className="field-error agenda-online-field-error" id="agenda-online-slug-error">Usa al menos 3 caracteres. Solo se permiten letras minúsculas, números y guiones, sin guiones al inicio ni al final.</p>}
        </div>
        <div className="settings-card-actions agenda-online-actions"><button type="submit" className="button button-primary">Guardar cambios</button></div>
      </section>

      <section className="agenda-online-panel settings-card" id="agenda-online-panel-customization" role="tabpanel" aria-labelledby="agenda-online-tab-customization" hidden={activeTab !== "customization"}>
        <header className="agenda-online-section-heading"><h2><SectionIcon kind="customization" />Personalización</h2><p className="muted">Configura el color y los mensajes de tu página de reservas</p></header>
        {locked && <p className="muted">Activa Agenda Online para configurar esta sección.</p>}
        <div className="agenda-online-fields">
          <div className="agenda-online-field"><label htmlFor="agenda-online-theme-color">Color de tema</label><p className="agenda-online-setting-description">Define el color principal de tu página de reservas</p><div className="agenda-online-color-row"><input className="agenda-online-color-picker" id="agenda-online-theme-color" type="color" value={colorIsValid ? themeColor : "#22d3ee"} onChange={(event) => setThemeColor(event.target.value)} disabled={locked} aria-label="Selector de color de tema" /><input name="themeColor" value={themeColor} onChange={(event) => setThemeColor(event.target.value)} maxLength={7} pattern="#[0-9a-fA-F]{6}" required disabled={locked} aria-label="Color de tema en hexadecimal" aria-invalid={!colorIsValid} /></div>{!colorIsValid && <p className="field-error agenda-online-field-error">Usa el formato hexadecimal #RRGGBB.</p>}</div>
          <label className="agenda-online-field" htmlFor="agenda-online-welcome"><span>Mensaje de bienvenida</span><span className="agenda-online-setting-description">Saludo que verán tus pacientes al entrar a la página de reservas</span><textarea id="agenda-online-welcome" name="welcomeMessage" defaultValue={settings.welcomeMessage} maxLength={200} placeholder="Hola, reserva tu hora con nosotros" disabled={locked} /></label>
          <label className="agenda-online-field" htmlFor="agenda-online-cancellation"><span>Cancelación mínima</span><span className="agenda-online-setting-description">Tiempo mínimo antes de la cita para que el paciente pueda cancelar</span><select id="agenda-online-cancellation" name="minCancellationHours" defaultValue={settings.minCancellationHours} disabled={locked}>{[1, 2, 4, 12, 24, 48].map((hours) => <option key={hours} value={hours}>{hours} {hours === 1 ? "hora" : "horas"} antes</option>)}</select></label>
          <label className="agenda-online-field" htmlFor="agenda-online-post-booking"><span>Mensaje posterior a la reserva</span><span className="agenda-online-setting-description">Mensaje que verá el paciente al confirmar su cita</span><textarea id="agenda-online-post-booking" name="postBookingMessage" defaultValue={settings.postBookingMessage} maxLength={300} disabled={locked} /></label>
          <label className="agenda-online-field" htmlFor="agenda-online-arrival"><span>Instrucciones para llegar</span><span className="agenda-online-setting-description">Indicaciones de cómo llegar a tu clínica (dirección, referencias)</span><textarea id="agenda-online-arrival" name="arrivalInstructions" defaultValue={settings.arrivalInstructions} maxLength={500} disabled={locked} /></label>
        </div>
        <div className="settings-card-actions agenda-online-actions"><button type="submit" className="button button-primary" disabled={locked}>Guardar cambios</button></div>
      </section>

      <section className="agenda-online-panel settings-card" id="agenda-online-panel-professionals" role="tabpanel" aria-labelledby="agenda-online-tab-professionals" hidden={activeTab !== "professionals"}>
        <header className="agenda-online-section-heading"><h2><SectionIcon kind="professionals" />Profesionales habilitados</h2><p className="muted">Selecciona los profesionales que recibirán reservas y los tipos de sesión que ofrecerán en línea.</p></header>
        {locked && <p className="muted">Activa Agenda Online para configurar esta sección.</p>}
        <input type="hidden" name="professionalIds" value={JSON.stringify(professionalIds)} />
        <input type="hidden" name="professionalSessionTypes" value={JSON.stringify(Object.fromEntries(Object.entries(professionalSessionTypes).filter(([id]) => professionalIds.includes(id))))} />
        <div className="agenda-online-professional-toolbar"><p className="agenda-online-counter">{professionalIds.length} de {professionals.length} {professionalNoun}</p>{professionals.length > 0 && <div className="agenda-online-professional-actions"><button type="button" className="agenda-online-bulk-action" onClick={toggleAllProfessionals} disabled={locked}>{professionalIds.length > 0 ? "Deshabilitar todos" : "Habilitar todos"}</button><button type="submit" className="button button-primary" disabled={locked}>Guardar cambios</button></div>}</div>
        {professionals.length > 0 ? <div className="agenda-online-professional-list">{professionals.map((professional) => (
          <div className="agenda-online-professional-item" key={professional.id}>
            <label className="agenda-online-professional-row"><span className="agenda-online-avatar" aria-hidden="true">{professional.name.trim().charAt(0).toUpperCase()}</span><span className="agenda-online-professional-copy"><span className="agenda-online-professional-name">{professional.name}<span className="agenda-online-badge">{roleLabel(professional.role)}</span></span><span className="agenda-online-setting-description">{professional.email}</span></span><span className="perm-switch"><input type="checkbox" role="switch" checked={professionalIds.includes(professional.id)} onChange={() => toggleProfessional(professional.id)} disabled={locked} aria-label={`Habilitar reservas para ${professional.name}`} /><span className="perm-switch-track" aria-hidden="true"><span /></span></span></label>
            {professionalIds.includes(professional.id) && <div className="agenda-online-session-types"><strong>Tipos de sesión disponibles para este profesional</strong>{(professionalSessionTypes[professional.id]?.length ?? 0) === 0 && <p className="muted">Sin tipos asignados. El profesional no podrá recibir reservas en línea hasta que elijas al menos uno.</p>}{sessionTypes.length > 0 ? <div className="agenda-online-session-type-list">{sessionTypes.map((sessionType) => <label className="agenda-online-session-type-row" key={sessionType.id}><input type="checkbox" checked={(professionalSessionTypes[professional.id] ?? []).includes(sessionType.id)} onChange={() => toggleSessionType(professional.id, sessionType.id)} disabled={locked} /><span>{sessionType.name}</span><span className="muted">{sessionType.durationMinutes} min</span></label>)}</div> : <p className="muted">No hay tipos de sesión activos disponibles.</p>}</div>}
          </div>
        ))}</div> : <div className="agenda-online-empty"><SectionIcon kind="professionals" /><strong>No hay profesionales habilitables.</strong><p>Agrega un profesional con rol activo para habilitarlo</p><Link className="button button-secondary" href="/settings/members">Agregar profesional</Link></div>}
        <Link className={`agenda-online-session-types-help${locked ? " is-disabled" : ""}`} href={locked ? "#" : "/settings/tipos-sesion"} aria-disabled={locked} tabIndex={locked ? -1 : undefined}>+ ¿Necesitas crear más tipos de sesión? Ir a Tipos de Sesión</Link>
      </section>
    </form>
  );
}
