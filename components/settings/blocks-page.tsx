"use client";

import { FormEvent, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAgendaBlock,
  deleteAgendaBlock,
  type AgendaBlock,
  type AgendaBlockInput,
  type AgendaBlockReason,
  type AgendaBlockScope,
} from "@/app/(app)/settings/bloqueos/actions";

const agendaBlockReasons: AgendaBlockReason[] = ["meeting", "training", "procedure", "permission", "holiday", "maintenance", "other"];

const REASON_LABELS: Record<AgendaBlockReason, string> = {
  meeting: "Reunión",
  training: "Capacitación",
  procedure: "Procedimiento",
  permission: "Permiso",
  holiday: "Feriado",
  maintenance: "Mantención",
  other: "Otro",
};
const DAY_HEADERS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const dateFormatter = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const monthFormatter = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" });
const iso = (date: Date) => date.toISOString().slice(0, 10);
const parseDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

export function BlocksPage({ initialBlocks, boxes }: { initialBlocks: AgendaBlock[]; boxes: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  function openDialog() {
    setNotice(null);
    dialogRef.current?.showModal();
  }

  async function remove(block: AgendaBlock) {
    setBusyId(block.id);
    setListError(null);
    try {
      await deleteAgendaBlock(block.id);
      setBlocks((current) => current.filter((item) => item.id !== block.id));
      setNotice("Bloqueo eliminado.");
      router.refresh();
    } catch (cause) {
      setListError(message(cause, "No se pudo eliminar el bloqueo. Inténtalo nuevamente."));
    } finally {
      setBusyId(null);
    }
  }

  function created(block: AgendaBlock) {
    const boxName = block.boxId ? boxes.find((box) => box.id === block.boxId)?.name ?? null : null;
    setBlocks((current) => [{ ...block, boxName }, ...current]);
    setNotice("Bloqueo creado correctamente.");
    router.refresh();
  }

  return <main className="blocks-page">
    <header className="blocks-header">
      <div><h1>Bloqueos de agenda</h1><p className="muted">Suspende fechas u horarios puntuales de toda la clínica o de un box, sin cambiar la disponibilidad general</p></div>
      <button className="button button-primary" type="button" onClick={openDialog}>+ Nuevo bloqueo</button>
    </header>
    {notice && <p className="inline-notice notice-banner" role="status">{notice}</p>}
    {listError && <p className="blocks-error" role="alert">{listError}</p>}
    {blocks.length ? <section className="blocks-list" aria-label="Bloqueos registrados">
      {blocks.map((block) => <article className="block-card" key={block.id}>
        <span className="block-card-icon" aria-hidden="true"><ProhibitionIcon /></span>
        <div className="block-card-copy">
          <h2>{REASON_LABELS[block.reason]}</h2>
          <p>{formatRange(block.startsOn, block.endsOn)}</p>
          <span>{block.scope === "clinic" ? "Toda la clínica" : block.boxName ?? "Box"} · {block.allDay ? "Día completo" : `${block.startsAt?.slice(0, 5)} a ${block.endsAt?.slice(0, 5)}`}</span>
          {block.description && <p className="block-description">{block.description}</p>}
        </div>
        <button className="block-delete" type="button" aria-label={`Eliminar bloqueo: ${REASON_LABELS[block.reason]}`} title="Eliminar bloqueo" onClick={() => void remove(block)} disabled={busyId === block.id}><TrashIcon /></button>
      </article>)}
    </section> : <section className="blocks-empty">
      <span aria-hidden="true"><ProhibitionIcon /></span>
      <div><h2>No hay bloqueos registrados</h2><p>Crea un bloqueo para suspender la agenda en una fecha u horario específico</p></div>
      <button className="button button-primary" type="button" onClick={openDialog}>+ Nuevo bloqueo</button>
    </section>}
    <BlockDialog dialogRef={dialogRef} boxes={boxes} onCreated={created} />
  </main>;
}

function BlockDialog({ dialogRef, boxes, onCreated }: { dialogRef: React.RefObject<HTMLDialogElement | null>; boxes: Array<{ id: string; name: string }>; onCreated: (block: AgendaBlock) => void }) {
  const titleId = useId();
  const descriptionId = useId();
  const now = new Date();
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false);

  function close() {
    if (!busy) dialogRef.current?.close();
  }

  return <dialog className="block-dialog" ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={(event) => { if (busy) event.preventDefault(); }}>
    <div className="block-dialog-shell">
      <header className="block-dialog-header">
        <span className="block-dialog-icon" aria-hidden="true"><ProhibitionIcon /></span>
        <div><h2 id={titleId}>Nuevo bloqueo</h2><p id={descriptionId}>Suspende la agenda en una fecha u horario puntual sin cambiar la disponibilidad general</p></div>
        <button className="block-dialog-close" type="button" aria-label="Cerrar nuevo bloqueo" title="Cerrar" onClick={close} disabled={busy}><CloseIcon /></button>
      </header>
      <BlockForm key={`${formKey}-${now.toISOString().slice(0, 10)}`} boxes={boxes} busy={busy} onCancel={close} onSubmit={async (input) => {
        setBusy(true);
        try {
          const block = await createAgendaBlock(input);
          onCreated(block);
          setFormKey((current) => current + 1);
          dialogRef.current?.close();
        } finally {
          setBusy(false);
        }
      }} />
    </div>
  </dialog>;
}

