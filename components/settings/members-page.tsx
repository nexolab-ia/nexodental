"use client";

import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { MEMBER_ROLE_OPTIONS, type MemberRoleLabel } from "@/features/members/roles";
import { ScheduleDialog } from "./schedule-dialog";
import { AbsencesDialog } from "./absences-dialog";

const WEEKDAYS = [
  { id: "mon", label: "L" },
  { id: "tue", label: "M" },
  { id: "wed", label: "X" },
  { id: "thu", label: "J" },
  { id: "fri", label: "V" },
  { id: "sat", label: "S" },
  { id: "sun", label: "D" },
] as const;

type MemberStatus = "active" | "suspended" | "removed";
type MemberTab = "all" | "active" | "invitations";
type RoleFilter = "all" | (typeof MEMBER_ROLE_OPTIONS)[number];

const MEMBER_TABS: MemberTab[] = ["all", "active", "invitations"];

type Member = {
  id: string;
  name: string;
  email: string;
  roleLabel: MemberRoleLabel;
  status: MemberStatus;
  memberSince: string;
  weekdays: string[];
  isOwner: boolean;
  isPaidRole: boolean;
};

type Invitation = {
  id: string;
  email: string;
  role: (typeof MEMBER_ROLE_OPTIONS)[number];
  date: string;
};

export function MembersPage({ members, professionalLimit, professionalUsage }: { members: Member[]; professionalLimit: number; professionalUsage: number }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MemberTab>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [scheduleMember, setScheduleMember] = useState<Member | null>(null);
  const [absencesMember, setAbsencesMember] = useState<Member | null>(null);
  const scheduleTriggerRef = useRef<HTMLButtonElement | null>(null);
  const absencesTriggerRef = useRef<HTMLButtonElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const filteredAllMembers = members.filter((member) => roleFilter === "all" || member.roleLabel === roleFilter);
  const filteredActiveMembers = filteredAllMembers.filter((member) => member.status === "active");
  const activeMembers = members.filter((member) => member.status === "active").length;

  function refreshList() {
    router.refresh();
    setNotice("Lista actualizada.");
  }

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, tab: MemberTab) {
    const currentIndex = MEMBER_TABS.indexOf(tab);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % MEMBER_TABS.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + MEMBER_TABS.length) % MEMBER_TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = MEMBER_TABS.length - 1;
    else return;
    event.preventDefault();
    const nextTab = MEMBER_TABS[nextIndex];
    setActiveTab(nextTab);
    tabRefs.current[nextIndex]?.focus();
  }

  return <main className="members-page">
    <header className="members-heading">
      <div>
        <h1>Usuarios</h1>
        <p className="muted">Administra los usuarios y permisos de tu clínica.</p>
      </div>
      <div className="members-heading-actions">
        <button className="icon-button" type="button" aria-label="Actualizar" title="Actualizar" onClick={refreshList}>
          <RefreshIcon />
        </button>
        <button className="button button-primary members-invite-button" type="button" onClick={() => setInviteOpen(true)}>
          <UserPlusIcon />
          Invitar Usuario
        </button>
      </div>
    </header>

    {notice && <p className="billing-inline-notice" role="status">{notice}</p>}

    <div className="members-tabs" role="tablist" aria-label="Usuarios">
      <MemberTabButton active={activeTab === "all"} count={members.length} id="all" label="Todos" onClick={setActiveTab} onKeyDown={moveTab} tabRef={(element) => { tabRefs.current[0] = element; }} />
      <MemberTabButton active={activeTab === "active"} count={activeMembers} id="active" label="Activos" onClick={setActiveTab} onKeyDown={moveTab} tabRef={(element) => { tabRefs.current[1] = element; }} />
      <MemberTabButton active={activeTab === "invitations"} count={invitations.length} id="invitations" label="Invitaciones" onClick={setActiveTab} onKeyDown={moveTab} tabRef={(element) => { tabRefs.current[2] = element; }} />
    </div>

    {activeTab !== "invitations" && <div className="members-filter-row">
      <label className="members-role-filter">
        <span className="sr-only">Filtrar por rol</span>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}>
          <option value="all">Todos los roles</option>
          {MEMBER_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
      </label>
      <p className="muted members-professional-usage">{professionalUsage} de {professionalLimit} profesionales utilizados</p>
    </div>}

    <section className="members-list" id="members-all-panel" role="tabpanel" aria-labelledby="members-all-tab" hidden={activeTab !== "all"}>
      <MembersList members={filteredAllMembers} onDetails={(member, trigger) => { absencesTriggerRef.current = trigger; setAbsencesMember(member); }} onSchedule={(member, trigger) => { scheduleTriggerRef.current = trigger; setScheduleMember(member); }} />
    </section>
    <section className="members-list" id="members-active-panel" role="tabpanel" aria-labelledby="members-active-tab" hidden={activeTab !== "active"}>
      <MembersList members={filteredActiveMembers} onDetails={(member, trigger) => { absencesTriggerRef.current = trigger; setAbsencesMember(member); }} onSchedule={(member, trigger) => { scheduleTriggerRef.current = trigger; setScheduleMember(member); }} />
    </section>
    <section className="members-list" id="members-invitations-panel" role="tabpanel" aria-labelledby="members-invitations-tab" hidden={activeTab !== "invitations"}>
      {invitations.length ? invitations.map((invitation) => <article className="settings-card invitation-card" key={invitation.id}>
        <div>
          <strong>{invitation.email}</strong>
          <p className="muted">{invitation.role} · {invitation.date}</p>
        </div>
        <span className="members-pending-badge">Pendiente</span>
      </article>) : <EmptyInvitations />}
    </section>

    <InviteDialog
      onClose={() => setInviteOpen(false)}
      onInvite={(invitation) => {
        setInvitations((current) => [invitation, ...current]);
        setActiveTab("invitations");
        setNotice(`Invitación demo enviada a ${invitation.email} — el envío real llegará con el backend de invitaciones.`);
      }}
      open={inviteOpen}
    />
    <ScheduleDialog
      member={scheduleMember}
      onClose={() => { setScheduleMember(null); requestAnimationFrame(() => scheduleTriggerRef.current?.focus()); }}
      onSaved={(message) => { setNotice(message); router.refresh(); }}
    />
    <AbsencesDialog member={absencesMember} onClose={() => { setAbsencesMember(null); requestAnimationFrame(() => absencesTriggerRef.current?.focus()); }} />
  </main>;
}

