"use client";

import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { createMemberAbsence, deleteMemberAbsence, getMemberAbsences } from "@/app/(app)/settings/members/actions";
import type { AbsenceDuration, AbsenceType, MemberAbsence } from "@/features/members/absence-actions";

const TYPE_OPTIONS: ReadonlyArray<{ value: AbsenceType; label: string }> = [
  { value: "vacation", label: "Vacaciones" }, { value: "medical_leave", label: "Licencia médica" }, { value: "personal", label: "Personal" }, { value: "holiday", label: "Feriado" }, { value: "other", label: "Otro" },
];
const DAY_HEADERS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const dateFormatter = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const monthFormatter = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" });
const iso = (date: Date) => date.toISOString().slice(0, 10);
const parseDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

export function AbsencesDialog({ member, onClose }: { member: { id: string; name: string } | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId(); const descriptionId = useId();
  const [screen, setScreen] = useState<"list" | "form">("list");
  const [items, setItems] = useState<MemberAbsence[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); const [isBusy, setIsBusy] = useState(false); const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (member && !dialog.open) { dialog.showModal(); requestAnimationFrame(() => titleRef.current?.focus()); }
    if (!member && dialog.open) dialog.close();
  }, [member]);
  useEffect(() => {
    if (!member) return;
    let current = true; queueMicrotask(() => { if (current) { setScreen("list"); setItems([]); setError(null); setIsLoading(true); } });
    getMemberAbsences(member.id).then((rows) => { if (current) setItems(rows); }).catch((cause: unknown) => { if (current) setError(message(cause, "No se pudieron cargar las ausencias. Inténtalo nuevamente.")); }).finally(() => { if (current) { setLoadedFor(member.id); setIsLoading(false); } });
    return () => { current = false; };
  }, [member]);

  function close() { if (!isBusy) onClose(); }
  async function remove(id: string) {
    setIsBusy(true); setError(null);
    try { await deleteMemberAbsence(id); setItems((current) => current.filter((item) => item.id !== id)); }
    catch (cause) { setError(message(cause, "No se pudo eliminar la ausencia. Inténtalo nuevamente.")); }
    finally { setIsBusy(false); }
  }
  async function create(input: Parameters<typeof createMemberAbsence>[1]) {
    if (!member) return;
    setIsBusy(true); setError(null);
    try { const created = await createMemberAbsence(member.id, input); setItems((current) => [created, ...current]); setScreen("list"); }
    catch (cause) { setError(message(cause, "No se pudo crear la ausencia. Inténtalo nuevamente.")); }
    finally { setIsBusy(false); }
  }

  return <dialog className="absences-dialog" ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={(event) => { if (isBusy) event.preventDefault(); else close(); }} onClose={onClose}>
    <div className="absences-shell">
      <header className="absences-header">
        <span className="absences-header-icon" aria-hidden="true"><CalendarXIcon /></span>
        <div><h2 id={titleId} ref={titleRef} tabIndex={-1}>{screen === "list" ? `Ausencias de ${member?.name ?? ""}` : "Nueva Ausencia"}</h2><p id={descriptionId}>{screen === "list" ? "Gestiona las ausencias programadas" : `Registra una ausencia para ${member?.name ?? ""}`}</p></div>
        <button className="absences-close" type="button" aria-label="Cerrar ausencias" title="Cerrar" onClick={close} disabled={isBusy}><CloseIcon /></button>
      </header>
      {screen === "list" ? <AbsenceList items={items} loading={isLoading || Boolean(member && loadedFor !== member.id)} busy={isBusy} onRemove={remove} error={error} /> : <AbsenceForm busy={isBusy} error={error} onCancel={() => { setError(null); setScreen("list"); }} onSubmit={create} />}
      {screen === "list" && <footer className="absences-footer is-split"><button className="button button-primary" type="button" onClick={() => { setError(null); setScreen("form"); }} disabled={isLoading || isBusy}>+ Nueva Ausencia</button><button className="button" type="button" onClick={close} disabled={isBusy}>Cerrar</button></footer>}
    </div>
  </dialog>;
}

function AbsenceList({ items, loading, busy, onRemove, error }: { items: MemberAbsence[]; loading: boolean; busy: boolean; onRemove: (id: string) => void; error: string | null }) {
  return <div className="absences-content" aria-busy={loading}>{loading ? <div className="absences-loading" aria-label="Cargando ausencias"><span /><span /></div> : items.length ? <div className="absence-list">{items.map((item) => <article className="absence-card" key={item.id}><span className="absence-card-icon" aria-hidden="true"><CalendarIcon /></span><div><h3>{TYPE_OPTIONS.find((option) => option.value === item.absenceType)?.label}</h3><p>{formatRange(item.startsOn, item.endsOn)}</p><span>{item.duration === "full_day" ? "Día completo" : `${item.startsAt?.slice(0, 5)}–${item.endsAt?.slice(0, 5)}`}</span>{item.description && <p className="absence-description">{item.description}</p>}</div><button className="absence-delete" type="button" aria-label={`Eliminar ausencia: ${TYPE_OPTIONS.find((option) => option.value === item.absenceType)?.label}`} title="Eliminar ausencia" onClick={() => onRemove(item.id)} disabled={busy}><TrashIcon /></button></article>)}</div> : <div className="absences-empty"><span aria-hidden="true"><CalendarXIcon /></span><p>Este usuario no tiene ausencias registradas</p></div>}{error && <p className="absences-error" role="alert">{error}</p>}</div>;
}

