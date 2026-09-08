"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type FormEvent } from "react";
import { getAgendaAppointments, getAgendaBlocksForRange, type AgendaAppointment, type AgendaBlock } from "./agenda-actions";
import { createAgendaAppointment } from "./agenda-create-actions";
import { createPatientForAppointment, type ConvenioOption } from "@/app/(app)/patients/actions";
import { PatientCreateDialog } from "@/components/patients/patient-create-dialog";
import { addLocalDays, localTime, santiagoDateKey, santiagoDateKeyToUtc, santiagoLocalToUtc, startOfLocalWeek } from "./domain";

type View = "day" | "week" | "global";
type FilterMode = "professional" | "box";
type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type Availability = { weekday: Weekday; startsAt: string; endsAt: string };
type Professional = { id: string; name: string; availability: Availability[] };
type Box = { id: string; name: string };
type Patient = { id: string; name: string; email: string | null; phone: string | null };
type SessionType = { id: string; name: string; durationMinutes: number; isDefault: boolean };
type CreateAt = { dateKey: string; startMinutes: number; professionalId?: string };

const halfHourHeight = 42;
const weekdays: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function Icon({ name }: { name: "calendar" | "chevron-left" | "chevron-right" | "clock" }) {
  if (name === "calendar") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v3M18 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" /></svg>;
  if (name === "clock") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={name === "chevron-left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} /></svg>;
}
function CloseIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>; }
function CreatePatientIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-3.3 2.3-5 5.5-5 2.1 0 3.6.7 4.5 2M18 8v6M15 11h6" /></svg>; }
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
function minutesFromTime(time: string): number { const [hour, minute] = time.slice(0, 5).split(":").map(Number); return hour * 60 + minute; }
const reasonLabels: Record<AgendaBlock["reason"], string> = { meeting: "Reunión", training: "Capacitación", procedure: "Procedimiento", permission: "Permiso", holiday: "Feriado", maintenance: "Mantención", other: "Otro" };
function ProhibitionIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m6.4 6.4 11.2 11.2" /></svg>; }