function MemberTabButton({ active, count, id, label, onClick, onKeyDown, tabRef }: { active: boolean; count: number; id: MemberTab; label: string; onClick: (tab: MemberTab) => void; onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, tab: MemberTab) => void; tabRef: (element: HTMLButtonElement | null) => void }) {
  return <button className={active ? "members-tab is-active" : "members-tab"} id={`members-${id}-tab`} type="button" role="tab" aria-selected={active} aria-controls={`members-${id}-panel`} tabIndex={active ? 0 : -1} onClick={() => onClick(id)} onKeyDown={(event) => onKeyDown(event, id)} ref={tabRef}>{label} ({count})</button>;
}

function MembersList({ members, onDetails, onSchedule }: { members: Member[]; onDetails: (member: Member, trigger: HTMLButtonElement) => void; onSchedule: (member: Member, trigger: HTMLButtonElement) => void }) {
  return <>{members.length ? members.map((member) => <MemberCard key={member.id} member={member} onDetails={onDetails} onSchedule={onSchedule} />) : <EmptyMembers />}</>;
}

function MemberCard({ member, onDetails, onSchedule }: { member: Member; onDetails: (member: Member, trigger: HTMLButtonElement) => void; onSchedule: (member: Member, trigger: HTMLButtonElement) => void }) {
  const initials = member.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const hasAvailability = member.weekdays.length > 0;

  return <article className="settings-card member-card">
    <header className="member-card-header">
      <span className="member-avatar" aria-hidden="true">{initials}</span>
      <div className="member-name-group">
        <div className="member-name-row"><h2>{member.name}</h2>{member.status === "active" && <span className="badge-active"><span />Activo</span>}{member.isOwner && <span className="members-owner-badge">Owner</span>}</div>
      </div>
      <div className="member-card-actions">
        <button className="icon-button" type="button" aria-label={`Configurar horarios de ${member.name}`} title="Configurar horarios" onClick={(event) => onSchedule(member, event.currentTarget)}><CalendarIcon /></button>
        <button className="icon-button" type="button" aria-label={`Ver ausencias de ${member.name}`} title="Ver ausencias" onClick={(event) => onDetails(member, event.currentTarget)}><EyeIcon /></button>
      </div>
    </header>
    {hasAvailability && <section className="member-schedule" aria-label={`Horarios de trabajo de ${member.name}`}>
      <strong>Horarios de trabajo</strong>
      <div className="weekday-grid">{WEEKDAYS.map((weekday) => <span className={member.weekdays.includes(weekday.id) ? "weekday-cell is-active" : "weekday-cell"} key={weekday.id} aria-label={`${weekday.label}: ${member.weekdays.includes(weekday.id) ? "activo" : "sin horario"}`}>{weekday.label}</span>)}</div>
    </section>}
    <dl className="member-details">
      <div><dt>Rol</dt><dd>{member.roleLabel}</dd></div>
      <div><dt>Email</dt><dd>{member.email}</dd></div>
      <div><dt>Miembro desde</dt><dd>{member.memberSince}</dd></div>
    </dl>
  </article>;
}

