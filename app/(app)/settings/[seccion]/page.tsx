import { notFound } from "next/navigation";

export const SETTINGS_PLACEHOLDERS: Record<string, { title: string; description: string }> = {
  plan: { title: "Plan", description: "Suscripción, cobros y medios de pago de tu espacio." },
  usuarios: { title: "Usuarios", description: "Quiénes acceden a la clínica." },
  bloqueos: { title: "Bloqueos", description: "Bloqueos de agenda por profesional, box o fecha." },
  "agenda-online": { title: "Agenda Online", description: "Configuración del agendamiento público por enlace." },
  box: { title: "Box", description: "Sillones y boxes de atención de la clínica." },
  plantillas: { title: "Plantillas", description: "Plantillas de evoluciones y documentos clínicos." },
  nomenclatura: { title: "Nomenclatura", description: "Catálogo de prestaciones y nomenclatura clínica." },
  convenios: { title: "Convenios", description: "Convenios con aseguradoras, FONASA e isapres." },
  aranceles: { title: "Aranceles", description: "Precios de prestaciones por convenio o particular." },
  agrupaciones: { title: "Agrupaciones", description: "Agrupaciones de prestaciones para presupuestos." },
  ajustes: { title: "Ajustes", description: "Preferencias generales del sistema." },
  exportar: { title: "Exportar", description: "Exportación de datos y respaldos." },
  "documentos-legales": { title: "Documentos legales", description: "Consentimientos, políticas y términos." },
};

export default async function SettingsPlaceholderPage({
  params,
}: {
  params: Promise<{ seccion: string }>;
}) {
  const { seccion } = await params;
  const placeholder = SETTINGS_PLACEHOLDERS[seccion];

  if (!placeholder) notFound();

  return (
    <div className="settings-scaffold">
      <header>
        <h1>{placeholder.title}</h1>
        <span className="settings-badge">En desarrollo</span>
      </header>
      <p className="muted">{placeholder.description}</p>
    </div>
  );
}
