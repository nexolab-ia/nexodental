-- 0012: catálogo tenant-scoped de tipos de sesión
CREATE TABLE session_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  duration_minutes smallint NOT NULL CHECK (duration_minutes BETWEEN 10 AND 240),
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE UNIQUE INDEX session_types_one_default_per_organization_idx
  ON session_types (organization_id) WHERE is_default;
CREATE INDEX session_types_organization_active_idx ON session_types (organization_id, active);

ALTER TABLE session_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_types FORCE ROW LEVEL SECURITY;
CREATE POLICY session_types_read_tenant ON session_types FOR SELECT
  USING (organization_id = current_setting('app.organization_id', true)::uuid);
CREATE POLICY session_types_write_manage ON session_types FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid AND current_setting('app.role', true) IN ('organization_admin','independent_owner'))
  WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid AND current_setting('app.role', true) IN ('organization_admin','independent_owner'));
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE session_types TO nexodent_app;

ALTER TABLE appointments
  ADD COLUMN session_type_id uuid REFERENCES session_types(id) ON DELETE SET NULL;
CREATE INDEX appointments_session_type_idx ON appointments (organization_id, session_type_id);
GRANT SELECT (session_type_id), INSERT (session_type_id), UPDATE (session_type_id) ON appointments TO nexodent_app;
