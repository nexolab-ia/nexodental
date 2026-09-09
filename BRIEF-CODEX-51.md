# BRIEF-CODEX-51 — Fix semilla demo: organizations.settings como objeto válido + migración de normalización

**Producto:** NexoDental. **Origen:** bug de datos descubierto en validación de BRIEF-CODEX-50 (2026-09-09).
**Reglas fijas:** implementa MONOLÍTICAMENTE, sin delegar. Código/comentarios EN ESPAÑOL. NO commitees ni pushees.

## 1. Problema

`db/fixtures/demo.ts` (línea ~8) siembra `organizations.settings` con un JSON **doble-codificado** (un string que contiene JSON en vez de un objeto jsonb). Resultado real en Supabase: la org demo 1 quedó con `settings` como **array jsonb** (primer elemento = el string del marker) y la org demo 2 como **string jsonb**. Consecuencias:
- Toda escritura del patrón `settings = COALESCE(settings,'{}'::jsonb) || jsonb_build_object(...)` **appendaba elementos** al array (o fallaba sobre string) en vez de mergear claves → la app NUNCA pudo leer lo guardado (`settings?.agendaOnline` = undefined → siempre defaults).
- Ninguna configuración (permisos/calendario/agenda-online) persistió ni se leyó jamás en las orgs demo.

La intención del marker es que `settings` sea un OBJETO: `{"marker": "DATOS FICTICIOS — solo demostración NexoDent"}`. La lectura del código asume objeto en todas partes (`settings?.x`, `COALESCE(settings,'{}'::jsonb) || ...`).

## 2. Cambios

### A) `db/fixtures/demo.ts`
Corrige la siembra para que `settings` sea un objeto jsonb real (nada de strings doble-codificados ni arrays). Respeta el tipo TS del esquema de drizzle (columna jsonb). Mantén el marker intacto como clave del objeto.

### B) Nueva migración `0012_*` (ver convención de migraciones existentes en `db/migrations/`)
Normalización defensiva de datos existentes, idempotente y segura:
- Para cada fila de `organizations` cuyo `settings` NO sea un objeto jsonb (`jsonb_typeof(settings) <> 'object'`, incluido null → en null no hace falta, lo maneja COALESCE, pero normaliza igual si quieres):
  - **string jsonb**: si el string contiene JSON válido de objeto (`jsonb`), conviértelo a objeto (`settings::text::jsonb` tras validar). Si es el marker doble-codificado, extrae el objeto interno.
  - **array jsonb**: reconstruye un objeto fusionando sus elementos (solo elementos de tipo objeto, en orden, claves de nivel superior con wins el último). Descarta elementos string/escálares (como el marker doble-codificado) pero conserva el marker como clave si estaba presente como string válido de objeto.
  - Resultado garantizado: `jsonb_typeof(settings) = 'object'`.
- La migración debe correr también contra datos vacíos sin romper (orgs con settings null quedan null o `{}` — decide y documenta; recomiendo dejarlas null, el código ya hace COALESCE).
- GRANTs: si la tabla usa RLS/roles (patrón de migraciones previas, ej. GRANT al rol `nexodent_app`), replica el GRANT necesario si aplica a esta migración (consulta migraciones 0010/0011 como referencia de cómo se aplican y qué privilegios requieren).

## 3. Verificación local (si puedes) y criterios de aceptación

1. `npx tsc --noEmit`, `npm run lint`, `npm run build` OK.
2. El fixture genera `settings` objeto con `jsonb_typeof = 'object'` y la clave `marker` presente.
3. La migración es idempotente: aplicada dos veces sobre los mismos datos no cambia nada la segunda vez.
4. No altera lógica de negocio ni otras migraciones.

## 4. Entrega

Cambios en el working tree, sin commit. Reporta: diff de demo.ts, archivo de migración creado (nombre exacto), cómo se validó la idempotencia, y desvíos.