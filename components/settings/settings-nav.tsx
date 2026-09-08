"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export const SETTINGS_SECTIONS = [
  {
    key: "clinic",
    label: "Mi clínica",
    items: [
      { key: "organizacion", href: "/settings/organizacion", label: "Organización", icon: "building" },
      { key: "plan", href: "/settings/plan", label: "Plan", icon: "card" },
      { key: "usuarios", href: "/settings/members", label: "Usuarios", icon: "users" },
      { key: "permisos", href: "/settings/permisos", label: "Permisos", icon: "shield" },
    ],
  },
  {
    key: "agenda",
    label: "Agenda",
    items: [
      { key: "agenda", href: "/agenda", label: "Agenda", icon: "calendar" },
      { key: "calendario", href: "/settings/calendario", label: "Calendario", icon: "clock" },
      { key: "bloqueos", href: "/settings/bloqueos", label: "Bloqueos", icon: "lock" },
      { key: "agenda-online", href: "/settings/agenda-online", label: "Agenda Online", icon: "globe" },
      { key: "notificaciones", href: "/settings/notifications", label: "Notificaciones", icon: "bell" },
      { key: "tipos-sesion", href: "/settings/tipos-sesion", label: "Tipos de Sesión", icon: "clock" },
      { key: "box", href: "/settings/box", label: "Box", icon: "boxes" },
    ],
  },
  {
    key: "clinica",
    label: "Clínica",
    items: [
      { key: "pacientes", href: "/patients", label: "Pacientes", icon: "patient" },
      { key: "plantillas", href: "/settings/plantillas", label: "Plantillas", icon: "fileText" },
      { key: "nomenclatura", href: "/settings/nomenclatura", label: "Nomenclatura", icon: "layers" },
    ],
  },
  {
    key: "facturacion",
    label: "Facturación",
    items: [
      { key: "convenios", href: "/settings/convenios", label: "Convenios", icon: "tag" },
      { key: "aranceles", href: "/settings/aranceles", label: "Aranceles", icon: "receipt" },
      { key: "agrupaciones", href: "/settings/agrupaciones", label: "Agrupaciones", icon: "folder" },
    ],
  },
  {
    key: "sistema",
    label: "Sistema",
    items: [
      { key: "ajustes", href: "/settings/ajustes", label: "Ajustes", icon: "gear" },
      { key: "exportar", href: "/settings/exportar", label: "Exportar", icon: "download" },
      { key: "documentos-legales", href: "/settings/documentos-legales", label: "Documentos legales", icon: "scale" },
    ],
  },
] as const;

type SettingsIcon = (typeof SETTINGS_SECTIONS)[number]["items"][number]["icon"];

const iconPaths: Record<SettingsIcon, ReactNode> = {
  building: <><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" /><path d="M16 9h2a2 2 0 0 1 2 2v10M8 7h4M8 11h4M8 15h4M3 21h18" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  shield: <path d="M12 3 4.5 6v5.5c0 4.7 3.2 7.9 7.5 9.5 4.3-1.6 7.5-4.8 7.5-9.5V6L12 3Z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.4 3.8 5.4 3.8 9S14.5 18.6 12 21M12 3C9.5 5.4 8.2 8.4 8.2 12S9.5 18.6 12 21" /></>,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  boxes: <><path d="m12 3 7 4-7 4-7-4 7-4ZM5 12l7 4 7-4M5 17l7 4 7-4" /><path d="M5 7v10M19 7v10M12 11v9" /></>,
  patient: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0M18 10v6M15 13h6" /></>,
  fileText: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5" /></>,
  tag: <><path d="M20 13 13 20 4 11V4h7l9 9Z" /><circle cx="8.5" cy="8.5" r="1" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  folder: <path d="M3 6h6l2 2h10v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>,
  scale: <><path d="M12 3v18M5 6h14M6 6l-3 7h6L6 6ZM18 6l-3 7h6l-3-7ZM8 21h8" /></>,
};

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Configuración" className="settings-nav">
      {SETTINGS_SECTIONS.map((section) => (
        <details className="settings-group-box" key={section.key} open>
          <summary className="settings-group">
            <span>{section.label}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m8 10 4 4 4-4" /></svg>
          </summary>
          <div className="settings-nav-items">
            {section.items.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link href={item.href} key={item.key} aria-current={isActive ? "page" : undefined}>
                  <svg aria-hidden="true" viewBox="0 0 24 24">{iconPaths[item.icon]}</svg>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </details>
      ))}
    </nav>
  );
}