export function AgendaClient({ professionals, boxes, patients, convenios, sessionTypes, blockDuration, initialAppointments, blocks: initialBlocks, initialDate }: { professionals: Professional[]; boxes: Box[]; patients: Patient[]; convenios: ConvenioOption[]; sessionTypes: SessionType[]; blockDuration: number; initialAppointments: AgendaAppointment[]; blocks: AgendaBlock[]; initialDate: string }) {
  const [view, setView] = useState<View>("day");
  const [globalPeriod, setGlobalPeriod] = useState<"day" | "week">("day");
  const [date, setDate] = useState(initialDate);
  const [filterMode, setFilterMode] = useState<FilterMode>("professional");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState(professionals[0]?.id ?? "");
  const [selectedBoxId, setSelectedBoxId] = useState(boxes[0]?.id ?? "");
  const [boxQuery, setBoxQuery] = useState(boxes[0]?.name ?? "");
  const [boxListOpen, setBoxListOpen] = useState(false);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [now, setNow] = useState(() => new Date());
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [createAt, setCreateAt] = useState<CreateAt | null>(null);
  const [createDialogAt, setCreateDialogAt] = useState<CreateAt | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);

  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);

  const period: "day" | "week" = view === "global" ? globalPeriod : view;
  const monday = startOfLocalWeek(date);
  const days = useMemo(() => period === "day" ? [date] : Array.from({ length: 7 }, (_, i) => addLocalDays(monday, i)), [date, monday, period]);
  const selectedProfessional = professionals.find((item) => item.id === selectedProfessionalId);
  const filteredBoxes = useMemo(() => {
    const query = boxQuery.trim().toLocaleLowerCase("es-CL");
    return query ? boxes.filter((box) => box.name.toLocaleLowerCase("es-CL").includes(query)) : boxes;
  }, [boxQuery, boxes]);
  const visibleAppointments = useMemo(() => view === "global" ? appointments : appointments.filter((item) => filterMode === "professional" ? item.professionalMembershipId === selectedProfessionalId : item.boxId === selectedBoxId), [appointments, filterMode, selectedBoxId, selectedProfessionalId, view]);
  const visibleBlocks = useMemo(() => blocks.filter((block) => block.scope === "clinic" || (filterMode === "box" && (view === "global" || block.boxId === selectedBoxId))), [blocks, filterMode, selectedBoxId, view]);
  const available = view === "global" || filterMode === "box" ? professionals.flatMap((item) => item.availability) : selectedProfessional?.availability ?? [];
  const relevantAvailability = available.filter((item) => days.some((day) => weekdayIndex(day) === weekdays.indexOf(item.weekday)));
  const availabilityStarts = relevantAvailability.map((item) => Number(item.startsAt.slice(0, 2)) * 60 + Number(item.startsAt.slice(3, 5)));
  const availabilityEnds = relevantAvailability.map((item) => Number(item.endsAt.slice(0, 2)) * 60 + Number(item.endsAt.slice(3, 5)) + 60);
  const appointmentMinutes = visibleAppointments.filter((item) => days.includes(dateKeyAtSantiago(item.startsAt))).flatMap((item) => [minutesAtSantiago(item.startsAt), minutesAtSantiago(item.endsAt)]);
  const blockMinutes = visibleBlocks.filter((block) => !block.allDay && block.startsAt && block.endsAt && days.some((day) => block.startsOn <= day && block.endsOn >= day)).flatMap((block) => [minutesFromTime(block.startsAt!), minutesFromTime(block.endsAt!)]);
  const startMinutes = Math.max(0, Math.floor(Math.min(7 * 60, ...availabilityStarts, ...appointmentMinutes, ...blockMinutes) / 30) * 30);
  const endMinutes = Math.min(24 * 60, Math.ceil(Math.max(19 * 60, ...availabilityEnds, ...appointmentMinutes, ...blockMinutes) / 30) * 30);
  const slots = Array.from({ length: (endMinutes - startMinutes) / 30 }, (_, i) => startMinutes + i * 30);
  const today = dateKeyAtSantiago(now.toISOString());
  const nowMinutes = minutesAtSantiago(now.toISOString());
  const laneEntities = filterMode === "professional" ? professionals : boxes;

  async function refreshRange(nextDate: string, nextView: View): Promise<boolean> {
    const nextPeriod = nextView === "global" ? globalPeriod : nextView;
    const fromKey = nextPeriod === "week" ? startOfLocalWeek(nextDate) : nextDate;
    const toKey = addLocalDays(fromKey, nextPeriod === "week" ? 7 : 1);
    const id = ++requestId.current;
    setLoadError("");
    try {
      const [nextAppointments, nextBlocks] = await Promise.all([
        getAgendaAppointments(santiagoDateKeyToUtc(fromKey).toISOString(), santiagoDateKeyToUtc(toKey).toISOString()),
        getAgendaBlocksForRange(fromKey, toKey),
      ]);
      if (requestId.current === id) { setAppointments(nextAppointments); setBlocks(nextBlocks); }
      return true;
    } catch {
      if (requestId.current === id) setLoadError("No pudimos cargar la agenda de este rango. Intenta nuevamente.");
      return false;
    }
  }
  function loadRange(nextDate: string, nextView: View) { startTransition(() => { void refreshRange(nextDate, nextView); }); }
  function changeView(nextView: View) {
    const nextGlobalPeriod = view === "week" ? "week" : view === "day" ? "day" : globalPeriod;
    if (nextView === "global") setGlobalPeriod(nextGlobalPeriod);
    setView(nextView);
    loadRange(date, nextView === "global" ? nextGlobalPeriod : nextView);
  }
  function selectDate(nextDate: string) { if (!nextDate) return; setDate(nextDate); loadRange(nextDate, view); }
  function navigate(amount: number) { selectDate(addLocalDays(date, amount * (period === "week" ? 7 : 1))); }
  function openCreateSlot(dateKey: string, start: number, professionalId?: string) {
    const professional = professionals.find((item) => item.id === professionalId) ?? selectedProfessional;
    if (!professional) { setLoadError("Selecciona un profesional para agendar una cita."); return; }
    const next = { dateKey, startMinutes: start, professionalId: professional.id };
    if (createAt?.dateKey === dateKey && createAt.startMinutes === start && createAt.professionalId === professional.id) { setCreateDialogAt(next); return; }
    setLoadError(""); setNotice(""); setCreateAt(next); setCreateDialogAt(null);
  }
  async function createdAppointment() { setCreateAt(null); setCreateDialogAt(null); setNotice("La cita se guardó correctamente."); await refreshRange(date, view); }
  function chooseBox(box: Box) { setSelectedBoxId(box.id); setBoxQuery(box.name); setBoxListOpen(false); }
  function appointmentState(appointment: AgendaAppointment): string {
    if (appointment.kind === "block") return "is-block";
    if (appointment.status === "cancelled") return "is-cancelled";
    if (appointment.attendance === "missed") return "is-missed";
    if (appointment.status === "confirmed") return "is-confirmed";
    return appointment.source === "public" ? "is-online" : "is-agendada";
  }
  function renderAppointment(appointment: AgendaAppointment) {
    const start = minutesAtSantiago(appointment.startsAt);
    const end = minutesAtSantiago(appointment.endsAt);
    const top = ((start - startMinutes) / 30) * halfHourHeight;
    const height = Math.max(halfHourHeight - 3, ((end - start) / 30) * halfHourHeight - 3);
    const fallback = appointment.kind === "block" ? "No disponible" : appointment.status === "cancelled" ? "Cancelada" : appointment.attendance === "missed" ? "No asistió" : appointment.status === "confirmed" ? "Confirmada" : appointment.source === "public" ? "Agendada Online" : "Agendada";
    return <article className={"agenda-appointment " + appointmentState(appointment)} style={{ top, height }} key={appointment.id} title={appointment.notes ?? undefined}><strong>{appointment.kind === "block" ? "Bloque" : appointment.patientName}</strong><span>{formatTime(appointment.startsAt)} - {formatTime(appointment.endsAt)}</span>{appointment.sessionTypeName ? <small>{appointment.sessionTypeName}</small> : <small>{fallback}</small>}</article>;
  }
  function applicableBlocks(day: string, entity?: Professional | Box): AgendaBlock[] {
    return blocks.filter((block) => {
      if (block.startsOn > day || block.endsOn < day) return false;
      if (block.scope === "clinic") return true;
      if (filterMode !== "box") return false;
      return block.boxId === (entity?.id ?? selectedBoxId);
    });
  }
  function blockedAt(laneBlocks: AgendaBlock[], minutes: number): boolean {
    const slotEnd = minutes + 30;
    return laneBlocks.some((block) => block.allDay || (block.startsAt && block.endsAt && minutesFromTime(block.startsAt) < slotEnd && minutesFromTime(block.endsAt) > minutes));
  }
  function renderBlock(block: AgendaBlock) {
    const rawStart = block.allDay || !block.startsAt ? startMinutes : minutesFromTime(block.startsAt);
    const rawEnd = block.allDay || !block.endsAt ? endMinutes : minutesFromTime(block.endsAt);
    const clippedStart = Math.max(startMinutes, rawStart);
    const clippedEnd = Math.min(endMinutes, rawEnd);
    if (clippedEnd <= clippedStart) return null;
    const top = ((clippedStart - startMinutes) / 30) * halfHourHeight;
    const height = ((clippedEnd - clippedStart) / 30) * halfHourHeight;
    const minutes = rawEnd - rawStart;
    const range = block.allDay ? "Todo el día" : `${block.startsAt!.slice(0, 5)} - ${block.endsAt!.slice(0, 5)} (${minutes} min)`;
    return <div className="agenda-block-overlay" style={{ top, height }} key={block.id} role="note" aria-label={`${reasonLabels[block.reason]}. ${range}`}>
      <div className="agenda-block-stripes" aria-hidden="true" />
      <span className="agenda-block-tag"><ProhibitionIcon /><strong>{reasonLabels[block.reason]}</strong><small className="agenda-block-range">{range}</small></span>
    </div>;
  }
  function renderLane(day: string, entity?: Professional | Box) {
    const entityAppointments = visibleAppointments.filter((item) => dateKeyAtSantiago(item.startsAt) === day && (!entity || (filterMode === "professional" ? item.professionalMembershipId === entity.id : item.boxId === entity.id)));
    const showNow = day === today && nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    const professionalId = filterMode === "professional" ? entity?.id : selectedProfessionalId;
    const laneKey = entity ? entity.id + "-" + day : day;
    const laneBlocks = applicableBlocks(day, entity);
    return <div className={"agenda-day-lane " + (day === today ? "is-today" : "")} key={laneKey} aria-label={"Agenda de " + (entity?.name ?? formatLongDate(day))}>
      <div className="agenda-slot-grid">{slots.map((minutes) => {
        const active = createAt?.dateKey === day && createAt.startMinutes === minutes && createAt.professionalId === professionalId;
        const blocked = blockedAt(laneBlocks, minutes);
        const endsAt = defaultEndTime(minutes, blockDuration);
        return <button className={"agenda-create-slot " + (active ? "is-active" : "")} type="button" key={minutes} disabled={blocked} onClick={() => openCreateSlot(day, minutes, professionalId)} aria-label={blocked ? "Horario bloqueado a las " + timeFromMinutes(minutes) : active ? "Abrir nueva cita a las " + timeFromMinutes(minutes) : "Seleccionar horario a las " + timeFromMinutes(minutes)}><span className="agenda-slot-plus" aria-hidden="true">+</span>{active && !blocked ? <span className="agenda-agendar-chip">+ Agendar <small>{timeFromMinutes(minutes)} - {endsAt}</small></span> : null}</button>;
      })}</div>
      {laneBlocks.map(renderBlock)}
      {entityAppointments.map(renderAppointment)}
      {showNow ? <div className="agenda-now-line" style={{ top: ((nowMinutes - startMinutes) / 30) * halfHourHeight }} aria-label={"Hora actual " + formatTime(now.toISOString())}><span /></div> : null}
    </div>;
  }

  const dialogProfessional = professionals.find((item) => item.id === createDialogAt?.professionalId) ?? selectedProfessional;
  const periodLabel = period === "day" ? formatLongDate(date) : formatShortDate(monday) + " al " + formatShortDate(addLocalDays(monday, 6));

  return <section className="agenda-page" aria-labelledby="agenda-title">
    <header className="agenda-heading"><div><h1 id="agenda-title">Mi Calendario</h1><p className="muted">{formatLongDate(date)}</p></div><div className="agenda-controls">
      <div className="agenda-control-group"><span className="agenda-control-label">Vista por</span><div className="agenda-segmented" role="group" aria-label="Agrupar agenda por"><button type="button" className={filterMode === "professional" ? "is-active" : ""} aria-pressed={filterMode === "professional"} onClick={() => setFilterMode("professional")}>Profesional</button><button type="button" className={filterMode === "box" ? "is-active" : ""} aria-pressed={filterMode === "box"} onClick={() => setFilterMode("box")}>Box</button></div></div>
      {filterMode === "professional" ? <label className="agenda-selector"><span className="sr-only">Profesional</span>{selectedProfessional ? <span className="agenda-avatar" aria-hidden="true">{initials(selectedProfessional.name)}</span> : null}<select value={selectedProfessionalId} onChange={(event) => setSelectedProfessionalId(event.target.value)} disabled={!professionals.length || view === "global"} title={view === "global" ? "En Global se muestran todos" : undefined}>{professionals.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label> : <div className="agenda-box-combobox"><label className="sr-only" htmlFor="agenda-box-search">Box</label><input id="agenda-box-search" type="text" role="combobox" aria-expanded={boxListOpen && view !== "global"} aria-controls="agenda-box-results" aria-autocomplete="list" value={view === "global" ? "Todos los boxes" : boxQuery} placeholder="Busca un box" disabled={view === "global" || !boxes.length} title={view === "global" ? "En Global se muestran todos" : undefined} onFocus={() => setBoxListOpen(true)} onChange={(event) => { setBoxQuery(event.target.value); setBoxListOpen(true); }} />{boxListOpen && view !== "global" ? <ul id="agenda-box-results" className="agenda-box-results" role="listbox">{filteredBoxes.length ? filteredBoxes.map((box) => <li key={box.id} role="option" aria-selected={box.id === selectedBoxId}><button type="button" onClick={() => chooseBox(box)}>{box.name}</button></li>) : <li className="agenda-box-empty">No hay boxes con ese nombre.</li>}</ul> : null}</div>}
      <div className="agenda-segmented" role="group" aria-label="Periodo de agenda"><button type="button" className={view === "day" ? "is-active" : ""} aria-pressed={view === "day"} onClick={() => changeView("day")}>Día</button><button type="button" className={view === "week" ? "is-active" : ""} aria-pressed={view === "week"} onClick={() => changeView("week")}>Semana</button><button type="button" className={view === "global" ? "is-active" : ""} aria-pressed={view === "global"} onClick={() => changeView("global")}>Global</button></div>
      <label className="agenda-date-picker"><Icon name="calendar" /><span className="sr-only">Elegir fecha</span><input type="date" value={date} onChange={(event) => selectDate(event.target.value)} /></label>
      <div className="agenda-navigation" aria-label="Navegar por fechas"><button type="button" aria-label={period === "day" ? "Día anterior" : "Semana anterior"} onClick={() => navigate(-1)}><Icon name="chevron-left" /></button><button type="button" onClick={() => selectDate(dateKeyAtSantiago(new Date().toISOString()))}>Hoy</button><button type="button" aria-label={period === "day" ? "Día siguiente" : "Semana siguiente"} onClick={() => navigate(1)}><Icon name="chevron-right" /></button></div>
    </div></header>
    <div className="agenda-datebar"><Icon name="calendar" /><strong>{periodLabel}</strong>{view === "global" ? <span className="agenda-global-summary">{filterMode === "professional" ? "Todos los profesionales" : "Todos los boxes"}</span> : null}{isPending ? <span className="muted">Actualizando...</span> : null}</div>
    <aside className="agenda-legend" aria-labelledby="agenda-legend-title"><strong id="agenda-legend-title">Leyenda de Estados</strong><div className="agenda-legend-list">{[["is-agendada", "Agendada"], ["is-online", "Agendada Online"], ["is-confirmed", "Confirmada"], ["is-cancelled", "Cancelada"], ["is-missed", "No asistió"], ["is-block", "Bloqueado"]].map(([state, label]) => <span className="agenda-legend-item" key={state}><i className={"agenda-swatch " + state} aria-hidden="true" />{label}</span>)}</div></aside>
    {loadError ? <p className="agenda-error" role="alert">{loadError}</p> : null}
    {notice ? <p className="agenda-notice" role="status">{notice}</p> : null}
    <div className={"agenda-calendar-scroll " + (view === "global" ? "global-grid" : "")}>
      {view === "global" ? period === "day" ? <div className="agenda-global-day" style={{ "--agenda-slots": slots.length, "--agenda-entities": laneEntities.length } as CSSProperties}>
        <div className="agenda-corner" aria-hidden="true"><Icon name="clock" /></div>
        {laneEntities.map((entity) => <div className="agenda-day-heading is-lane-heading" key={entity.id}>{filterMode === "professional" ? <span className="agenda-avatar" aria-hidden="true">{initials(entity.name)}</span> : null}<span>{entity.name}</span></div>)}
        <div className="agenda-time-axis">{slots.map((minutes) => <div className="agenda-time-label" key={minutes}>{timeFromMinutes(minutes)}</div>)}</div>
        {laneEntities.map((entity) => renderLane(date, entity))}
      </div> : <div className="agenda-global-matrix" style={{ "--agenda-slots": slots.length, "--agenda-days": days.length } as CSSProperties}>
          <div className="agenda-corner agenda-global-corner" aria-hidden="true"><Icon name="clock" /></div>
          {days.map((day) => <div className={"agenda-day-heading " + (day === today ? "is-today" : "")} key={day}><span>{formatShortDate(day)}</span>{day === today ? <small>Hoy</small> : null}</div>)}
          {laneEntities.map((entity) => <div className="agenda-global-row" key={entity.id}>
            <div className="agenda-lane-label" title={entity.name}>{filterMode === "professional" ? <span className="agenda-avatar" aria-hidden="true">{initials(entity.name)}</span> : null}<strong>{entity.name}</strong></div>
            <div className="agenda-time-axis">{slots.map((minutes) => <div className="agenda-time-label" key={minutes}>{timeFromMinutes(minutes)}</div>)}</div>
            {days.map((day) => renderLane(day, entity))}
          </div>)}
        </div> : <div className={"agenda-calendar agenda-calendar--" + view} style={{ "--agenda-slots": slots.length } as CSSProperties}>
        <div className="agenda-corner" aria-hidden="true"><Icon name="clock" /></div>
        {days.map((day) => <div className={"agenda-day-heading " + (day === today ? "is-today" : "")} key={day}><span>{formatShortDate(day)}</span>{day === today ? <small>Hoy</small> : null}</div>)}
        <div className="agenda-time-axis">{slots.map((minutes) => <div className="agenda-time-label" key={minutes}>{timeFromMinutes(minutes)}</div>)}</div>
        {days.map((day) => renderLane(day))}
      </div>}
    </div>
    {!isPending && visibleAppointments.filter((item) => days.includes(dateKeyAtSantiago(item.startsAt))).length === 0 ? <div className="agenda-empty"><Icon name="calendar" /><div><strong>Sin citas</strong><p>No hay citas programadas para este rango y selección.</p></div><button type="button" onClick={() => period === "day" ? changeView("week") : selectDate(today)}>{period === "day" ? "Ver semana" : "Volver a hoy"}</button></div> : null}
    {createDialogAt && dialogProfessional ? <AgendaCreateDialog key={createDialogAt.dateKey + "-" + createDialogAt.startMinutes + "-" + dialogProfessional.id} createAt={createDialogAt} professional={dialogProfessional} boxes={boxes} patients={patients} convenios={convenios} sessionTypes={sessionTypes} blockDuration={blockDuration} onClose={() => setCreateDialogAt(null)} onCreated={createdAppointment} /> : null}
  </section>;
}