function InviteDialog({ onClose, onInvite, open }: { onClose: () => void; onInvite: (invitation: Invitation) => void; open: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof MEMBER_ROLE_OPTIONS)[number]>(MEMBER_ROLE_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => emailRef.current?.focus());
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    if (!isSending) onClose();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Ingresa un email válido.");
      return;
    }
    setError(null);
    setIsSending(true);
    window.setTimeout(() => {
      onInvite({ id: crypto.randomUUID(), email: normalizedEmail, role, date: new Intl.DateTimeFormat("es-CL").format(new Date()) });
      setEmail("");
      setRole(MEMBER_ROLE_OPTIONS[0]);
      setIsSending(false);
      onClose();
    }, 600);
  }

  return <dialog className="members-dialog" ref={dialogRef} aria-labelledby="invite-user-title" aria-describedby="invite-user-description" onCancel={close} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <form className="members-invite-form" onSubmit={submit} noValidate>
      <header>
        <div><h2 id="invite-user-title">Invitar usuario</h2><p id="invite-user-description">Envía una invitación para sumar a tu clínica.</p></div>
        <button className="icon-button" type="button" aria-label="Cerrar invitación" title="Cerrar" onClick={close}><CloseIcon /></button>
      </header>
      <label>Email<input ref={emailRef} type="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "invite-email-error" : undefined} required /></label>
      {error && <p className="members-field-error" id="invite-email-error" role="alert">{error}</p>}
      <label>Rol<select value={role} onChange={(event) => setRole(event.target.value as (typeof MEMBER_ROLE_OPTIONS)[number])}>{MEMBER_ROLE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
      <footer><button className="button" type="button" onClick={close} disabled={isSending}>Cancelar</button><button className="button button-primary" type="submit" disabled={isSending}>{isSending ? "Enviando…" : "Enviar invitación"}</button></footer>
    </form>
  </dialog>;
}

function EmptyMembers() { return <div className="members-empty-state"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2" /><path d="M3 20a6 6 0 0 1 12 0M15 16a5 5 0 0 1 6 4" /></svg><p>No hay usuarios para este filtro.</p></div>; }
function EmptyInvitations() { return <div className="members-empty-state"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5h16v14H4z" /><path d="m4 7 8 6 8-6" /></svg><p>Sin invitaciones todavía.</p></div>; }

function RefreshIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0 2 5.5" /><path d="M20 4v7h-7" /></svg>; }
function UserPlusIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="9" cy="8" r="4" /><path d="M3 21a6 6 0 0 1 12 0M19 8v6M16 11h6" /></svg>; }
function CalendarIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></svg>; }
function EyeIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>; }
function CloseIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>; }
