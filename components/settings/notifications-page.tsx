"use client";

import { useRef, useState } from "react";

export type NotificationTone = "formal" | "conciso" | "detallado" | "amigable";
type Channels = { email: boolean; mobile: boolean };
type EventKey = "reserveNew" | "confirmed" | "cancelled" | "rescheduled";
export type NotificationsSettings = {
  patient: { confirmEmailEnabled: boolean; reminderEmailEnabled: boolean; reminderTime: string; whatsappConfirmEnabled: boolean; whatsappTone: NotificationTone; whatsappMessage: string };
  team: { professionalEvents: Record<EventKey, Channels>; otherUsers: Record<string, Channels> };
};
export type NotificationUser = { id: string; name: string; email: string; role: "organization_admin" | "professional" | "independent_owner" };

const PRESETS: Record<NotificationTone, string> = {
  formal: "Estimado/a {nombreCliente}: le confirmamos su cita en {nombreClinica} el {diaSemana} {fechaCita} a las {horaCita} con {nombreProfesional}. Para confirmar o reagendar su hora, ingrese a: {urlConfirmacion}. Dirección: {direccionClinica}. Teléfono: {telefonoClinica}.",
  conciso: "Hola {nombreCliente}, tu cita con {nombreProfesional} quedó agendada el {fechaCita} a las {horaCita} en {nombreClinica}. Confírmala aquí: {urlConfirmacion}",
  detallado: "Hola {nombreCliente}: te confirmamos tu cita en {nombreClinica}. Profesional: {nombreProfesional}. Día: {diaSemana} {fechaCita} a las {horaCita}. Dirección: {direccionClinica}. Teléfono: {telefonoClinica}. Si no puedes asistir, cancela o reagenda con anticipación aquí: {urlConfirmacion}",
  amigable: "¡Hola {nombreCliente}! Te esperamos el {diaSemana} {fechaCita} a las {horaCita} con {nombreProfesional} en {nombreClinica}. Si necesitas mover tu hora, solo avísanos por este medio o entra a {urlConfirmacion}",
};
const TONES: Array<{ id: NotificationTone; label: string }> = [{ id: "formal", label: "Formal" }, { id: "conciso", label: "Conciso" }, { id: "detallado", label: "Detallado" }, { id: "amigable", label: "Amigable" }];
const VARIABLES = ["{nombreCliente}", "{nombreProfesional}", "{diaSemana}", "{fechaCita}", "{horaCita}", "{nombreClinica}", "{direccionClinica}", "{telefonoClinica}", "{urlConfirmacion}"] as const;
const EXAMPLES: Record<typeof VARIABLES[number], string> = { "{nombreCliente}": "María González", "{nombreProfesional}": "Dra. Emilia Torres", "{diaSemana}": "lunes", "{fechaCita}": "12 de enero", "{horaCita}": "10:30", "{nombreClinica}": "Clínica Sonrisa Andes", "{direccionClinica}": "Av. Providencia 123", "{telefonoClinica}": "+56 2 2123 4567", "{urlConfirmacion}": "https://sonrisa-andes.reserva.dental.nexolabs.cloud/confirmar" };
const EVENTS: Array<{ id: EventKey; label: string }> = [{ id: "reserveNew", label: "Reserva nueva" }, { id: "confirmed", label: "Confirmada" }, { id: "cancelled", label: "Cancelada" }, { id: "rescheduled", label: "Reagendada" }];

function Switch({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return <span className="perm-switch"><input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} aria-label={label} /><span className="perm-switch-track" aria-hidden="true"><span /></span></span>;
}
function roleLabel(role: NotificationUser["role"]) { return role === "organization_admin" ? "Administrador" : role === "independent_owner" ? "Profesional independiente" : "Profesional"; }