const durationGroups = [
  { label: "Cortas", values: [15, 30, 45] },
  { label: "Estándar", values: [60, 90, 120] },
  { label: "Largas", values: [135, 180, 240] },
];
function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60); const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

function AgendaCreateDialog({ createAt, professional, boxes, patients, convenios, sessionTypes, blockDuration, onClose, onCreated }: { createAt: CreateAt; professional: Professional; boxes: Box[]; patients: Patient[]; convenios: ConvenioOption[]; sessionTypes: SessionType[]; blockDuration: number; onClose: () => void; onCreated: () => Promise<void> }) {
  const dialogRef = useRef<HTMLDialogElement>(null); const titleRef = useRef<HTMLHeadingElement>(null); const patientDialogRef = useRef<HTMLDialogElement>(null);
  const defaultType = sessionTypes.find((item) => item.isDefault) ?? null;
  const initialDuration = defaultType?.durationMinutes ?? (durationGroups.flatMap((group) => group.values).includes(blockDuration) ? blockDuration : 30);
  const [patientName, setPatientName] = useState(""); const [patientId, setPatientId] = useState<string | null>(null); const [patientContact, setPatientContact] = useState<string | null>(null); const [localPatients, setLocalPatients] = useState(patients); const [patientFormKey, setPatientFormKey] = useState(0); const [boxId, setBoxId] = useState(""); const [sessionTypeId, setSessionTypeId] = useState(defaultType?.id ?? ""); const [duration, setDuration] = useState(initialDuration); const [notes, setNotes] = useState(""); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [isCreating, setIsCreating] = useState(false); const [isCreatingPatient, setIsCreatingPatient] = useState(false); const [patientError, setPatientError] = useState("");
  const startsAt = timeFromMinutes(createAt.startMinutes); const endsAt = timeFromMinutes(createAt.startMinutes + duration);
  const selectedBox = boxes.find((item) => item.id === boxId); const selectedType = sessionTypes.find((item) => item.id === sessionTypeId);
  const matches = useMemo(() => { const query = patientName.trim().toLocaleLowerCase("es-CL"); if (!query) return []; return localPatients.filter((patient) => `${patient.name} ${patient.email ?? ""}`.toLocaleLowerCase("es-CL").includes(query)).slice(0, 6); }, [patientName, localPatients]);

  useEffect(() => { const dialog = dialogRef.current; if (!dialog) return; if (!dialog.open) dialog.showModal(); requestAnimationFrame(() => titleRef.current?.focus()); }, []);
  function choosePatient(patient: Patient) { setPatientName(patient.name); setPatientId(patient.id); setPatientContact(patient.phone ?? patient.email); }
  function changePatientName(value: string) { setPatientName(value); setNotice(""); const exact = localPatients.find((patient) => patient.name.toLocaleLowerCase("es-CL") === value.trim().toLocaleLowerCase("es-CL")); if (exact) choosePatient(exact); else { setPatientId(null); setPatientContact(null); } }
  function changeSessionType(id: string) { setSessionTypeId(id); const type = sessionTypes.find((item) => item.id === id); if (type) setDuration(type.durationMinutes); }
  function openPatientDialog() { setPatientError(""); const dialog = patientDialogRef.current; if (dialog && !dialog.open) dialog.showModal(); }
  async function submitPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPatientError(""); setIsCreatingPatient(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await createPatientForAppointment(form);
      const created = { id: result.id, name: result.name, phone: String(form.get("phone") ?? "").trim() || null, email: String(form.get("email") ?? "").trim() || null };
      setLocalPatients((current) => [created, ...current]); choosePatient(created); setNotice("Paciente creado y seleccionado."); patientDialogRef.current?.close(); setPatientFormKey((current) => current + 1);
    } catch (cause) { setPatientError(message(cause, "No pudimos crear el paciente. Intenta nuevamente.")); }
    finally { setIsCreatingPatient(false); }
  }
  function close() { if (!isCreating) onClose(); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patientName.trim()) { setError("Ingresa o selecciona una persona paciente."); return; }
    setError(""); setIsCreating(true);
    try {
      const day = new Date(`${createAt.dateKey}T12:00:00.000Z`);
      await createAgendaAppointment({ professionalMembershipId: professional.id, boxId: boxId || null, sessionTypeId: sessionTypeId || null, patientId, patientName: patientName.trim(), patientContact, startsAtIso: santiagoLocalToUtc(day, startsAt).toISOString(), endsAtIso: santiagoLocalToUtc(day, endsAt).toISOString(), notes: notes.trim() || null });
      await onCreated();
    } catch (cause) { setError(message(cause, "No pudimos guardar la cita. Intenta nuevamente.")); }
    finally { setIsCreating(false); }
  }

  return <>
  <dialog className="agenda-appointment-dialog" ref={dialogRef} aria-labelledby="agenda-create-title" onCancel={(event) => { if (isCreating) event.preventDefault(); else close(); }} onClose={onClose}>
    <form className="agenda-appointment-form" onSubmit={submit}>
      <header className="agenda-appointment-dialog-header"><div><h2 id="agenda-create-title" ref={titleRef} tabIndex={-1}>Nueva cita</h2><p>{formatLongDate(createAt.dateKey)}</p></div><button className="icon-button" type="button" aria-label="Cerrar nueva cita" onClick={close} disabled={isCreating}><CloseIcon /></button></header>
      <div className="agenda-appointment-dialog-content agenda-dialog-body">
        <div className="agenda-dialog-fields">
          <div className="agenda-professional-summary"><span className="agenda-avatar" aria-hidden="true">{initials(professional.name)}</span><div><span>Profesional</span><strong>{professional.name}</strong></div></div>
          <div className="agenda-patient-control"><div className="agenda-patient-label-row"><label htmlFor="agenda-patient-input">Paciente</label><button className="agenda-create-patient-button" type="button" onClick={openPatientDialog} disabled={isCreating}><CreatePatientIcon />Crear paciente</button></div><div className="agenda-patient-field"><input id="agenda-patient-input" type="text" value={patientName} onChange={(event) => changePatientName(event.target.value)} autoComplete="off" placeholder="Busca por nombre o correo" aria-autocomplete="list" aria-controls="agenda-patient-results" disabled={isCreating} required />{matches.length && !patientId ? <ul className="agenda-patient-suggestions" id="agenda-patient-results" role="listbox">{matches.map((patient) => <li key={patient.id}><button type="button" onClick={() => choosePatient(patient)} disabled={isCreating}><strong>{patient.name}</strong><span>{patient.email ?? patient.phone ?? "Sin datos de contacto"}</span></button></li>)}</ul> : null}</div><small>Puedes seleccionar un paciente existente o crear una ficha nueva.</small></div>
          <label>Tipo de sesión<select className="agenda-session-type-select" value={sessionTypeId} onChange={(event) => changeSessionType(event.target.value)} disabled={isCreating}><option value="">Sin tipo específico</option>{sessionTypes.map((type) => <option value={type.id} key={type.id}>{type.name} · {type.durationMinutes} min</option>)}</select></label>
          <label>Sala / Box<select value={boxId} onChange={(event) => setBoxId(event.target.value)} disabled={isCreating}><option value="">Sin box</option>{boxes.map((box) => <option value={box.id} key={box.id}>{box.name} · Activo</option>)}</select><small className="agenda-box-state"><span/>Los boxes disponibles están activos</small></label>
          <label>Duración<select className="agenda-duration-select" value={duration} onChange={(event) => setDuration(Number(event.target.value))} disabled={isCreating}>{!durationGroups.flatMap((group) => group.values).includes(duration) ? <option value={duration}>{durationLabel(duration)} · Finaliza {timeFromMinutes(createAt.startMinutes + duration)}</option> : null}{durationGroups.map((group) => <optgroup label={group.label} key={group.label}>{group.values.map((minutes) => <option value={minutes} key={minutes}>{durationLabel(minutes)} · Finaliza {timeFromMinutes(createAt.startMinutes + minutes)}</option>)}</optgroup>)}</select></label>
          <label>Notas (opcional)<textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={isCreating} maxLength={2000} placeholder="Agrega información relevante para la cita" /></label>
        </div>
        <aside className="agenda-dialog-summary" aria-live="polite"><h3>Resumen de cita</h3><dl><div><dt>Paciente</dt><dd>{patientName.trim() || "Sin paciente"}</dd></div><div><dt>Horario</dt><dd>{startsAt} - {endsAt} · {durationLabel(duration)}</dd></div><div><dt>Profesional</dt><dd>{professional.name}</dd></div><div><dt>Sala / Box</dt><dd>{selectedBox?.name ?? "Sin box"}</dd></div><div><dt>Tipo de sesión</dt><dd>{selectedType?.name ?? "Sin tipo específico"}</dd></div></dl></aside>
        {notice ? <p className="agenda-dialog-notice agenda-dialog-error--wide" role="status">{notice}</p> : null}
        {error ? <p className="agenda-dialog-error agenda-dialog-error--wide" role="alert">{error}</p> : null}
      </div>
      <footer className="agenda-appointment-dialog-footer"><button className="button" type="button" onClick={close} disabled={isCreating}>Cancelar</button><button className="button button-primary" type="submit" disabled={isCreating}>{isCreating ? "Creando..." : "Crear cita"}</button></footer>
    </form>
  </dialog>
    <PatientCreateDialog key={patientFormKey} dialogRef={patientDialogRef} convenios={convenios} onSubmit={submitPatient} pending={isCreatingPatient} error={patientError} />
  </>;
}
