-- 0014: normaliza organizations.settings para que todo valor no nulo sea un objeto jsonb.
-- Los valores nulos se conservan porque las escrituras ya aplican COALESCE con un objeto vacío.
DO $$
DECLARE
  organizacion record;
  elemento jsonb;
  candidato jsonb;
  normalizado jsonb;
BEGIN
  FOR organizacion IN
    SELECT id, settings
    FROM organizations
    WHERE settings IS NOT NULL
      AND jsonb_typeof(settings) <> 'object'
  LOOP
    normalizado := '{}'::jsonb;

    IF jsonb_typeof(organizacion.settings) = 'string' THEN
      BEGIN
        candidato := (organizacion.settings #>> '{}')::jsonb;
      EXCEPTION WHEN OTHERS THEN
        candidato := NULL;
      END;

      IF jsonb_typeof(candidato) = 'object' THEN
        normalizado := candidato;
      END IF;
    ELSIF jsonb_typeof(organizacion.settings) = 'array' THEN
      FOR elemento IN
        SELECT value
        FROM jsonb_array_elements(organizacion.settings)
      LOOP
        candidato := NULL;

        IF jsonb_typeof(elemento) = 'object' THEN
          candidato := elemento;
        ELSIF jsonb_typeof(elemento) = 'string' THEN
          BEGIN
            candidato := (elemento #>> '{}')::jsonb;
          EXCEPTION WHEN OTHERS THEN
            candidato := NULL;
          END;
        END IF;

        IF jsonb_typeof(candidato) = 'object' THEN
          normalizado := normalizado || candidato;
        END IF;
      END LOOP;
    END IF;

    UPDATE organizations
    SET settings = normalizado
    WHERE id = organizacion.id;
  END LOOP;
END
$$;
