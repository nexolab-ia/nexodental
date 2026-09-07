-- 0011: ausencias de usuarios (tenant-scoped)
CREATE TABLE absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  absence_type varchar(40) NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  duration varchar(16) NOT NULL,
  starts_at time,
  ends_at time,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT absences_type_valid CHECK (absence_type IN ('vacation','medical_leave','personal','holiday','other')),
  CONSTRAINT absences_duration_valid CHECK (duration IN ('full_day','specific_hours')),
  CONSTRAINT absences_interval_valid CHECK (starts_on <= ends_on AND ((duration = 'full_day' AND starts_at IS NULL AND ends_at IS NULL) OR (duration = 'specific_hours' AND starts_on = ends_on AND starts_at IS NOT NULL AND ends_at IS NOT NULL AND starts_at < ends_at))),
  CONSTRAINT absences_membership_tenant_fk FOREIGN KEY (membership_id, organization_id) REFERENCES memberships(id, organization_id) ON DELETE CASCADE
);
CREATE INDEX absences_scope_idx ON absences (organization_id, membership_id);
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences FORCE ROW LEVEL SECURITY;
CREATE POLICY absences_read_tenant ON absences FOR SELECT USING (organization_id = current_setting('app.organization_id', true)::uuid);
CREATE POLICY absences_write_manage ON absences FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid AND current_setting('app.role', true) IN ('organization_admin','independent_owner'))
  WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid AND current_setting('app.role', true) IN ('organization_admin','independent_owner'));
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE absences TO nexodent_app;
