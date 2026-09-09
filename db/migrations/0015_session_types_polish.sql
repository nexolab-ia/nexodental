ALTER TABLE session_types
  ADD COLUMN IF NOT EXISTS description varchar(150) NOT NULL DEFAULT '';

-- Normalize legacy durations to the nearest supported preset before tightening the constraint.
UPDATE session_types
SET duration_minutes = CASE
  WHEN duration_minutes <= 22 THEN 15
  WHEN duration_minutes <= 37 THEN 30
  WHEN duration_minutes <= 52 THEN 45
  ELSE 60
END,
updated_at = now()
WHERE duration_minutes NOT IN (15, 30, 45, 60);

ALTER TABLE session_types
  DROP CONSTRAINT IF EXISTS session_types_duration_minutes_check;

ALTER TABLE session_types
  ADD CONSTRAINT session_types_duration_minutes_check
  CHECK (duration_minutes IN (15, 30, 45, 60));

DROP INDEX IF EXISTS session_types_one_default_per_organization_idx;

ALTER TABLE session_types
  DROP COLUMN IF EXISTS is_default;
