"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { getProfessionalAvailability, saveProfessionalAvailability } from "@/app/(app)/settings/members/actions";
import { weekdays, type Weekday } from "@/features/scheduling/domain";

type Period = { id: string; startsAt: string; endsAt: string };
type DayState = { weekday: Weekday; periods: Period[] };

const DAY_DETAILS: Record<Weekday, { name: string; initial: string }> = {
  mon: { name: "Lunes", initial: "L" },
  tue: { name: "Martes", initial: "M" },
  wed: { name: "Miércoles", initial: "X" },
  thu: { name: "Jueves", initial: "J" },
  fri: { name: "Viernes", initial: "V" },
  sat: { name: "Sábado", initial: "S" },
  sun: { name: "Domingo", initial: "D" },
};

function emptyDays(): DayState[] {
  return weekdays.map((weekday) => ({ weekday, periods: [] }));
}

function newPeriod(): Period {
  return { id: crypto.randomUUID(), startsAt: "09:00", endsAt: "18:00" };
}

export function ScheduleDialog({ member, onClose, onSaved }: {
  member: { id: string; name: string } | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [days, setDays] = useState<DayState[]>(emptyDays);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!member) {
      if (dialog.open) dialog.close();
      return;
    }

    let current = true;
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => titleRef.current?.focus());
    Promise.resolve()
      .then(() => {
        if (!current) return null;
        setDays(emptyDays());
        setError(null);
        setIsLoading(true);
        return getProfessionalAvailability(member.id);
      })
      .then((availability) => {
        if (!availability) return;
        if (!current) return;
        setDays(availability.map((day) => ({
          weekday: day.weekday,
          periods: day.periods.map((period) => ({ ...period, id: crypto.randomUUID() })),
        })));
      })
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los horarios. Inténtalo nuevamente.");
      })
      .finally(() => { if (current) setIsLoading(false); });
    return () => { current = false; };
  }, [member]);

  function close() {
    if (!isSaving) onClose();
  }

  function toggleDay(weekday: Weekday) {
    setDays((current) => current.map((day) => day.weekday === weekday
      ? { ...day, periods: day.periods.length ? [] : [newPeriod()] }
      : day));
  }

  function updatePeriod(weekday: Weekday, periodId: string, field: "startsAt" | "endsAt", value: string) {
    setDays((current) => current.map((day) => day.weekday === weekday
      ? { ...day, periods: day.periods.map((period) => period.id === periodId ? { ...period, [field]: value } : period) }
      : day));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!member) return;
    for (const day of days) {
      for (const period of day.periods) {
        if (!period.startsAt || !period.endsAt || period.startsAt >= period.endsAt) {
          setError(`Revisa ${DAY_DETAILS[day.weekday].name}: la hora de fin debe ser posterior a la hora de inicio.`);
          return;
        }
      }
    }
    setError(null);
    setIsSaving(true);
    try {
      await saveProfessionalAvailability(member.id, days.map((day) => ({
        weekday: day.weekday,
        periods: day.periods.map(({ startsAt, endsAt }) => ({ startsAt, endsAt })),
      })));
      onSaved(`Los horarios de ${member.name} se guardaron correctamente.`);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar los horarios. Inténtalo nuevamente.");
    } finally {
      setIsSaving(false);
    }
  }

  return <dialog
    className="schedule-dialog"
    ref={dialogRef}
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    aria-describedby={descriptionId}
    onCancel={(event) => { if (isSaving) event.preventDefault(); else close(); }}
    onClose={onClose}
  >
    <form className="schedule-dialog-form" onSubmit={submit}>
      <header className="schedule-dialog-header">
        <div>
          <h2 id={titleId} ref={titleRef} tabIndex={-1}>Configurar Horarios de Trabajo</h2>
          <p id={descriptionId}>Define los horarios de trabajo para {member?.name}.</p>
        </div>
        <button className="icon-button" type="button" aria-label="Cerrar configuración de horarios" title="Cerrar" onClick={close} disabled={isSaving}><CloseIcon /></button>
      </header>

      <div className="schedule-dialog-content" aria-busy={isLoading}>
        {isLoading ? <ScheduleSkeleton /> : days.map((day) => {
          const details = DAY_DETAILS[day.weekday];
          const active = day.periods.length > 0;
          return <section className={active ? "schedule-day-card is-active" : "schedule-day-card"} key={day.weekday}>
            <header className="schedule-day-header">
              <span className="schedule-day-badge" aria-hidden="true">{details.initial}</span>
              <div><h3>{details.name}</h3><p>{day.periods.length} {day.periods.length === 1 ? "horario configurado" : "horarios configurados"}</p></div>
              <button className={active ? "schedule-toggle is-on" : "schedule-toggle"} type="button" role="switch" aria-checked={active} aria-label={`${active ? "Desactivar" : "Activar"} ${details.name}`} onClick={() => toggleDay(day.weekday)} disabled={isSaving}><span /></button>
            </header>
            {active && <div className="schedule-periods">
              {day.periods.map((period, index) => <fieldset className="schedule-period" key={period.id}>
                <legend><ClockIcon />Horario {index + 1}</legend>
                <button className="schedule-remove" type="button" aria-label={`Quitar horario ${index + 1} de ${details.name}`} title="Quitar horario" onClick={() => setDays((current) => current.map((item) => item.weekday === day.weekday ? { ...item, periods: item.periods.filter((candidate) => candidate.id !== period.id) } : item))} disabled={isSaving}><CloseIcon /></button>
                <label>Hora de inicio<input type="time" value={period.startsAt} onChange={(event) => updatePeriod(day.weekday, period.id, "startsAt", event.target.value)} disabled={isSaving} required /></label>
                <label>Hora de fin<input type="time" value={period.endsAt} onChange={(event) => updatePeriod(day.weekday, period.id, "endsAt", event.target.value)} disabled={isSaving} required /></label>
              </fieldset>)}
              <button className="schedule-add-period" type="button" onClick={() => setDays((current) => current.map((item) => item.weekday === day.weekday ? { ...item, periods: [...item.periods, newPeriod()] } : item))} disabled={isSaving}>+ Agregar Horario</button>
            </div>}
          </section>;
        })}
        {error && <p className="schedule-dialog-error" role="alert">{error}</p>}
      </div>

      <footer className="schedule-dialog-footer">
        <button className="button" type="button" onClick={close} disabled={isSaving}>Cancelar</button>
        <button className="button button-primary" type="submit" disabled={isLoading || isSaving}>{isSaving ? "Guardando…" : "Guardar Horarios"}</button>
      </footer>
    </form>
  </dialog>;
}

function ScheduleSkeleton() {
  return <div className="schedule-skeleton" aria-label="Cargando horarios"><span /><span /><span /></div>;
}

function ClockIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>; }
function CloseIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>; }