export function NotificationsPage({ settings, users, updatePatientAction, updateTeamAction }: { settings: NotificationsSettings; users: NotificationUser[]; updatePatientAction: (formData: FormData) => Promise<void>; updateTeamAction: (formData: FormData) => Promise<void> }) {
  const [activeTab, setActiveTab] = useState<"patient" | "team">("patient");
  const [patient, setPatient] = useState(() => ({ ...settings.patient, whatsappMessage: settings.patient.whatsappMessage || PRESETS[settings.patient.whatsappTone] }));
  const [team, setTeam] = useState(() => ({ professionalEvents: structuredClone(settings.team.professionalEvents), otherUsers: structuredClone(settings.team.otherUsers) }));
  const [variablesOpen, setVariablesOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preview = VARIABLES.reduce((message, variable) => message.replaceAll(variable, EXAMPLES[variable]), patient.whatsappMessage);
  const selectedUsers = Object.keys(team.otherUsers).length;
  const setEvent = (event: EventKey, channel: keyof Channels, checked: boolean) => setTeam((current) => ({ ...current, professionalEvents: { ...current.professionalEvents, [event]: { ...current.professionalEvents[event], [channel]: checked } } }));
  function toggleUser(id: string, checked: boolean) { setTeam((current) => { const otherUsers = { ...current.otherUsers }; if (checked) otherUsers[id] = otherUsers[id] ?? { email: false, mobile: false }; else delete otherUsers[id]; return { ...current, otherUsers }; }); }
  const setUserChannel = (id: string, channel: keyof Channels, checked: boolean) => setTeam((current) => ({ ...current, otherUsers: { ...current.otherUsers, [id]: { ...current.otherUsers[id], [channel]: checked } } }));
  function insertVariable(variable: string) { const textarea = textareaRef.current; const start = textarea?.selectionStart ?? patient.whatsappMessage.length; const end = textarea?.selectionEnd ?? start; const next = `${patient.whatsappMessage.slice(0, start)}${variable}${patient.whatsappMessage.slice(end)}`.slice(0, 1600); setPatient((current) => ({ ...current, whatsappMessage: next })); setVariablesOpen(false); requestAnimationFrame(() => { textarea?.focus(); textarea?.setSelectionRange(start + variable.length, start + variable.length); }); }

  return <div className="notif-shell">
    <div className="agenda-online-tabs" role="tablist" aria-label="Configuración de notificaciones">
      <button className="agenda-online-tab" type="button" role="tab" aria-selected={activeTab === "patient"} tabIndex={activeTab === "patient" ? 0 : -1} onClick={() => setActiveTab("patient")}>Al paciente</button>
      <button className="agenda-online-tab" type="button" role="tab" aria-selected={activeTab === "team"} tabIndex={activeTab === "team" ? 0 : -1} onClick={() => setActiveTab("team")}>Al equipo</button>
    </div>
    {activeTab === "patient" && <form action={updatePatientAction} className="notif-form" role="tabpanel"><input type="hidden" name="patient" value={JSON.stringify(patient)} />
      <header className="notif-panel-head"><div><h2>Notificaciones al paciente</h2><p>Define los mensajes que recibe cada paciente durante la gestión de su cita.</p></div><button className="button button-primary" type="submit">Guardar cambios</button></header>
      <section className="notif-section" aria-labelledby="notif-email-title"><div className="notif-section-heading"><span className="notif-section-icon" aria-hidden="true">@</span><div><h3 id="notif-email-title">Correo</h3><p>Configura las confirmaciones y recordatorios por correo.</p></div></div>
        <div className="notif-setting-row"><div><strong>Correos de confirmación</strong><p>Se envía al confirmar la cita.</p></div><Switch checked={patient.confirmEmailEnabled} onChange={(checked) => setPatient((current) => ({ ...current, confirmEmailEnabled: checked }))} label="Correos de confirmación" /></div>
        <div className="notif-setting-row"><div><strong>Correos de recordatorio</strong><p>Se envía el día antes de la cita.</p></div><Switch checked={patient.reminderEmailEnabled} onChange={(checked) => setPatient((current) => ({ ...current, reminderEmailEnabled: checked }))} label="Correos de recordatorio" /></div>
        {patient.reminderEmailEnabled && <label className="notif-time-field">Hora del recordatorio<input type="time" value={patient.reminderTime} onChange={(event) => setPatient((current) => ({ ...current, reminderTime: event.target.value }))} required /></label>}
      </section>
      <section className="notif-section" aria-labelledby="notif-whatsapp-title"><div className="notif-section-heading"><span className="notif-section-icon" aria-hidden="true">W</span><div><h3 id="notif-whatsapp-title">WhatsApp</h3><p>Configura la confirmación de citas por mensajería.</p></div></div><div className="notif-setting-row"><div><strong>Mensaje de confirmación por WhatsApp</strong><p>Se envía al registrar o confirmar la cita.</p></div><Switch checked={patient.whatsappConfirmEnabled} onChange={(checked) => setPatient((current) => ({ ...current, whatsappConfirmEnabled: checked }))} label="Mensaje de confirmación por WhatsApp" /></div>
        <div className={`notif-whatsapp-editor${patient.whatsappConfirmEnabled ? "" : " is-disabled"}`} aria-disabled={!patient.whatsappConfirmEnabled}><div className="notif-template-pills" aria-label="Plantillas de WhatsApp">{TONES.map((tone) => <button key={tone.id} type="button" aria-pressed={patient.whatsappTone === tone.id} disabled={!patient.whatsappConfirmEnabled} onClick={() => setPatient((current) => ({ ...current, whatsappTone: tone.id, whatsappMessage: PRESETS[tone.id] }))}>{tone.label}</button>)}</div>
          <div className="notif-editor-grid"><div className="notif-compose"><div className="notif-editor-toolbar"><label htmlFor="notif-message">Mensaje</label><div className="notif-variable-wrap"><button type="button" className="notif-variable-button" aria-expanded={variablesOpen} disabled={!patient.whatsappConfirmEnabled} onClick={() => setVariablesOpen((open) => !open)}>+ Variables</button>{variablesOpen && <div className="notif-variable-menu">{VARIABLES.map((variable) => <button type="button" key={variable} onClick={() => insertVariable(variable)}>{variable}</button>)}</div>}</div></div>
            <textarea id="notif-message" ref={textareaRef} value={patient.whatsappMessage} maxLength={1600} rows={9} disabled={!patient.whatsappConfirmEnabled} onChange={(event) => setPatient((current) => ({ ...current, whatsappMessage: event.target.value }))} /><div className="notif-editor-help"><span>Las variables se reemplazan con los datos de cada cita.</span><span className="notif-counter">{patient.whatsappMessage.length}/1600</span></div></div>
            <aside className="notif-preview" aria-label="Vista previa del mensaje"><span>Vista previa</span><p>{preview}</p></aside></div>
        </div>
      </section>
    </form>}
    {activeTab === "team" && <form action={updateTeamAction} className="notif-form" role="tabpanel"><input type="hidden" name="team" value={JSON.stringify(team)} />
      <header className="notif-panel-head"><div><h2>Notificaciones al equipo</h2><p>Elige quién recibe avisos internos y por qué canal.</p></div><button className="button button-primary" type="submit">Guardar cambios</button></header>
      <section className="notif-section"><div className="notif-section-heading"><span className="notif-section-icon" aria-hidden="true">P</span><div><h3>Profesional asignado a la cita</h3><p>Avisos que recibe el profesional dueño de la cita.</p></div></div><div className="notif-matrix"><div className="notif-matrix-head"><span>Evento</span><span>Email</span><span>Celular</span></div>{EVENTS.map((event) => <div className="notif-matrix-row" key={event.id}><strong>{event.label}</strong><Switch checked={team.professionalEvents[event.id].email} onChange={(checked) => setEvent(event.id, "email", checked)} label={`${event.label} por email`} /><Switch checked={team.professionalEvents[event.id].mobile} onChange={(checked) => setEvent(event.id, "mobile", checked)} label={`${event.label} por celular`} /></div>)}</div></section>
      <section className="notif-section"><div className="notif-section-heading"><span className="notif-section-icon" aria-hidden="true">U</span><div><h3>Otros usuarios de la clínica</h3><p>Selecciona usuarios activos que deban recibir todos los avisos.</p></div></div>
        {users.length > 0 ? <><div className="notif-users">{users.map((user) => { const enabled = Object.hasOwn(team.otherUsers, user.id); return <div className="notif-user-row" key={user.id}><span className="notif-avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span><span className="notif-user-copy"><strong>{user.name}<small>{roleLabel(user.role)}</small></strong><span>{user.email}</span></span><label className="notif-receive">Recibir avisos<Switch checked={enabled} onChange={(checked) => toggleUser(user.id, checked)} label={`Recibir avisos para ${user.name}`} /></label><div className={`notif-user-channels${enabled ? "" : " is-disabled"}`}><label>Email<Switch checked={enabled && team.otherUsers[user.id].email} disabled={!enabled} onChange={(checked) => setUserChannel(user.id, "email", checked)} label={`Email para ${user.name}`} /></label><label>Celular<Switch checked={enabled && team.otherUsers[user.id].mobile} disabled={!enabled} onChange={(checked) => setUserChannel(user.id, "mobile", checked)} label={`Celular para ${user.name}`} /></label></div></div>; })}</div>{selectedUsers === 0 && <p className="notif-empty">Sin usuarios seleccionados</p>}</> : <p className="notif-empty">No hay usuarios activos disponibles.</p>}
      </section>
    </form>}
  </div>;
}
