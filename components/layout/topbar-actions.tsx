"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  createPatientFromTopbar,
  searchPatients,
  type ConvenioOption,
  type PatientSearchResult,
} from "@/app/(app)/patients/actions";
import { signOut } from "@/app/(app)/profile/actions";
import { PatientCreateDialog } from "@/components/patients/patient-create-dialog";

type IconName = "search" | "plus" | "calendar-plus" | "bell" | "help";
function ActionIcon({ name }: { name: IconName }) {
  if (name === "search")
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
    );
  if (name === "plus")
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  if (name === "calendar-plus")
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18M12 14v4M10 16h4" />
      </svg>
    );
  if (name === "bell")
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
    );
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4.25 1.8c-.95.9-1.75 1.35-1.75 2.7M12 17h.01" />
    </svg>
  );
}

function getInitials(userName: string) {
  const honorifics = new Set(["dr", "dra", "doctor", "doctora"]);
  const parts = userName
    .trim()
    .split(/\s+/)
    .filter((part) => !honorifics.has(part.replace(/\./g, "").toLocaleLowerCase("es-CL")));

  if (parts.length === 0) return "US";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("es-CL");
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toLocaleUpperCase("es-CL");
}

export function TopbarActions({
  userName,
  email,
  pendingNotifications,
  convenios,
}: {
  userName: string;
  email: string;
  pendingNotifications: number;
  convenios: ConvenioOption[];
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [isSearching, startSearch] = useTransition();
  const searchRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const patientDialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      const target = event.target as Node;
      if (!searchRef.current?.contains(target)) setSearchOpen(false);
      if (!helpRef.current?.contains(target)) setHelpOpen(false);
      if (!profileRef.current?.contains(target)) setProfileOpen(false);
    }
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setHelpOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);
  function runSearch(value: string) {
    setQuery(value);
    setSearchOpen(true);
    if (value.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    startSearch(async () => {
      setResults(await searchPatients(value));
      setSearched(true);
    });
  }
  function newAppointment() {
    if (pathname === "/agenda")
      document
        .getElementById("new-appointment")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    else router.push("/agenda#new-appointment");
  }
  return (
    <>
      <div className="topbar-actions" aria-label="Acciones globales">
        <div className="topbar-popover" ref={searchRef}>
          <button
            className="icon-button"
            type="button"
            aria-label="Buscar paciente"
            title="Buscar paciente"
            aria-expanded={searchOpen}
            aria-controls="patient-search"
            onClick={() => setSearchOpen((open) => !open)}
          >
            <ActionIcon name="search" />
          </button>
          {searchOpen && (
            <div className="action-popover search-popover" id="patient-search">
              <label htmlFor="global-patient-search">
                Buscar por nombre o RUT
              </label>
              <input
                id="global-patient-search"
                type="search"
                value={query}
                onChange={(event) => runSearch(event.target.value)}
                placeholder="Ej. Emilia o 12.345.678-5"
                autoFocus
                aria-describedby="patient-search-help"
              />
              <small id="patient-search-help" className="muted">
                Ingresa al menos 2 caracteres.
              </small>
              <div className="search-results" aria-live="polite">
                {isSearching ? (
                  <p>Buscando pacientes…</p>
                ) : results.length ? (
                  <ul>
                    {results.map((patient) => (
                      <li key={patient.id}>
                        <Link
                          href={`/patients/${patient.id}`}
                          onClick={() => setSearchOpen(false)}
                        >
                          <strong>{patient.name}</strong>
                          {patient.rut && (
                            <span className="mono">{patient.rut}</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : searched ? (
                  <p>No encontramos pacientes. Revisa el nombre o RUT.</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Nuevo paciente"
          title="Nuevo paciente"
          onClick={() => patientDialog.current?.showModal()}
        >
          <ActionIcon name="plus" />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label="Nueva cita"
          title="Nueva cita"
          onClick={newAppointment}
        >
          <ActionIcon name="calendar-plus" />
        </button>
        <Link
          className="icon-button"
          href="/reports/insights"
          aria-label="Notificaciones"
          title="Notificaciones"
        >
          <ActionIcon name="bell" />
          {pendingNotifications > 0 && (
            <span
              className="notification-badge"
              aria-label={`${pendingNotifications} notificaciones pendientes`}
            >
              {pendingNotifications > 99 ? "99+" : pendingNotifications}
            </span>
          )}
        </Link>
        <div className="topbar-popover" ref={helpRef}>
          <button
            className="icon-button"
            type="button"
            aria-label="Ayuda"
            title="Ayuda"
            aria-expanded={helpOpen}
            aria-controls="help-popover"
            onClick={() => setHelpOpen((open) => !open)}
          >
            <ActionIcon name="help" />
          </button>
          {helpOpen && (
            <div className="action-popover help-popover" id="help-popover" role="status">
              <p className="muted">El centro de ayuda llegará pronto.</p>
            </div>
          )}
        </div>
        <div className="topbar-popover" ref={profileRef}>
          <button
            className="icon-button"
            type="button"
            aria-label="Perfil"
            title="Perfil"
            aria-expanded={profileOpen}
            aria-controls="profile-menu"
            onClick={() => setProfileOpen((open) => !open)}
          >
            <span className="profile-avatar" aria-hidden="true">{getInitials(userName)}</span>
          </button>
          {profileOpen && (
            <div
              className="action-popover profile-menu"
              id="profile-menu"
              role="menu"
            >
              <header>
                <strong>{userName}</strong>
                <span>{email}</span>
              </header>
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setProfileOpen(false)}
              >
                Mi perfil
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setProfileOpen(false)}
              >
                Mi configuración
              </Link>
              <form action={signOut}>
                <button type="submit" role="menuitem">
                  Cerrar sesión
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      <PatientCreateDialog dialogRef={patientDialog} convenios={convenios} action={createPatientFromTopbar} />
    </>
  );
}
