"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { createSessionType, toggleSessionType, updateSessionType } from "./actions";

export type SessionTypeItem = {
  id: string;
  name: string;
  durationMinutes: number;
  description: string;
  active: boolean;
};

type Editor = SessionTypeItem | "new" | null;
const durationOptions = [15, 30, 45, 60];

function errorMessage(cause: unknown): string {
  return cause instanceof Error && cause.message
    ? cause.message
    : "No pudimos guardar los cambios. Intenta nuevamente.";
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Zm10.5-13.3 2.8 2.8" /></svg>;
}

export function SessionTypesManager({ items }: { items: SessionTypeItem[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [hideDisabled, setHideDisabled] = useState(true);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const visibleItems = hideDisabled ? items.filter((item) => item.active) : items;

  function open(item: SessionTypeItem | "new") {
    setEditor(item);
    setError("");
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  function close() {
    if (!pending) {
      dialogRef.current?.close();
      setEditor(null);
    }
  }

  function run(action: (data: FormData) => Promise<void>, data: FormData, closeAfter = false) {
    setError("");
    startTransition(async () => {
      try {
        await action(data);
        if (closeAfter) {
          dialogRef.current?.close();
          setEditor(null);
        }
      } catch (cause) {
        setError(errorMessage(cause));
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(editor === "new" ? createSessionType : updateSessionType, data, true);
  }

  return <>
    <section className="settings-card session-types-card">
      <header className="session-types-heading">
        <div>
          <h1>Tipos de sesión</h1>
          <p className="muted">Gestiona los tipos de sesión disponibles en tu clínica</p>
        </div>
        <button className="button button-primary session-types-add" type="button" onClick={() => open("new")}>
          <span aria-hidden="true">+</span>
          Añadir tipo
        </button>
      </header>

      <div className="session-types-toolbar">
        <label className="session-types-filter">
          <input type="checkbox" checked={hideDisabled} onChange={(event) => setHideDisabled(event.target.checked)} />
          <span>Ocultar deshabilitados</span>
        </label>
      </div>

      {error && !editor ? <p className="agenda-dialog-error" role="alert">{error}</p> : null}

      {visibleItems.length ? (
        <div className="session-types-table-wrap">
          <table className="session-types-table">
            <thead><tr><th>Nombre</th><th>Duración</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id} className={item.active ? "" : "is-disabled"}>
                  <td><strong>{item.name}</strong></td>
                  <td className="session-type-duration">{item.durationMinutes} min</td>
                  <td>
                    <div className="session-type-actions">
                      <button className="session-type-edit" type="button" onClick={() => open(item)} disabled={pending}>
                        <EditIcon />
                        <span>Editar</span>
                      </button>
                      <form action={(data) => run(toggleSessionType, data)}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="active" value={String(!item.active)} />
                        <button className={`perm-switch ${item.active ? "is-on" : ""}`} type="submit" role="switch" aria-checked={item.active} aria-label={item.active ? `Desactivar ${item.name}` : `Activar ${item.name}`} disabled={pending}>
                          <span aria-hidden="true" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : items.length ? (
        <div className="session-types-empty">
          <strong>No hay tipos visibles</strong>
          <p>Desmarca “Ocultar deshabilitados” para ver y reactivar tus tipos de sesión.</p>
          <button className="button" type="button" onClick={() => setHideDisabled(false)}>Mostrar deshabilitados</button>
        </div>
      ) : (
        <div className="session-types-empty">
          <strong>Aún no tienes tipos de sesión</strong>
          <p>Crea el primero para agilizar la programación de tus citas.</p>
          <button className="button button-primary" type="button" onClick={() => open("new")}>Crear primer tipo</button>
        </div>
      )}
    </section>

    <dialog ref={dialogRef} className="session-type-dialog" aria-labelledby="session-type-dialog-title" onCancel={(event) => { if (pending) event.preventDefault(); }} onClose={() => setEditor(null)}>
      {editor ? (
        <form onSubmit={submit}>
          <header>
            <div>
              <h2 id="session-type-dialog-title">{editor === "new" ? "Agregar tipo de sesión" : "Editar tipo de sesión"}</h2>
              <p className="muted">Completa la información del tipo de sesión.</p>
            </div>
            <button type="button" className="icon-button" aria-label="Cerrar" onClick={close} disabled={pending}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </header>
          <div className="session-type-dialog-body">
            {editor !== "new" && <input type="hidden" name="id" value={editor.id} />}
            <label>Nombre<input name="name" defaultValue={editor === "new" ? "" : editor.name} minLength={2} maxLength={120} required disabled={pending} /></label>
            <label>Duración<select name="durationMinutes" defaultValue={editor === "new" ? 30 : editor.durationMinutes} required disabled={pending}>{durationOptions.map((minutes) => <option value={minutes} key={minutes}>{minutes} minutos</option>)}</select></label>
            <label>
              <span>Descripción <span className="session-type-optional">(opcional)</span></span>
              <textarea name="description" defaultValue={editor === "new" ? "" : editor.description} maxLength={150} rows={4} disabled={pending} />
              <small>Se mostrará en la página de reservas en línea (máx. 150 caracteres)</small>
            </label>
            {error ? <p className="agenda-dialog-error" role="alert">{error}</p> : null}
          </div>
          <footer>
            <button className="button" type="button" onClick={close} disabled={pending}>Cancelar</button>
            <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Guardando..." : editor === "new" ? "Crear tipo" : "Guardar cambios"}</button>
          </footer>
        </form>
      ) : null}
    </dialog>
  </>;
}