function AbsenceForm({ busy, error: serverError, onCancel, onSubmit }: { busy: boolean; error: string | null; onCancel: () => void; onSubmit: (input: Parameters<typeof createMemberAbsence>[1]) => Promise<void> }) {
  const now = new Date(); const [month, setMonth] = useState(() => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const [start, setStart] = useState<string | null>(null); const [end, setEnd] = useState<string | null>(null);
  const [type, setType] = useState<AbsenceType>("vacation"); const [duration, setDuration] = useState<AbsenceDuration>("full_day");
  const [startsAt, setStartsAt] = useState(""); const [endsAt, setEndsAt] = useState(""); const [description, setDescription] = useState(""); const [error, setError] = useState<string | null>(null);
  const days = useMemo(() => calendarDays(month), [month]);
  const selectedEnd = start ? (duration === "specific_hours" ? start : (end ?? start)) : null;
  const selectedDayCount = start && selectedEnd ? differenceInCalendarDays(start, selectedEnd) + 1 : null;
  function choose(day: string) { if (!start || end) { setStart(day); setEnd(null); } else if (day < start) { setStart(day); setEnd(start); } else setEnd(day); setError(null); }
  function changeDuration(value: AbsenceDuration) { setDuration(value); if (value === "specific_hours" && start) setEnd(start); }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!start) { setError("Selecciona el rango de fechas en el calendario."); return; }
    const finalEnd = end ?? start;
    if (duration === "specific_hours" && (!startsAt || !endsAt || startsAt >= endsAt)) { setError("La hora de fin debe ser posterior a la hora de inicio."); return; }
    setError(null); void onSubmit({ absenceType: type, startsOn: start, endsOn: duration === "specific_hours" ? start : finalEnd, duration, startsAt: duration === "specific_hours" ? startsAt : null, endsAt: duration === "specific_hours" ? endsAt : null, description });
  }
  return <form className="absence-form" onSubmit={submit}>
    <div className="absence-form-content"><section className="absence-calendar" aria-label="Seleccionar fechas"><h3>Seleccionar fechas</h3><div className="calendar-nav"><button type="button" aria-label="Mes anterior" onClick={() => setMonth(addMonths(month, -1))}>‹</button><strong>{capitalize(monthFormatter.format(month))}</strong><button type="button" aria-label="Mes siguiente" onClick={() => setMonth(addMonths(month, 1))}>›</button></div><div className="calendar-grid">{DAY_HEADERS.map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}{days.map((day) => { const value = iso(day); const selected = Boolean(start && value >= start && value <= (end ?? start)); return <button className={`${day.getUTCMonth() !== month.getUTCMonth() ? "is-outside " : ""}${selected ? "is-selected" : ""}`} type="button" key={value} aria-pressed={selected} onClick={() => choose(value)}>{day.getUTCDate()}</button>; })}</div></section>
      <div className="absence-fields"><label>Tipo de ausencia<select value={type} onChange={(event) => setType(event.target.value as AbsenceType)}>{TYPE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><fieldset><legend>Duración de la ausencia</legend><div className="absence-radios"><label className={duration === "full_day" ? "is-selected" : undefined}><input type="radio" name="duration" checked={duration === "full_day"} onChange={() => changeDuration("full_day")} />Día completo</label><label className={duration === "specific_hours" ? "is-selected" : undefined}><input type="radio" name="duration" checked={duration === "specific_hours"} onChange={() => changeDuration("specific_hours")} />Horario específico</label></div></fieldset>{duration === "specific_hours" && <div className="absence-times"><label>Hora inicio<input type="time" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /></label><label>Hora fin<input type="time" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required /></label></div>}<label>Descripción (opcional)<textarea placeholder="Agrega detalles adicionales sobre la ausencia..." value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} /></label>{(error || serverError) && <p className="absences-error" role="alert">{error ?? serverError}</p>}</div>
      <div className="absence-period"><CalendarIcon /><div><strong>Período seleccionado</strong><p>{start && selectedEnd && selectedDayCount ? <>{formatRange(start, selectedEnd)} · {selectedDayCount} {selectedDayCount === 1 ? "día" : "días"} de ausencia{duration === "specific_hours" && <> · {startsAt && endsAt ? `desde las ${startsAt} hasta las ${endsAt}` : "Define la hora de inicio y la hora de fin"}</>}</> : "Selecciona el rango de fechas en el calendario"}</p></div></div></div>
    <footer className="absences-footer"><button className="button" type="button" onClick={onCancel} disabled={busy}>Cancelar</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Creando…" : "Crear Ausencia"}</button></footer>
  </form>;
}

function calendarDays(month: Date): Date[] { const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1)); const offset = (first.getUTCDay() + 6) % 7; const start = new Date(first); start.setUTCDate(1 - offset); return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setUTCDate(start.getUTCDate() + index); return date; }); }
function addMonths(date: Date, amount: number) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1)); }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function formatRange(start: string, end: string) { const first = dateFormatter.format(parseDate(start)); return start === end ? first : `${first} – ${dateFormatter.format(parseDate(end))}`; }
function differenceInCalendarDays(start: string, end: string) { return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86_400_000); }
function message(cause: unknown, fallback: string) { return cause instanceof Error ? cause.message : fallback; }
function CalendarIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg>; }
function CalendarXIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M15.5 14.5l4 4M19.5 14.5l-4 4"/></svg>; }
function CloseIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>; }
function TrashIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>; }
