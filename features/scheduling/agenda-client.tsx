"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { getAgendaAppointments, type AgendaAppointment } from "./agenda-actions";
import { addLocalDays, localTime, santiagoDateKey, santiagoDateKeyToUtc, startOfLocalWeek } from "./domain";

type View = "day" | "week";
type FilterMode = "professional" | "box";
type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type Availability = { weekday: Weekday; startsAt: string; endsAt: string };
type Professional = { id: string; name: string; availability: Availability[] };
type Box = { id: string; name: string };

const halfHourHeight = 42;
const weekdays: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function Icon({ name }: { name: "calendar" | "chevron-left" | "chevron-right" | "clock" }) {
  if (name === "calendar") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v3M18 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" /></svg>;
  if (name === "clock") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={name === "chevron-left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} /></svg>;
}
function weekdayIndex(key: string): number { const [y, m, d] = key.split("-").map(Number); const value = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); return value === 0 ? 6 : value - 1; }
function dateKeyAtSantiago(iso: string): string { return santiagoDateKey(new Date(iso)); }
function minutesAtSantiago(iso: string): number { const [hour, minute] = localTime(new Date(iso)).split(":").map(Number); return hour * 60 + minute; }
function formatTime(iso: string): string { return localTime(new Date(iso)); }
function formatLongDate(key: string): string { const value = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`)); return value.charAt(0).toUpperCase() + value.slice(1); }
function formatShortDate(key: string): string { return new Intl.DateTimeFormat("es-CL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`)).replaceAll(".", ""); }
function initials(name: string): string { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }

export function AgendaClient({ professionals, boxes, initialAppointments, initialDate }: { professionals: Professional[]; boxes: Box[]; initialAppointments: AgendaAppointment[]; initialDate: string }) {
  const [view, setView] = useState<View>("day"); const [date, setDate] = useState(initialDate); const [filterMode, setFilterMode] = useState<FilterMode>("professional");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState(professionals[0]?.id ?? ""); const [selectedBoxId, setSelectedBoxId] = useState(boxes[0]?.id ?? "");
  const [appointments, setAppointments] = useState(initialAppointments); const [now, setNow] = useState(() => new Date()); const [loadError, setLoadError] = useState("");
  const [isPending, startTransition] = useTransition(); const requestId = useRef(0);
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

  function loadRange(nextDate: string, nextView: View) {
    const fromKey = nextView === "week" ? startOfLocalWeek(nextDate) : nextDate; const toKey = addLocalDays(fromKey, nextView === "week" ? 7 : 1); const id = ++requestId.current; setLoadError("");
    startTransition(async () => { try { const result = await getAgendaAppointments(santiagoDateKeyToUtc(fromKey).toISOString(), santiagoDateKeyToUtc(toKey).toISOString()); if (requestId.current === id) setAppointments(result); } catch { if (requestId.current === id) setLoadError("No pudimos cargar las citas de este rango. Intenta nuevamente."); } });
  }
  function changeView(nextView: View) { setView(nextView); loadRange(date, nextView); }
  function selectDate(nextDate: string) { if (!nextDate) return; setDate(nextDate); loadRange(nextDate, view); }
  function navigate(amount: number) { selectDate(addLocalDays(date, amount * (view === "week" ? 7 : 1))); }

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
    <div className="agenda-calendar-scroll"><div className={`agenda-calendar agenda-calendar--${view}`} style={{ "--agenda-slots": slots.length } as CSSProperties}>
      <div className="agenda-corner" aria-hidden="true"><Icon name="clock" /></div>
      {days.map((day) => <div className={`agenda-day-heading ${day === today ? "is-today" : ""}`} key={day}><span>{formatShortDate(day)}</span>{day === today ? <small>Hoy</small> : null}</div>)}
      <div className="agenda-time-axis">{slots.map((minutes) => <div className="agenda-time-label" key={minutes}>{String(Math.floor(minutes / 60)).padStart(2, "0")}:{String(minutes % 60).padStart(2, "0")}</div>)}</div>
      {days.map((day) => { const dayAppointments = visibleAppointments.filter((item) => dateKeyAtSantiago(item.startsAt) === day); const showNow = day === today && nowMinutes >= startMinutes && nowMinutes <= endMinutes; return <div className={`agenda-day-lane ${day === today ? "is-today" : ""}`} key={day} aria-label={`Agenda de ${formatLongDate(day)}`}>
        <div className="agenda-slot-grid" aria-hidden="true">{slots.map((minutes) => <span key={minutes} />)}</div>
        {dayAppointments.map((appointment) => { const start = minutesAtSantiago(appointment.startsAt); const end = minutesAtSantiago(appointment.endsAt); const top = ((start - startMinutes) / 30) * halfHourHeight; const height = Math.max(halfHourHeight - 3, ((end - start) / 30) * halfHourHeight - 3); return <article className={`agenda-appointment ${appointment.kind === "block" ? "is-block" : ""} ${appointment.status === "pending" ? "is-pending" : ""}`} style={{ top, height }} key={appointment.id} title={appointment.notes ?? undefined}><strong>{appointment.kind === "block" ? "Bloque" : appointment.patientName}</strong><span>{formatTime(appointment.startsAt)}–{formatTime(appointment.endsAt)}</span><small>{appointment.kind === "block" ? "No disponible" : appointment.status === "confirmed" ? "Confirmada" : "Pendiente"}</small></article>; })}
        {showNow ? <div className="agenda-now-line" style={{ top: ((nowMinutes - startMinutes) / 30) * halfHourHeight }} aria-label={`Hora actual ${formatTime(now.toISOString())}`}><span /></div> : null}
      </div>; })}
    </div></div>
    {!isPending && visibleAppointments.filter((item) => days.includes(dateKeyAtSantiago(item.startsAt))).length === 0 ? <div className="agenda-empty"><Icon name="calendar" /><div><strong>Sin citas</strong><p>No hay citas programadas para este rango y selección.</p></div><button type="button" onClick={() => view === "day" ? changeView("week") : selectDate(today)}>{view === "day" ? "Ver semana" : "Volver a hoy"}</button></div> : null}
  </section>;
}
