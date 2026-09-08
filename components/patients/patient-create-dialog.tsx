"use client";

import {
  useId,
  useState,
  type FormEventHandler,
  type RefObject,
} from "react";
import { COUNTRY_OPTIONS } from "@/app/onboarding/regions";
import type { ConvenioOption } from "@/app/(app)/patients/actions";
import { PhoneField } from "@/components/forms/phone-field";
import { RutField } from "@/components/forms/rut-field";

type PatientCreateDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  convenios: ConvenioOption[];
  action?: (formData: FormData) => void | Promise<void>;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  pending?: boolean;
  error?: string;
};

export function PatientCreateDialog({
  dialogRef,
  convenios,
  action,
  onSubmit,
  pending = false,
  error,
}: PatientCreateDialogProps) {
  const [tab, setTab] = useState<"personal" | "dental">("personal");
  const id = useId();
  const titleId = `${id}-title`;
  const personalTabId = `${id}-personal-tab`;
  const personalPanelId = `${id}-personal-panel`;
  const dentalTabId = `${id}-dental-tab`;
  const dentalPanelId = `${id}-dental-panel`;
  const regions = COUNTRY_OPTIONS[0].regions;

  function close() {
    if (!pending) dialogRef.current?.close();
  }

  return (
    <dialog
      className="patient-dialog"
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form action={action} onSubmit={onSubmit} className="patient-form">
        <header className="drawer-heading">
          <div>
            <h2 id={titleId} tabIndex={-1}>Nuevo paciente</h2>
            <p>Completa la información de la ficha.</p>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Cerrar alta de paciente"
            title="Cerrar"
            onClick={close}
            disabled={pending}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="drawer-tabs" role="tablist" aria-label="Secciones de la ficha">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "personal"}
            aria-controls={personalPanelId}
            id={personalTabId}
            onClick={() => setTab("personal")}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
            Información personal
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "dental"}
            aria-controls={dentalPanelId}
            id={dentalTabId}
            onClick={() => setTab("dental")}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M8 3c-3 0-5 2-5 5 0 2 1 4 2 6l2 6c.3 1 1.5 1 2 0l1-4c.5-2 3.5-2 4 0l1 4c.5 1 1.7 1 2 0l2-6c1-2 2-4 2-6 0-3-2-5-5-5-2 0-3 1-4 1S10 3 8 3Z" />
            </svg>
            Información odontológica
          </button>
        </div>
        <div className="drawer-body">
          <section id={personalPanelId} role="tabpanel" aria-labelledby={personalTabId} hidden={tab !== "personal"}>
            <div className="form-row">
              <label>Nombres<input name="firstName" autoComplete="given-name" required disabled={pending} /></label>
              <label>Apellidos<input name="lastName" autoComplete="family-name" required disabled={pending} /></label>
            </div>
            <div className="form-row">
              <RutField name="rut" disabled={pending} />
              <label>Sexo<select name="sex" defaultValue="" disabled={pending}><option value="">Selecciona una opción</option><option value="female">Femenino</option><option value="male">Masculino</option><option value="other">Otro</option><option value="unspecified">Prefiere no indicar</option></select></label>
            </div>
            <div className="form-row">
              <label>Fecha de nacimiento<input type="date" name="birthDate" max={new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date())} disabled={pending} /></label>
              <label>Correo electrónico<input name="email" type="email" autoComplete="email" disabled={pending} /></label>
            </div>
            <div className="form-row">
              <PhoneField name="phone" label="Teléfono principal" autoComplete="tel" disabled={pending} />
              <PhoneField name="phoneSecondary" label="Teléfono secundario" autoComplete="tel" disabled={pending} />
            </div>
            <label className="field-full">Ciudad<select name="city" defaultValue="" disabled={pending}><option value="" disabled>Selecciona una ciudad…</option>{regions.map((region) => <optgroup key={region.id} label={region.label}>{region.cities.map((city) => <option key={city} value={city}>{city}</option>)}</optgroup>)}</select></label>
            <label className="field-full">Dirección<input name="address" autoComplete="street-address" disabled={pending} /></label>
          </section>
          <section id={dentalPanelId} role="tabpanel" aria-labelledby={dentalTabId} hidden={tab !== "dental"}>
            <label>Convenio<select name="convenioId" defaultValue="" disabled={pending}><option value="">Sin convenio</option>{convenios.map((convenio) => <option key={convenio.id} value={convenio.id}>{convenio.name}</option>)}</select><small className="muted">Selecciona el convenio si el paciente pertenece a uno (FONASA, isapre, empresa).</small></label>
            <label className="field-full">Observaciones generales<textarea name="observations" rows={6} maxLength={2000} placeholder="Alergias, antecedentes y cualquier observación de la ficha." disabled={pending} /></label>
          </section>
          {error ? <p className="agenda-dialog-error field-full" role="alert">{error}</p> : null}
        </div>
        <footer className="drawer-footer">
          <label className="consent-field"><input name="consentGranted" type="checkbox" required disabled={pending} /> El paciente autoriza el registro de sus datos.</label>
          <div className="drawer-actions">
            <button type="button" className="button" onClick={close} disabled={pending}>Cancelar</button>
            <button type="submit" className="button button-primary" disabled={pending}>{pending ? "Creando..." : "Crear paciente"}</button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
