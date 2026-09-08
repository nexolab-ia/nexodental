-- 0013: bloqueos puntuales de agenda (tenant-scoped)
CREATE TYPE agenda_block_scope AS ENUM ('clinic', 'box');
CREATE TYPE agenda_block_reason AS ENUM ('meeting', 'training', 'procedure', 'permission', 'holiday', 'maintenance', 'other');

CREATE TABLE agenda_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope agenda_block_scope NOT NULL,
  box_id uuid REFERENCES boxes(id) ON DELETE CASCADE,
  reason agenda_block_reason NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  all_day boolean NOT NULL DEFAULT true,
  starts_at time,
  ends_at time,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agenda_blocks_dates_valid CHECK (starts_on <= ends_on),
  CONSTRAINT agenda_blocks_times_valid CHECK (
    (all_day AND starts_at IS NULL AND ends_at IS NULL)
    OR (NOT all_day AND starts_at IS NOT NULL AND ends_at IS NOT NULL AND starts_at < ends_at)
  ),
  CONSTRAINT agenda_blocks_scope_valid CHECK (
    (scope = 'box' AND box_id IS NOT NULL)
    OR (scope = 'clinic' AND box_id IS NULL)
  )
);

CREATE INDEX agenda_blocks_scope_idx ON agenda_blocks (organization_id, starts_on, ends_on);

ALTER TABLE agenda_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_blocks FORCE ROW LEVEL SECURITY;

CREATE POLICY agenda_blocks_read_tenant ON agenda_blocks
  FOR SELECT
  USING (
    organization_id = current_setting('app.organization_id', true)::uuid
    AND current_setting('app.role', true) IN ('organization_admin', 'independent_owner', 'professional', 'assistant')
  );

CREATE POLICY agenda_blocks_write_manage ON agenda_blocks
  FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)::uuid
    AND current_setting('app.role', true) IN ('organization_admin', 'independent_owner')
  )
  WITH CHECK (
    organization_id = current_setting('app.organization_id', true)::uuid
    AND current_setting('app.role', true) IN ('organization_admin', 'independent_owner')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agenda_blocks TO nexodent_app;
