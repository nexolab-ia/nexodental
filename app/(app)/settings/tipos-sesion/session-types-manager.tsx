"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { createSessionType, setDefaultSessionType, toggleSessionType, updateSessionType } from "./actions";

export type SessionTypeItem = { id: string; name: string; durationMinutes: number; isDefault: boolean; active: boolean };
type Editor = SessionTypeItem | "new" | null;

function errorMessage(cause: unknown): string { return cause instanceof Error && cause.message ? cause.message : "No pudimos guardar los cambios. Intenta nuevamente."; }

export function SessionTypesManager({ items }: { items: SessionTypeItem[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null); const [editor, setEditor] = useState<Editor>(null); const [error, setError] = useState(""); const [pending, startTransition] = useTransition();
  function open(item: SessionTypeItem | "new") { setEditor(item); setError(""); requestAnimationFrame(() => dialogRef.current?.showModal()); }
  function close() { if (!pending) { dialogRef.current?.close(); setEditor(null); } }
  function run(action: (data: FormData) => Promise<void>, data: FormData, closeAfter = false) { setError(""); startTransition(async () => { try { await action(data); if (closeAfter) { dialogRef.current?.close(); setEditor(null); } } catch (cause) { setError(errorMessage(cause)); } }); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); run(editor === "new" ? createSessionType : updateSessionType, data, true); }

  return <>
    <section className="settings-card session-types-card">
      <header className="session-types-heading"><div><h2>Tipos de sesión</h2><p className="muted">Configura nombres y duraciones para agilizar la creación de citas.</p></div><button className="button button-primary" type="button" onClick={() => open("new")}>Añadir tipo</button></header>
      {error && !editor ? <p className="agenda-dialog-error" role="alert">{error}</p> : null}
      {items.length ? <div className="session-types-table-wrap"><table className="session-types-table"><thead><tr><th>Nombre</th><th>Duración</th><th>Predeterminado</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.durationMinutes} min</td><td>{item.isDefault ? <span className="session-type-default">Predeterminado</span> : item.active ? <form action={(data) => run(setDefaultSessionType, data)}><input type="hidden" name="id" value={item.id}/><button className="session-type-text-action" disabled={pending}>Marcar como predeterminado</button></form> : <span className="muted">No disponible</span>}</td><td><span className={`session-type-status ${item.active ? "is-active" : ""}`}>{item.active ? "Activo" : "Inactivo"}</span></td><td><div className="session-type-actions"><button className="button" type="button" onClick={() => open(item)} disabled={pending}>Editar</button><form action={(data) => run(toggleSessionType, data)}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="active" value={String(!item.active)}/><button className="button" disabled={pending}>{item.active ? "Desactivar" : "Activar"}</button></form></div></td></tr>)}</tbody></table></div> : <div className="session-types-empty"><strong>Aún no tienes tipos de sesión</strong><p>Agrega el primero para preseleccionar su duración al crear una cita.</p><button className="button button-primary" type="button" onClick={() => open("new")}>Crear primer tipo</button></div>}
    </section>
    <dialog ref={dialogRef} className="session-type-dialog" onCancel={(event) => { if (pending) event.preventDefault(); }} onClose={() => setEditor(null)}>
      {editor ? <form onSubmit={submit}><header><div><h2>{editor === "new" ? "Nuevo tipo de sesión" : "Editar tipo de sesión"}</h2><p className="muted">Define un nombre claro y su duración habitual.</p></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={close} disabled={pending}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button></header><div className="session-type-dialog-body">{editor !== "new" && <input type="hidden" name="id" value={editor.id}/>}<label>Nombre<input name="name" defaultValue={editor === "new" ? "" : editor.name} minLength={2} maxLength={120} required disabled={pending}/></label><label>Duración en minutos<input name="durationMinutes" type="number" min={10} max={240} step={5} defaultValue={editor === "new" ? 30 : editor.durationMinutes} required disabled={pending}/></label>{editor === "new" ? <label className="session-type-checkbox"><input name="isDefault" type="checkbox" disabled={pending}/><span>Usar como predeterminado al crear citas</span></label> : null}{error ? <p className="agenda-dialog-error" role="alert">{error}</p> : null}</div><footer><button className="button" type="button" onClick={close} disabled={pending}>Cancelar</button><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</button></footer></form> : null}
    </dialog>
  </>;
}