function BlockForm({ boxes, busy, onCancel, onSubmit }: { boxes: Array<{ id: string; name: string }>; busy: boolean; onCancel: () => void; onSubmit: (input: AgendaBlockInput) => Promise<void> }) {
  const now = new Date();
  const [month, setMonth] = useState(() => new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)));
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [scope, setScope] = useState<AgendaBlockScope>("clinic");
  const [boxId, setBoxId] = useState("");
  const [reason, setReason] = useState<AgendaBlockReason>("meeting");
  const [allDay, setAllDay] = useState(true);
  const [startsAt, setStartsAt] = useState("10:00");
  const [endsAt, setEndsAt] = useState("20:00");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const days = useMemo(() => calendarDays(month), [month]);
  const selectedEnd = start ? end ?? start : null;
  const selectedDayCount = start && selectedEnd ? differenceInCalendarDays(start, selectedEnd) + 1 : null;

  function choose(day: string) {
    if (!start || end) { setStart(day); setEnd(null); }
    else if (day < start) { setStart(day); setEnd(start); }
    else setEnd(day);
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!start) { setError("Selecciona el rango de fechas en el calendario."); return; }
    if (scope === "box" && !boxId) { setError("Selecciona el box que se bloqueará."); return; }
    if (!allDay && (!startsAt || !endsAt || startsAt >= endsAt)) { setError("La hora de fin debe ser posterior a la hora de inicio."); return; }
    setError(null);
    try {
      await onSubmit({ scope, boxId: scope === "box" ? boxId : null, reason, startsOn: start, endsOn: end ?? start, allDay, startsAt: allDay ? null : startsAt, endsAt: allDay ? null : endsAt, description });
    } catch (cause) {
      setError(message(cause, "No se pudo crear el bloqueo. Inténtalo nuevamente."));
    }
  }

  return <form className="block-form" onSubmit={(event) => void submit(event)}>
    <div className="block-form-content">
      <section className="block-calendar" aria-label="Seleccionar fechas">
        <h3>Seleccionar fechas</h3>
        <div className="calendar-nav"><button type="button" aria-label="Mes anterior" onClick={() => setMonth(addMonths(month, -1))}>‹</button><strong>{capitalize(monthFormatter.format(month))}</strong><button type="button" aria-label="Mes siguiente" onClick={() => setMonth(addMonths(month, 1))}>›</button></div>
        <div className="calendar-grid">{DAY_HEADERS.map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}{days.map((day) => { const value = iso(day); const selected = Boolean(start && value >= start && value <= (end ?? start)); return <button className={`${day.getUTCMonth() !== month.getUTCMonth() ? "is-outside " : ""}${selected ? "is-selected" : ""}`} type="button" key={value} aria-pressed={selected} onClick={() => choose(value)}>{day.getUTCDate()}</button>; })}</div>
      </section>
      <div className="block-fields">
        <fieldset><legend>Qué se bloquea</legend><div className="block-radios"><label className={scope === "clinic" ? "is-selected" : undefined}><input type="radio" name="scope" checked={scope === "clinic"} onChange={() => setScope("clinic")} />Toda la clínica</label><label className={scope === "box" ? "is-selected" : undefined}><input type="radio" name="scope" checked={scope === "box"} onChange={() => setScope("box")} />Un box</label></div></fieldset>
        {scope === "box" && <label className="block-box-select">Selecciona un box<select value={boxId} onChange={(event) => setBoxId(event.target.value)} required><option value="">Selecciona un box</option>{boxes.map((box) => <option value={box.id} key={box.id}>{box.name}</option>)}</select>{!boxes.length && <span>No hay boxes activos disponibles.</span>}</label>}
        <label className="block-reason-select">Motivo<select value={reason} onChange={(event) => setReason(event.target.value as AgendaBlockReason)}>{agendaBlockReasons.map((value) => <option value={value} key={value}>{REASON_LABELS[value]}</option>)}</select></label>
        <fieldset><legend>Duración del bloqueo</legend><div className="block-radios"><label className={allDay ? "is-selected" : undefined}><input type="radio" name="duration" checked={allDay} onChange={() => setAllDay(true)} />Día completo</label><label className={!allDay ? "is-selected" : undefined}><input type="radio" name="duration" checked={!allDay} onChange={() => setAllDay(false)} />Horario específico</label></div></fieldset>
        {!allDay && <div className="block-times"><label>Hora inicio<input type="time" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /></label><label>Hora fin<input type="time" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required /></label></div>}
        <label>Descripción (opcional)<textarea placeholder="Agrega detalles adicionales sobre el bloqueo..." value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} /></label>
        {error && <p className="blocks-error" role="alert">{error}</p>}
      </div>
      <div className="block-period"><CalendarIcon /><div><strong>Período seleccionado</strong><p>{start && selectedEnd && selectedDayCount ? <>{formatRange(start, selectedEnd)} · {selectedDayCount} {selectedDayCount === 1 ? "día" : "días"} de bloqueo{!allDay && <> · desde las {startsAt} hasta las {endsAt}</>}</> : "Selecciona el rango de fechas en el calendario"}</p></div></div>
    </div>
    <footer className="block-dialog-footer"><button className="button" type="button" onClick={onCancel} disabled={busy}>Cancelar</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Creando..." : "Crear bloqueo"}</button></footer>
  </form>;
}

function calendarDays(month: Date): Date[] { const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1)); const offset = (first.getUTCDay() + 6) % 7; const start = new Date(first); start.setUTCDate(1 - offset); return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setUTCDate(start.getUTCDate() + index); return date; }); }
function addMonths(date: Date, amount: number) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1)); }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function formatRange(start: string, end: string) { const first = dateFormatter.format(parseDate(start)); return start === end ? first : `${first} a ${dateFormatter.format(parseDate(end))}`; }
function differenceInCalendarDays(start: string, end: string) { return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86_400_000); }
function message(cause: unknown, fallback: string) { return cause instanceof Error ? cause.message : fallback; }
function ProhibitionIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>; }
function CalendarIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg>; }
function CloseIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>; }
function TrashIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>; }
