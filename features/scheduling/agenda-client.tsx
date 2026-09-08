"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type FormEvent } from "react";
import { getAgendaAppointments, type AgendaAppointment } from "./agenda-actions";
import { createAgendaAppointment } from "./agenda-create-actions";
import { addLocalDays, localTime, santiagoDateKey, santiagoDateKeyToUtc, santiagoLocalToUtc, startOfLocalWeek } from "./domain";

type View = "day" | "week";
type FilterMode = "professional" | "box";
type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type Availability = { weekday: Weekday; startsAt: string; endsAt: string };
type Professional = { id: string; name: string; availability: Availability[] };
type Box = { id: string; name: string };
type Patient = { id: string; name: string; email: string | null; phone: string | null };
type CreateAt = { dateKey: string; startMinutes: number };

const halfHourHeight = 42;
const weekdays: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function Icon({ name }: { name: "calendar" | "chevron-left" | "chevron-right" | "clock" }) {
  if (name === "calendar") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v3M18 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" /></svg>;
  if (name === "clock") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={name === "chevron-left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} /></svg>;
}
function CloseIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>; }
function weekdayIndex(key: string): number { const [y, m, d] = key.split("-").map(Number); const value = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); return value === 0 ? 6 : value - 1; }
function dateKeyAtSantiago(iso: string): string { return santiagoDateKey(new Date(iso)); }
function minutesAtSantiago(iso: string): number { const [hour, minute] = localTime(new Date(iso)).split(":").map(Number); return hour * 60 + minute; }
function formatTime(iso: string): string { return localTime(new Date(iso)); }
function formatLongDate(key: string): string { const value = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`)); return value.charAt(0).toUpperCase() + value.slice(1); }
function formatShortDate(key: string): string { return new Intl.DateTimeFormat("es-CL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`)).replaceAll(".", ""); }
function initials(name: string): string { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function timeFromMinutes(minutes: number): string { return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; }
function defaultEndTime(startMinutes: number, duration: number): string { return timeFromMinutes(Math.min(startMinutes + Math.max(duration, 1), 23 * 60 + 59)); }
function message(cause: unknown, fallback: string): string { return cause instanceof Error && cause.message ? cause.message : fallback; }

export function AgendaClient({ professionals, boxes, patients, blockDuration, initialAppointments, initialDate }: { professionals: Professional[]; boxes: Box[]; patients: Patient[]; blockDuration: number; initialAppointments: AgendaAppointment[]; initialDate: string }) {
  const [view, setView] = useState<View>("day"); const [date, setDate] = useState(initialDate); const [filterMode, setFilterMode] = useState<FilterMode>("professional");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState(professionals[0]?.id ?? ""); const [selectedBoxId, setSelectedBoxId] = useState(boxes[0]?.id ?? "");
  const [appointments, setAppointments] = useState(initialAppointments); const [now, setNow] = useState(() => new Date()); const [loadError, setLoadError] = useState(""); const [notice, setNotice] = useState("");
  const [createAt, setCreateAt] = useState<CreateAt | null>(null); const [createDialogAt, setCreateDialogAt] = useState<CreateAt | null>(null); const [isPending, startTransition] = useTransition(); const requestId = useRef(0);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);

  const monday = startOfLocalWeek(date);
  const days = useMemo(() => view === "day" ? [date] : Array.from({ length: 7 }, (_, i) => addLocalDays(monday, i)), [date, monday, view]);
  const selectedProfessional = professionals.find((item) => item.id === selectedProfessionalId);
  const visibleAppointments = useMemo(() => appointments.filter((item) => filterMode === "professional" ? item.professionalMembershipId === selectedProfessionalId : item.boxId === selectedBoxId), [appointments, filterMode, selectedBoxId, selectedProfessionalId]);
  const available = filterMode === "professional" ? selectedProfessional?.availability ?? [] : professionals.flatMap((item) => item.availability);
  const relevantAvailability = available.filter((item) => days.some((day) => weekdayIndex(day) === weekdays.indexOf(item.weekday)));
  const availabilityStarts = relevantAvailability.map((item) => Number(item.startsAt.slice(0, 2)) * 60 + Number(item.startsAt.slice(3, 5)));
  const availabilityEnds = relevantAvailability.map((item) => Number(item.endsAt.slice(0, 2)) * 60 + Number(item.endsAt.slice(3, 5)) + 60);
  const appointmentMinutes = visibleAppointments.filter((item) => days.includes(dateKeyAtSantiago(item.startsAt))).flatMap((item) => [minutesAtSantiago(item.startsAt), minutesAtSantiago(item.endsAt)]);
  const startMinutes = Math.max(0, Math.floor(Math.min(7 * 60, ...availabilityStarts, ...appointmentMinutes) / 30) * 30);
  const endMinutes = Math.min(24 * 60, Math.ceil(Math.max(19 * 60, ...availabilityEnds, ...appointmentMinutes) / 30) * 30);
  const slots = Array.from({ length: (endMinutes - startMinutes) / 30 }, (_, i) => startMinutes + i * 30);
  const today = dateKeyAtSantiago(now.toISOString()); const nowMinutes = minutesAtSantiago(now.toISOString());

  async function refreshRange(nextDate: string, nextView: View): Promise<boolean> {
    const fromKey = nextView === "week" ? startOfLocalWeek(nextDate) : nextDate; const toKey = addLocalDays(fromKey, nextView === "week" ? 7 : 1); const id = ++requestId.current; setLoadError("");
    try {
      const result = await getAgendaAppointments(santiagoDateKeyToUtc(fromKey).toISOString(), santiagoDateKeyToUtc(toKey).toISOString());
      if (requestId.current === id) setAppointments(result);
      return true;
    } catch {
      if (requestId.current === id) setLoadError("No pudimos cargar las citas de este rango. Intenta nuevamente.");
      return false;
    }
  }
  function loadRange(nextDate: string, nextView: View) { startTransition(() => { void refreshRange(nextDate, nextView); }); }
  function changeView(nextView: View) { setView(nextView); loadRange(date, nextView); }
  function selectDate(nextDate: string) { if (!nextDate) return; setDate(nextDate); loadRange(nextDate, view); }
  function navigate(amount: number) { selectDate(addLocalDays(date, amount * (view === "week" ? 7 : 1))); }
  function openCreateSlot(dateKey: string, start: number) { if (!selectedProfessional) { setLoadError("Selecciona un profesional para agendar una cita."); return; } if (createAt?.dateKey === dateKey && createAt.startMinutes === start) { setCreateDialogAt(createAt); return; } setLoadError(""); setNotice(""); setCreateAt({ dateKey, startMinutes: start }); setCreateDialogAt(null); }
  async function createdAppointment() { setCreateAt(null); setCreateDialogAt(null); setNotice("La cita se guardó correctamente."); await refreshRange(date, view); }

  return <section className="agenda-page" aria-labelledby="agenda-title">
    <header className="agenda-heading"><div><h1 id="agenda-title">Mi Calendario</h1><p className="muted">{formatLongDate(date)}</p></div><div className="agenda-controls">
      <div className="agenda-control-group"><span className="agenda-control-label">Vista por</span><div className="agenda-segmented" role="group" aria-label="Agrupar agenda por"><button type="button" className={filterMode === "professional" ? "is-active" : ""} aria-pressed={filterMode === "professional"} onClick={() => setFilterMode("professional")}>Profesional</button><button type="button" className={filterMode === "box" ? "is-active" : ""} aria-pressed={filterMode === "box"} onClick={() => setFilterMode("box")}>Box</button></div></div>
      <label className="agenda-selector"><span className="sr-only">{filterMode === "professional" ? "Profesional" : "Box"}</span>{filterMode === "professional" && selectedProfessional ? <span className="agenda-avatar" aria-hidden="true">{initials(selectedProfessional.name)}</span> : null}<select value={filterMode === "professional" ? selectedProfessionalId : selectedBoxId} onChange={(event) => filterMode === "professional" ? setSelectedProfessionalId(event.target.value) : setSelectedBoxId(event.target.value)} disabled={filterMode === "professional" ? !professionals.length : !boxes.length}>{filterMode === "professional" ? professionals.map((item) => <option value={item.id} key={item.id}>{item.name}</option>) : boxes.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <div className="agenda-segmented" role="group" aria-label="Periodo de agenda"><button type="button" className={view === "day" ? "is-active" : ""} aria-pressed={view === "day"} onClick={() => changeView("day")}>Día</button><button type="button" className={view === "week" ? "is-active" : ""} aria-pressed={view === "week"} onClick={() => changeView("week")}>Semana</button><button type="button" aria-disabled="true" disabled title="Próximamente">Global</button></div>
      <label className="agenda-date-picker"><Icon name="calendar" /><span className="sr-only">Elegir fecha</span><input type="date" value={date} onChange={(event) => selectDate(event.target.value)} /></label>
      <div className="agenda-navigation" aria-label="Navegar por fechas"><button type="button" aria-label={view === "day" ? "Día anterior" : "Semana anterior"} onClick={() => navigate(-1)}><Icon name="chevron-left" /></button><button type="button" onClick={() => selectDate(dateKeyAtSantiago(new Date().toISOString()))}>Hoy</button><button type="button" aria-label={view === "day" ? "Día siguiente" : "Semana siguiente"} onClick={() => navigate(1)}><Icon name="chevron-right" /></button></div>
    </div></header>
    <div className="agenda-datebar"><Icon name="calendar" /><strong>{view === "day" ? formatLongDate(date) : `${formatShortDate(monday)} al ${formatShortDate(addLocalDays(monday, 6))}`}</strong>{isPending ? <span className="muted">Actualizando...</span> : null}</div>
    {loadError ? <p className="agenda-error" role="alert">{loadError}</p> : null}
    {notice ? <p className="agenda-notice" role="status">{notice}</p> : null}
    <div className="agenda-calendar-scroll"><div className={`agenda-calendar agenda-calendar--${view}`} style={{ "--agenda-slots": slots.length } as CSSProperties}>
      <div className="agenda-corner" aria-hidden="true"><Icon name="clock" /></div>
      {days.map((day) => <div className={`agenda-day-heading ${day === today ? "is-today" : ""}`} key={day}><span>{formatShortDate(day)}</span>{day === today ? <small>Hoy</small> : null}</div>)}
      <div className="agenda-time-axis">{slots.map((minutes) => <div className="agenda-time-label" key={minutes}>{String(Math.floor(minutes / 60)).padStart(2, "0")}:{String(minutes % 60).padStart(2, "0")}</div>)}</div>
      {days.map((day) => { const dayAppointments = visibleAppointments.filter((item) => dateKeyAtSantiago(item.startsAt) === day); const showNow = day === today && nowMinutes >= startMinutes && nowMinutes <= endMinutes; return <div className={`agenda-day-lane ${day === today ? "is-today" : ""}`} key={day} aria-label={`Agenda de ${formatLongDate(day)}`}>
        <div className="agenda-slot-grid">{slots.map((minutes) => { const active = createAt?.dateKey === day && createAt.startMinutes === minutes; const endsAt = defaultEndTime(minutes, blockDuration); return <button className={`agenda-create-slot ${active ? "is-active" : ""}`} type="button" key={minutes} onClick={() => openCreateSlot(day, minutes)} aria-label={active ? `Abrir nueva cita a las ${timeFromMinutes(minutes)}` : `Seleccionar horario a las ${timeFromMinutes(minutes)}`}><span className="agenda-slot-plus" aria-hidden="true">+</span>{active ? <span className="agenda-agendar-chip">+ Agendar <small>{timeFromMinutes(minutes)} - {endsAt}</small></span> : null}</button>; })}</div>
        {dayAppointments.map((appointment) => { const start = minutesAtSantiago(appointment.startsAt); const end = minutesAtSantiago(appointment.endsAt); const top = ((start - startMinutes) / 30) * halfHourHeight; const height = Math.max(halfHourHeight - 3, ((end - start) / 30) * halfHourHeight - 3); return <article className={`agenda-appointment ${appointment.kind === "block" ? "is-block" : ""} ${appointment.status === "pending" ? "is-pending" : ""}`} style={{ top, height }} key={appointment.id} title={appointment.notes ?? undefined}><strong>{appointment.kind === "block" ? "Bloque" : appointment.patientName}</strong><span>{formatTime(appointment.startsAt)} - {formatTime(appointment.endsAt)}</span><small>{appointment.kind === "block" ? "No disponible" : appointment.status === "confirmed" ? "Confirmada" : "Pendiente"}</small></article>; })}
        {showNow ? <div className="agenda-now-line" style={{ top: ((nowMinutes - startMinutes) / 30) * halfHourHeight }} aria-label={`Hora actual ${formatTime(now.toISOString())}`}><span /></div> : null}
      </div>; })}
    </div></div>
    {!isPending && visibleAppointments.filter((item) => days.includes(dateKeyAtSantiago(item.startsAt))).length === 0 ? <div className="agenda-empty"><Icon name="calendar" /><div><strong>Sin citas</strong><p>No hay citas programadas para este rango y selección.</p></div><button type="button" onClick={() => view === "day" ? changeView("week") : selectDate(today)}>{view === "day" ? "Ver semana" : "Volver a hoy"}</button></div> : null}
    {createDialogAt && selectedProfessional ? <AgendaCreateDialog key={`${createDialogAt.dateKey}-${createDialogAt.startMinutes}-${selectedProfessional.id}`} createAt={createDialogAt} professional={selectedProfessional} boxes={boxes} patients={patients} blockDuration={blockDuration} onClose={() => setCreateDialogAt(null)} onCreated={createdAppointment} /> : null}
  </section>;
}

function AgendaCreateDialog({ createAt, professional, boxes, patients, blockDuration, onClose, onCreated }: { createAt: CreateAt; professional: Professional; boxes: Box[]; patients: Patient[]; blockDuration: number; onClose: () => void; onCreated: () => Promise<void> }) {
  const dialogRef = useRef<HTMLDialogElement>(null); const titleRef = useRef<HTMLHeadingElement>(null);
  const [patientName, setPatientName] = useState(""); const [patientId, setPatientId] = useState<string | null>(null); const [patientContact, setPatientContact] = useState<string | null>(null); const [boxId, setBoxId] = useState(""); const [notes, setNotes] = useState(""); const [startsAt, setStartsAt] = useState(() => timeFromMinutes(createAt.startMinutes)); const [endsAt, setEndsAt] = useState(() => defaultEndTime(createAt.startMinutes, blockDuration)); const [error, setError] = useState(""); const [isCreating, setIsCreating] = useState(false);
  const matches = useMemo(() => { const query = patientName.trim().toLocaleLowerCase("es-CL"); if (!query) return []; return patients.filter((patient) => `${patient.name} ${patient.email ?? ""}`.toLocaleLowerCase("es-CL").includes(query)).slice(0, 6); }, [patientName, patients]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => titleRef.current?.focus());
  }, []);

  function choosePatient(patient: Patient) { setPatientName(patient.name); setPatientId(patient.id); setPatientContact(patient.phone ?? patient.email); }
  function changePatientName(value: string) { setPatientName(value); const exact = patients.find((patient) => patient.name.toLocaleLowerCase("es-CL") === value.trim().toLocaleLowerCase("es-CL")); if (exact) choosePatient(exact); else { setPatientId(null); setPatientContact(null); } }
  function close() { if (!isCreating) onClose(); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patientName.trim()) { setError("Ingresa o selecciona una persona paciente."); return; }
    if (!startsAt || !endsAt || startsAt >= endsAt) { setError("La hora de término debe ser posterior a la hora de inicio."); return; }
    setError(""); setIsCreating(true);
    try {
      const day = new Date(`${createAt.dateKey}T12:00:00.000Z`);
      await createAgendaAppointment({ professionalMembershipId: professional.id, boxId: boxId || null, patientId, patientName: patientName.trim(), patientContact, startsAtIso: santiagoLocalToUtc(day, startsAt).toISOString(), endsAtIso: santiagoLocalToUtc(day, endsAt).toISOString(), notes: notes.trim() || null });
      await onCreated();
    } catch (cause) { setError(message(cause, "No pudimos guardar la cita. Intenta nuevamente.")); }
    finally { setIsCreating(false); }
  }

  return <dialog className="agenda-appointment-dialog" ref={dialogRef} aria-labelledby="agenda-create-title" onCancel={(event) => { if (isCreating) event.preventDefault(); else close(); }} onClose={onClose}>
    <form className="agenda-appointment-form" onSubmit={submit}>
      <header className="agenda-appointment-dialog-header"><div><h2 id="agenda-create-title" ref={titleRef} tabIndex={-1}>Nueva cita</h2><p>{createAt ? formatLongDate(createAt.dateKey) : ""}</p></div><button className="icon-button" type="button" aria-label="Cerrar nueva cita" onClick={close} disabled={isCreating}><CloseIcon /></button></header>
      <div className="agenda-appointment-dialog-content">
        <label className="agenda-patient-field">Paciente<input type="text" value={patientName} onChange={(event) => changePatientName(event.target.value)} autoComplete="off" placeholder="Busca por nombre o correo" aria-autocomplete="list" aria-controls="agenda-patient-results" disabled={isCreating} required />{matches.length && !patientId ? <ul className="agenda-patient-suggestions" id="agenda-patient-results" role="listbox">{matches.map((patient) => <li key={patient.id}><button type="button" onClick={() => choosePatient(patient)} disabled={isCreating}><strong>{patient.name}</strong><span>{patient.email ?? patient.phone ?? "Sin datos de contacto"}</span></button></li>)}</ul> : null}<small>Puedes escribir un nombre para una persona paciente nueva.</small></label>
        <div className="agenda-professional-summary"><span className="agenda-avatar" aria-hidden="true">{professional ? initials(professional.name) : ""}</span><div><span>Profesional</span><strong>{professional?.name}</strong></div></div>
        <div className="agenda-time-fields"><label>Hora de inicio<input type="time" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} disabled={isCreating} required /></label><label>Hora de término<input type="time" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} disabled={isCreating} required /></label></div>
        <label>Box<select value={boxId} onChange={(event) => setBoxId(event.target.value)} disabled={isCreating}><option value="">Sin box</option>{boxes.map((box) => <option value={box.id} key={box.id}>{box.name}</option>)}</select></label>
        <label>Notas (opcional)<textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={isCreating} maxLength={2000} placeholder="Agrega información relevante para la cita" /></label>
        {error ? <p className="agenda-dialog-error" role="alert">{error}</p> : null}
      </div>
      <footer className="agenda-appointment-dialog-footer"><button className="button" type="button" onClick={close} disabled={isCreating}>Cancelar</button><button className="button button-primary" type="submit" disabled={isCreating}>{isCreating ? "Guardando..." : "Guardar cita"}</button></footer>
    </form>
  </dialog>;
}
