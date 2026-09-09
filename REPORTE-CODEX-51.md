# REPORTE-CODEX-51

## Cambios realizados

- Se corrigió `db/fixtures/demo.ts` para entregar `organizations.settings` a Postgres.js mediante `sql.json(...)`, como un objeto JSON real y no como una cadena serializada manualmente.
- Se creó `db/migrations/0014_normalize_organization_settings.sql`.
- La migración conserva los objetos existentes, convierte cadenas que contienen objetos JSON válidos, fusiona en orden los objetos de arreglos con prevalencia del último valor y convierte cadenas o escalares inválidos en `{}`.
- Los valores `NULL` se conservan. En el esquema actual `organizations.settings` es `NOT NULL`, pero la migración los excluye defensivamente.
- No se agregó ningún `GRANT`: la migración no crea tablas, funciones persistentes ni privilegios nuevos; solo actualiza una columna existente como propietario de la migración.

## Diff de `db/fixtures/demo.ts`

```diff
diff --git a/db/fixtures/demo.ts b/db/fixtures/demo.ts
index eef30b1..0a25832 100644
--- a/db/fixtures/demo.ts
+++ b/db/fixtures/demo.ts
@@ -6,6 +6,7 @@ import { addDaysLocal, todayInSantiago } from "@/features/dashboard/domain";
 /** Todos los datos de esta fixture son ficticios y nunca representan pacientes reales. */
 export const FICTIONAL_DATA_MARKER =
   "DATOS FICTICIOS — solo demostración NexoDent";
+const fictionalSettings = { marker: FICTIONAL_DATA_MARKER };
 export const demoIds = {
@@ -141,7 +142,7 @@ const users = [
 export async function insertDemoFixture(sql: Sql): Promise<void> {
-  await sql`INSERT INTO organizations (id, type, slug, name, settings) VALUES (${demoIds.clinic}, 'clinic', 'demo-clinic', 'Clínica Sonrisa Andes', ${JSON.stringify({ marker: FICTIONAL_DATA_MARKER })}::jsonb), (${demoIds.independent}, 'independent', 'dra-valentina-rojas', 'Dra. Valentina Rojas', ${JSON.stringify({ marker: FICTIONAL_DATA_MARKER })}::jsonb) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, settings = EXCLUDED.settings, updated_at = now()`;
+  await sql`INSERT INTO organizations (id, type, slug, name, settings) VALUES (${demoIds.clinic}, 'clinic', 'demo-clinic', 'Clínica Sonrisa Andes', ${sql.json(fictionalSettings)}), (${demoIds.independent}, 'independent', 'dra-valentina-rojas', 'Dra. Valentina Rojas', ${sql.json(fictionalSettings)}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, settings = EXCLUDED.settings, updated_at = now()`;
```

## Migración creada

`db/migrations/0014_normalize_organization_settings.sql`

Se usó el correlativo `0014` porque el repositorio ya contiene las migraciones `0012_session_types.sql` y `0013_agenda_blocks.sql`. Crear otra migración `0012_*` rompería el orden nominal y podría producir una ejecución ambigua.

## Validación de idempotencia y datos

Se ejecutó un arnés temporal contra PostgreSQL integrado con casos de:

- objeto ya válido;
- cadena JSON que contiene un objeto;
- arreglo con cadena-objeto, objetos y escalares;
- claves repetidas para verificar que prevalece el último objeto;
- cadena inválida;
- escalar no objeto.

El arnés aplicó la migración dos veces, capturó las filas después de cada ejecución y comparó ambos resultados completos. La segunda ejecución no produjo cambios. También verificó que el marker contenido como cadena-objeto se recuperara y que todo valor no nulo terminara con `jsonb_typeof(settings) = 'object'`.

En la misma base integrada se ejecutó `insertDemoFixture` y se comprobó para ambas organizaciones demo:

- `jsonb_typeof(settings) = 'object'`;
- `settings ->> 'marker' = 'DATOS FICTICIOS — solo demostración NexoDent'`.

Además, `tests/integration/rls-seed.test.ts` pasó: 1 archivo, 1 prueba.

## Verificaciones generales

- `npx tsc --noEmit`: correcto.
- `npm run lint`: correcto.
- `npm run build`: correcto.
- El build emitió advertencias preexistentes por el secreto predeterminado de Better Auth y por la convención obsoleta de `middleware`, sin afectar el código de salida exitoso.

## Desvíos

- Único desvío: nombre correlativo `0014` en lugar de `0012`, porque `0012` y `0013` ya existen.
- No se hicieron commits ni pushes.

