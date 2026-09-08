import { sql } from "@/db/client";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";
import { updatePermissions } from "./actions";

type PermissionsSettings = {
  calendar?: {
    restrictModification?: boolean;
    allowPastScheduling?: boolean;
  };
  treatments?: {
    restrictDiscounts?: boolean;
    fullAccess?: boolean;
    dashboardLastPayments?: boolean;
    deleteFees?: boolean;
    assistantsManage?: boolean;
    restrictCollaboratorDiscounts?: boolean;
    adminsOnlyPayments?: boolean;
    hideDiscountsInPrints?: boolean;
    customToothZone?: boolean;
  };
};

type OrganizationSettings = {
  permissions?: PermissionsSettings;
};

type PermissionOption = {
  key: string;
  title: string;
  description: string;
  enabled: boolean;
};

function PermissionRow({ option }: { option: PermissionOption }) {
  return (
    <label className="permission-row">
      <span className="permission-row-copy">
        <strong className="permission-row-title">{option.title}</strong>
        <span className="permission-row-desc">{option.description}</span>
      </span>
      <span className="perm-switch">
        <input
          type="checkbox"
          role="switch"
          name={`permissions[${option.key}]`}
          defaultChecked={option.enabled}
          aria-label={option.title}
        />
        <span className="perm-switch-track" aria-hidden="true"><span /></span>
      </span>
    </label>
  );
}

export default async function PermisosPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const [{ ok }, actor] = await Promise.all([searchParams, requestTenantContext()]);
  const organization = await runAsTenant(sql, actor, async (tx) => (await tx<Array<{
    settings: OrganizationSettings | null;
  }>>`SELECT settings FROM organizations WHERE id = ${actor.organizationId}`)[0]);
  if (!organization) throw new Error("La organización no está disponible.");

  const permissions = organization.settings?.permissions;
  const calendar = permissions?.calendar ?? {};
  const treatments = permissions?.treatments ?? {};

  const calendarOptions: PermissionOption[] = [
    {
      key: "calendar.restrictModification",
      title: "Restringir modificación de citas",
      description: "No permitir a los profesionales mover o eliminar citas agendadas. Solo los administradores podrán realizar estos cambios.",
      enabled: calendar.restrictModification ?? false,
    },
    {
      key: "calendar.allowPastScheduling",
      title: "Permitir agendar en horas pasadas",
      description: "Habilita la opción de agendar citas en horarios que ya han transcurrido en el calendario.",
      enabled: calendar.allowPastScheduling ?? false,
    },
  ];
  const treatmentOptions: PermissionOption[] = [
    {
      key: "treatments.restrictDiscounts",
      title: "Restringir descuentos adicionales",
      description: "No permitir a los profesionales agregar descuentos adicionales en planes de tratamiento. Solo administradores y colaboradores podrán aplicar descuentos.",
      enabled: treatments.restrictDiscounts ?? false,
    },
    {
      key: "treatments.fullAccess",
      title: "Acceso total a planes de tratamiento",
      description: "Permitir a los profesionales gestionar todos los planes de tratamiento de la clínica, no solo los propios.",
      enabled: treatments.fullAccess ?? false,
    },
    {
      key: "treatments.dashboardLastPayments",
      title: "Mostrar últimos pagos en Dashboard",
      description: "Permitir a los profesionales ver los últimos pagos realizados de sus planes de tratamiento directamente en el Dashboard.",
      enabled: treatments.dashboardLastPayments ?? false,
    },
    {
      key: "treatments.deleteFees",
      title: "Eliminar aranceles de planes de tratamiento",
      description: "Permitir a los profesionales eliminar aranceles de sus planes de tratamiento. Si está deshabilitado, solo administradores podrán eliminar aranceles.",
      enabled: treatments.deleteFees ?? false,
    },
    {
      key: "treatments.assistantsManage",
      title: "Asistentes gestionan planes de tratamiento",
      description: "Permitir a los asistentes administrativos crear planes de tratamiento a nombre de un profesional tratante, agregar prestaciones y registrar cuando se finalizan. Si está deshabilitado, solo pueden verlos.",
      enabled: treatments.assistantsManage ?? false,
    },
    {
      key: "treatments.restrictCollaboratorDiscounts",
      title: "Restringir descuentos a colaboradores",
      description: "Restringir a los colaboradores de agregar descuentos adicionales en planes de tratamiento. Solo administradores podrán aplicar descuentos.",
      enabled: treatments.restrictCollaboratorDiscounts ?? false,
    },
    {
      key: "treatments.adminsOnlyPayments",
      title: "Solo administradores agregan pagos",
      description: "Permitir solo a administradores agregar pagos a los planes de tratamiento. Profesionales y colaboradores no podrán registrar pagos.",
      enabled: treatments.adminsOnlyPayments ?? false,
    },
    {
      key: "treatments.hideDiscountsInPrints",
      title: "Ocultar descuentos en impresiones",
      description: "Ocultar la columna de descuento al imprimir o exportar planes de tratamiento. Los montos se mostrarán sin detallar los descuentos aplicados.",
      enabled: treatments.hideDiscountsInPrints ?? false,
    },
    {
      key: "treatments.customToothZone",
      title: "Permitir zona personalizada en piezas dentales",
      description: "Habilita una opción de texto libre en el selector de piezas dentales de presupuestos y evoluciones, para clínicas que no trabajan con dientes específicos (ej. estética facial).",
      enabled: treatments.customToothZone ?? false,
    },
  ];

  return (
    <main className="permissions-settings">
      <header className="organization-heading">
        <h1>Permisos</h1>
        <p className="muted">Controla las funcionalidades disponibles para los usuarios del sistema</p>
      </header>
      {ok === "permisos" && <p className="inline-notice notice-banner" role="status">Permisos actualizados.</p>}

      <form action={updatePermissions} className="permissions-form">
        <section className="settings-card permissions-card">
          <header>
            <h2>Permisos del Calendario</h2>
            <p className="muted">Controla las acciones permitidas en el calendario de citas</p>
          </header>
          <div className="permission-list">
            {calendarOptions.map((option) => <PermissionRow key={option.key} option={option} />)}
          </div>
        </section>

        <section className="settings-card permissions-card">
          <header>
            <h2>Permisos de Planes de tratamiento</h2>
            <p className="muted">Gestiona los permisos relacionados con planes de tratamiento y pagos</p>
          </header>
          <div className="permission-list">
            {treatmentOptions.map((option) => <PermissionRow key={option.key} option={option} />)}
          </div>
        </section>

        <div className="settings-card-actions permissions-actions">
          <button type="submit" className="button button-primary">Guardar permisos</button>
        </div>
      </form>
    </main>
  );
}
