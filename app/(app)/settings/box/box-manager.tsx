"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { createBox, toggleBox, updateBox } from "./actions";

export type BoxItem = { id: string; name: string; active: boolean };
export type BoxUser = {
  id: string;
  name: string;
  role: "organization_admin" | "professional" | "independent_owner";
};

type Editor = BoxItem | "new" | null;

function errorMessage(cause: unknown): string {
  return cause instanceof Error && cause.message
    ? cause.message
    : "No pudimos guardar los cambios. Intenta nuevamente.";
}

function roleLabel(role: BoxUser["role"]): string {
  if (role === "organization_admin") return "Administrador";
  if (role === "independent_owner") return "Profesional independiente";
  return "Profesional";
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Zm10.5-13.3 2.8 2.8" /></svg>;
}

function EmptyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 4v16M9 9h11" /></svg>;
}

export function BoxManager({ items, users }: { items: BoxItem[]; users: BoxUser[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [hideDisabled, setHideDisabled] = useState(true);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [usersOpen, setUsersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const visibleItems = hideDisabled ? items.filter((item) => item.active) : items;
  const filteredUsers = users.filter((user) => user.name.toLocaleLowerCase("es-CL").includes(search.trim().toLocaleLowerCase("es-CL")));

  function open(item: BoxItem | "new") {
    setEditor(item);
    setError("");
    setUsersOpen(false);
    setSearch("");
    setSelectedUserIds([]);
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  function close() {
    if (!pending) dialogRef.current?.close();
  }

  function run(action: (data: FormData) => Promise<void>, data: FormData, closeAfter = false) {
    setError("");
    startTransition(async () => {
      try {
        await action(data);
        if (closeAfter) dialogRef.current?.close();
      } catch (cause) {
        setError(errorMessage(cause));
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // La asignación real de usuarios a boxes se implementará en una fase futura.
    run(editor === "new" ? createBox : updateBox, data, true);
  }

  function toggleSelectedUser(id: string) {
    setSelectedUserIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  const selectionSummary = selectedUserIds.length
    ? `${selectedUserIds.length} ${selectedUserIds.length === 1 ? "usuario seleccionado" : "usuarios seleccionados"}`
    : "Ninguno. Disponible para todos los profesionales";

  return <>
    <section className="settings-card session-types-card">
      <header className="session-types-heading">
        <div><h1>Box</h1><p className="muted">Gestiona los box disponibles en tu clínica</p></div>
        <button className="button button-primary session-types-add" type="button" onClick={() => open("new")}>
          <span aria-hidden="true">+</span> Añadir box
        </button>
      </header>

      <div className="session-types-toolbar">
        <label className="session-types-filter"><input type="checkbox" checked={hideDisabled} onChange={(event) => setHideDisabled(event.target.checked)} /><span>Ocultar deshabilitados</span></label>
      </div>

      {error && !editor ? <p className="agenda-dialog-error " role="alert">{error}</p> : null}

      {visibleItems.length ? <div className="session-types-table-wrap">
        <table className="session-types-table">
          <thead><tr><th>Nombre</th><th>Usuarios asignados</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>{visibleItems.map((item) => <tr key={item.id} className={item.active ? "" : "is-disabled"}>
            <td><strong>{item.name}</strong></td>
            <td className="session-type-duration">Todos los usuarios</td>
            <td><div className="session-type-actions">
              <button className="session-type-edit" type="button" onClick={() => open(item)} disabled={pending}><EditIcon /><span>Editar</span></button>
              <form action={(data) => run(toggleBox, data)}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="active" value={String(!item.active)} />
                <button className={`perm-switch ${item.active ? "is-on" : ""}`} type="submit" role="switch" aria-checked={item.active} aria-label={item.active ? `Desactivar ${item.name}` : `Activar ${item.name}`} disabled={pending}><span aria-hidden="true" /></button>
              </form>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div> : items.length ? <div className="session-types-empty box-empty">
        <EmptyIcon /><strong>No hay box visibles</strong><p>Desmarca “Ocultar deshabilitados” para ver y reactivar tus box.</p>
        <button className="button" type="button" onClick={() => setHideDisabled(false)}>Mostrar deshabilitados</button>
      </div> : <div className="session-types-empty box-empty">
        <EmptyIcon /><strong>Aún no tienes box</strong><p>Crea el primero para organizar la atención de tu clínica.</p>
        <button className="button button-primary" type="button" onClick={() => open("new")}>Crear primer box</button>
      </div>}
    </section>

    <dialog ref={dialogRef} className="session-type-dialog" aria-labelledby="session-type-dialog-title" onCancel={(event) => { if (pending) event.preventDefault(); }} onClose={() => { setEditor(null); setUsersOpen(false); }}>
      {editor ? <form onSubmit={submit}>
        <header><div><h2 id="session-type-dialog-title">{editor === "new" ? "Agregar box" : "Editar box"}</h2><p className="muted">Completa la información del box.</p></div>
          <button type="button" className="icon-button" aria-label="Cerrar" onClick={close} disabled={pending}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
        </header>
        <div className="session-type-dialog-body">
          {editor !== "new" && <input type="hidden" name="id" value={editor.id} />}
          <label>Nombre<input name="name" defaultValue={editor === "new" ? "" : editor.name} minLength={2} maxLength={120} placeholder="Ej: Box 1, Box Principal…" required disabled={pending} /></label>
          <div className="box-users-field">
            <span className="box-field-label">Usuarios asignados</span>
            <button className="box-users-trigger" type="button" aria-expanded={usersOpen} aria-controls="box-users-options" onClick={() => setUsersOpen((current) => !current)} disabled={pending}>
              <span><strong>{selectedUserIds.length ? selectionSummary : "Todos los usuarios"}</strong><small>Ninguno. Disponible para todos los profesionales</small></span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
            </button>
            {usersOpen ? <div className="box-users-popover" id="box-users-options">
              <label className="box-user-search"><span className="sr-only">Buscar usuario</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuario…" autoFocus /></label>
              <div className="box-user-list">
                {filteredUsers.length ? filteredUsers.map((user) => <label className="agenda-online-professional-row box-user-row" key={user.id}>
                  <span className="agenda-online-avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span>
                  <span className="agenda-online-professional-copy"><span className="agenda-online-professional-name">{user.name}</span><span className="agenda-online-setting-description">{roleLabel(user.role)}</span></span>
                  <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => toggleSelectedUser(user.id)} aria-label={`Seleccionar a ${user.name}`} />
                </label>) : <p className="box-users-empty">No encontramos usuarios activos.</p>}
              </div>
            </div> : null}
            <p className="box-users-status">Usuarios seleccionados: {selectionSummary}</p>
          </div>
          {error ? <p className="agenda-dialog-error" role="alert">{error}</p> : null}
        </div>
        <footer><button className="button" type="button" onClick={close} disabled={pending}>Cancelar</button><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Guardando..." : editor === "new" ? "Crear box" : "Guardar cambios"}</button></footer>
      </form> : null}
    </dialog>
  </>;
}
