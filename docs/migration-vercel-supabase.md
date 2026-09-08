# Plan de migración: NexoDental → Vercel + Supabase

> **Estado: PLAN ACTIVO** — 2026-09-04. Autor: Hermes (arquitecto/orquestador). Implementa: Codex CLI vía briefs `BRIEF-CODEX-MIG-*`, supervisados por Hermes (gatekeeper).
>
> ⚠️ Este plan **revierte** la decisión del 2026-09-03 ("NO migrar; servidor dedicado propio exclusivo", archivada en `docs/migration-vercel-supabase-clerk.md`). Bryan la dejó sin efecto el 2026-09-04. Ese documento queda como archivo de evaluación; este es el plan vigente. Nota: el producto se renombró a **NexoDental** el 2026-09-04 (el repo conserva el nombre interno dental-saas/nexodent).

## 0. Objetivo y alcance

**Objetivo:** mover NexoDent desde Coolify (docker-compose: web + provision + Postgres 17 en `dental.nexolabs.cloud`) a **Vercel** (hosting Next.js serverless) + **Supabase** (Postgres gestionado + Storage), conservando Better Auth, el modelo multi-tenant RLS por GUCs y el dominio actual o uno nuevo del producto.

**Fuera de alcance (por decisión):**
- NO migrar a Clerk ni a Supabase Auth. Better Auth se conserva (vía de menor riesgo: ~40% del trabajo de la alternativa Clerk, cero costo por MAU, capa de sesión ya testeada). Reversible solo si Bryan lo pide explícitamente.
- NO usar PostgREST / API de Supabase (keys `anon`/`service_role` no se usan para la app; Supabase = Postgres + Storage gestionados).

**Criterios de éxito (todos verificables):**
1. `test:unit` + `test:integration` (RLS/tenancy contra Supabase real) + `test:smoke` en verde apuntando a Supabase.
2. Sign-in demo → dashboard OK en el dominio nuevo; RLS multi-tenant intacto (rol app NOBYPASSRLS + FORCE RLS).
3. Storage de documentos en Supabase Storage (nada en filesystem local).
4. Recordatorios/jobs corriendo vía Vercel Cron (o alternativa aprobada) con email real (Resend u otro).
5. Rollback a Coolify posible en < 1 h durante la ventana de observación (1 semana).

## 1. Estado actual verificado (2026-09-04, repo `main`)

- Next.js **16.1.1** standalone + React 19.2.3; Dockerfile multi-stage (deps→web→worker) + `docker-compose.yaml` (web/postgres/provision). En Coolify: `dental.nexolabs.cloud`, health `/api/health/ready` = 200.
- **BD**: Postgres 17; Drizzle + **postgres.js** (`db/client.ts` → `postgres(url, { max: 3, connect_timeout: 2 })`, sin `prepare:false` ni SSL explícito). Migraciones SQL planas `db/migrations/0000_*.sql … 0010_*.sql` con extensiones `pgcrypto` + `btree_gist`, aplicadas por `db/provision.ts` **con tabla de control `_nexodent_schema_migrations`** (idempotente, incremental) usando `DATABASE_URL_ADMIN`; crea rol app `nexodent_app` LOGIN NOSUPERUSER **NOBYPASSRLS** + grants + fixture demo. (`db/migrate.ts` plano re-ejecuta todo: solo sirve para base nueva.)
- **RLS**: `FORCE ROW LEVEL SECURITY` en tablas de negocio + GUCs `app.organization_id/membership_id/role/site_ids` vía `set_config(..., true)` dentro de `sql.begin` (`lib/tenancy.ts` `runAsTenant` → transaccional, compatible con pooler). Funciones `SECURITY DEFINER` (p. ej. `app_resolve_active_membership`) con owner admin.
- **Auth**: Better Auth email/password + drizzle adapter + `customSession` con claims de tenancy (`lib/auth.ts`); baseURL = `AUTH_URL ?? APP_URL`; middleware edge con `getSessionCookie`.
- **Workers**: `workers/entrypoint.mjs` corre 3 workers `tsx` por org vía env `WORKER_*`: `reminders.ts` (polling `FOR UPDATE SKIP LOCKED` sobre notifications, deliver = stub `provider_not_configured`), `insights.ts`, `migration.ts` (lotes CSV). **Procesos largos Docker → no existen en serverless.**
- **Storage**: `lib/storage.ts` adapter LOCAL (filesystem `.quarantine`, stub AV "clean-only") → **no persiste en Vercel**.
- **Email**: NO implementado (worker devuelve `provider_not_configured`). Envs `EMAIL_*` definidos.
- **Seed/demo**: Clínica demo + pacientes + `emilia.demo@nexodent.invalid` (credential). Owner real de prueba: `simon.mendoza186@gmail.com` (hardcodeado en provision §6). **No hay data real de clientes confirmada** (verificar en Fase 0).
- **Tests**: unit + integration (Postgres embebido aplica TODAS las migraciones y roles NOSUPERUSER — réplica fiel del modelo) + smoke.

## 2. Decisiones abiertas (defaults recomendados — confirmar en Fase 0)

| # | Decisión | Default recomendado | Alternativas |
|---|---|---|---|
| D1 | Auth | **Conservar Better Auth** (sin Clerk/Supabase Auth) | Clerk (US$20/mes + MAU + reescritura) |
| D2 | Región Supabase | **São Paulo (`sa-east-1`)** — menor latencia desde Chile (~100 ms vs ~180 ms) | us-east-1 (más barato en egress, más lejos) |
| D3 | Región funciones Vercel | **`gru1`** (São Paulo) junto a la DB | iad1 (default, pero DB en Brasil = peor latencia) |
| D4 | Planes | **Hobby + Free por mientras** (demo); subir a **Vercel Pro + Supabase Pro** al activar cron/recordatorios o clientes reales | Pro (US$45/mes) desde el día 1 |
| D5 | Workers/jobs | **DIFERIDO**: sin cron en Hobby (Vercel Hobby ≈ 2 runs/día) y email sigue stub → recordatorios/insights se dejan documentados como deuda hasta plan Pro | (a) puente worker en VPS apuntando a Supabase; (b) `pg_cron` + `pg_net` en Supabase |
| D6 | Email | **Resend** (nativo Vercel, free 3.000/mes) — diferido junto a D5 | SendGrid, Postmark |
| D7 | Dominio | **Mantener `dental.nexolabs.cloud`** (CNAME a Vercel) por mientras | dominio propio del producto (`nexodental.cl`/`.app`) más adelante |
| D8 | Datos | **Solo seed demo** → migrar esquema + re-seed (sin dump) | dump/restore si aparecen datos reales |

**Resueltas por Bryan el 2026-09-04:** D1 Better Auth ✓ · D4 Hobby+Free ✓ · D7 mantener dominio ✓ · D8 solo seed ✓. Consecuencias aceptadas:
- **Supabase Free pausa el proyecto tras ~7 días sin actividad** → mitigación: el demo se usa con frecuencia, y si se va a dejar inactivo, avisar para subir a Pro o planificar la pausa.
- **Vercel Hobby**: funciones con `maxDuration` ≤ 10 s (sin fluid compute) → rutas cron reales no corren; jobs diferidos (D5).
- **Email sigue stub** → recordatorios de cita (feature de venta) quedan pendientes hasta Pro; documentar en PRODUCT.md como "próximo hito post-Pro".

## 3. Arquitectura destino

```
[Usuario] → dental.<dominio> (Vercel, region gru1)
              ├─ Next.js 16 app router (Node runtime)
              │    ├─ Better Auth (email/password) → tablas propias en Supabase PG
              │    ├─ runAsTenant (GUCs tx) + rol nexodent_app NOBYPASSRLS
              │    └─ /api/cron/* (Vercel Cron, Pro) → jobs reminders/insights
              ├─ Supabase Postgres 17 (sa-east-1)
              │    ├─ pooler transaccional :6543 (app, prepare:false) 
              │    ├─ pooler sesión :5432 (admin/migraciones, IPv4)
              │    ├─ FORCE RLS + SECURITY DEFINER (sin cambios)
              │    └─ Storage buckets privados (documentos clínicos)
              └─ Resend (email recordatorios/transaccional)
Rollback: Coolify + Postgres Coolify intactos 1 semana post-cutover.
```

### Modelo de deploy (GitHub → Vercel, auto-deploy)

- **Fuente de verdad: GitHub** (`nexolab-ia/nexodental`, rama `main`). Vercel escucha pushes: `main` → **deploy de producción automático**; PRs/branches → **deploy preview** con URL propia.
- **Consecuencia de secuencia**: NUNCA mergear a `main` cambios que dependan de Supabase/envs hasta que (a) Supabase esté provisionado y (b) las env vars existan en Vercel para el scope correspondiente. Si no, el auto-deploy de producción rompe.
- **Flujo de validación**: Codex trabaja en branch (`mig/vercel-supabase`) → PR → Vercel genera preview con envs de Preview → Hermes gatekeeper valida en la URL preview (health, sign-in demo, RLS) → merge a `main` → producción. El deploy NO se dispara manualmente.
- **Env vars**: definirlas por scope (Production / Preview / Development) en Vercel (dashboard o CLI). Cambiar env vars **no** re-despliega: requiere push nuevo o "Redeploy".
- **Cutover = solo DNS** (Fase 6): con `main` mergeado y envs OK, la app ya está corriendo en `*.vercel.app`; el cambio de DNS de Coolify → Vercel es el único paso. Rollback = revertir el DNS (minutos), no re-desplegar.
- El deploy inicial de import genera una producción en `*.vercel.app` que puede fallar por envs ausentes: **inofensivo** mientras `dental.nexolabs.cloud` siga apuntando a Coolify.

## 4. Fases (cada fase = 1+ briefs a Codex, validación de puerta por Hermes)

### Fase 0 — Cuentas, decisiones y secretos (Bryan, sin código)

- [ ] Confirmar D1–D8. Crear cuentas si no existen:
  - Supabase: proyecto nuevo **región São Paulo**, guardar `Project URL`, `Database password` (rol `postgres`).
  - Vercel: importar repo `nexolab-ia/nexodental` (rama main). Al importar, Vercel genera un deploy inicial en `*.vercel.app` (puede fallar sin envs: inofensivo mientras el DNS siga en Coolify). Ideal: pegar las env vars en el paso "Configure Project" del import (o después en Project Settings → Environment Variables) — ver lista en Fase 4 T6. No tocar DNS aún.
  - Resend: API key + dominio verificado (o solo remitente si es demo).
- [ ] Dominio: CNAME a `cname.vercel-dns.com` (o registrar nuevo).
- [ ] Confirmar si existe data real de clínicas (D8). Verificar con Bryan antes de tocar nada.
- [ ] Guardar credenciales en `~/.hermes/home/.secrets/nexodent_supabase.env` y `nexodent_vercel.env` (NUNCA en repo ni /opt/data). Rotar `AUTH_SECRET` al final.
- [ ] Presupuesto: registrar costo mensual esperado (ver §7).

### Fase 1 — Supabase Postgres en paralelo (NO toca Coolify) — **riesgo mayor (RLS rol-app): validar primero**

Objetivo: esquema + RLS + rol app funcionando contra Supabase, con la suite de integración en verde.

**T1 (brief MIG-01) — Adaptar cliente y provision a Supabase**
- `db/client.ts`: `postgres(env.DATABASE_URL, { max: 3, prepare: false, connect_timeout: 5, ssl: "require" })`.
  - `prepare:false` es **obligatorio** para el pooler transaccional de Supavisor (:6543).
  - Misma instancia para migraciones/scripts locales con URL de sesión (:5432), donde `prepare` puede quedar activo — parametrizar si hace falta.
- `db/provision.ts` (sin cambios de lógica, validar contra Supabase):
  - `DATABASE_URL_ADMIN` = pooler **sesión** :5432 con rol `postgres` (IPv4 OK; la conexión directa :5432 IPv6-only puede fallar desde el VPS/local de Bryan).
  - Verificar: `CREATE ROLE nexodent_app LOGIN NOSUPERUSER NOBYPASSRLS` permitido al rol `postgres` de Supabase (sí en general vía SQL editor/pooler; si Supabase lo bloquea → alternativa documentada en R1).
  - Extensiones `pgcrypto`/`btree_gist`: ya vienen `CREATE EXTENSION IF NOT EXISTS` en `0000_core.sql` → aplican como admin.
  - Funciones `SECURITY DEFINER` owner `postgres`: patrón estándar en Supabase, OK.
- **Puerta**: correr migraciones + provision contra Supabase (base vacía) desde local:
  `DATABASE_URL_ADMIN=<sesión:5432> npm run db:migrate` seguido de provision script; verificar `_nexodent_schema_migrations` con 11 filas y rol `nexodent_app` creado.

**T2 (brief MIG-02) — Suite de integración contra Supabase**
- Parametrizar los tests de integración (hoy usan `embedded-postgres` local con migraciones completas + roles NOSUPERUSER) para poder apuntar a una URL externa (`TEST_DATABASE_URL_ADMIN`): crear DB de test en Supabase (o schema aparte), correr los 19 tests de RLS/tenancy/finance/ops contra Supabase real.
- **Puerta**: 100% en verde contra Supabase. Esto valida el punto más riesgoso (RLS rol-app + FORCE RLS + SECURITY DEFINER + GUCs vía pooler transaccional) ANTES de tocar hosting.
- Re-seed demo (`npm run seed` + provision §4–6) en la DB Supabase de desarrollo.

> ✅ **VALIDACIÓN TEMPRANA SUPERADA (2026-09-04, operación Hermes directa):**
> `db/provision.ts` corrió 100% contra Supabase sa-east-1 (exit 0): migraciones 0000–0010, rol `nexodent_app` LOGIN NOSUPERUSER NOBYPASSRLS, grants, fixture demo (2 orgs: Clínica Sonrisa Andes + Dra. Valentina Rojas), credencial demo. Smoke RLS como rol app: (1) `current_user=nexodent_app` vía pooler :6543 ✓ (2) sin GUC → 0 orgs (FORCE RLS aplica) ✓ (3) con GUC org A → 1 ✓ (4) org A no lee org B ✓ (5) SECURITY DEFINER visible ✓.
> **Lecciones operativas (configuración validada):**
> - La app debe conectar con usuario **`nexodent_app.<project_ref>`** por el pooler TRANSACCIONAL :6543 con `prepare:false` + `sslmode=require`. NUNCA `postgres.<ref>` (rol postgres en Supabase tiene BYPASSRLS → anula el aislamiento).
> - El pooler de SESIÓN :5432 NO autentica roles custom (solo `postgres.<ref>`); usarlo solo para admin/migraciones.
> - Extensiones pgcrypto/btree_gist y funciones SECURITY DEFINER: OK en Supabase. WARNINGs `no privileges were granted for "gbt_*"` al provisionar son inofensivos.

### Fase 2 — Storage → Supabase Storage — **DIFERIBLE (post-Pro o cuando haya uploads reales)**

> Con solo seed demo y sin uploads activos en el flujo, el adapter LOCAL funciona en Vercel pero **no persiste** (filesystem efímero por instancia). Deuda documentada; ejecutar esta fase antes de habilitar carga de documentos clínicos. Supabase Free incluye 1 GB de Storage.

**T3 (brief MIG-03) — Adapter S3 real**
- `lib/storage.ts`: reemplazar adapter LOCAL `.quarantine` por Supabase Storage (S3-compatible) usando credenciales del bucket (o SDK `@supabase/storage-js` con `service_role` SOLO en server, nunca en client).
- Buckets privados + políticas (solo rol server); subir/bajar documento clínico con firma temporal; mantener stub AV "clean-only" documentado (escaneo AV real queda como deuda conocida — decisión de producto para cuando haya uploads reales).
- Envs: `STORAGE_ENDPOINT/BUCKET/ACCESS_KEY/SECRET_KEY` (o equivalentes) en Vercel.
- **Puerta**: test de subida/descarga round-trip en dev + unit del adapter (mock S3).

### Fase 3 — Email real + jobs (workers Docker → serverless) — **DIFERIDA hasta plan Pro (D4/D5)**

> El worker Docker actual (`entrypoint.mjs`) no correrá en Vercel. Mientras sea Hobby+Free: **no se ejecuta ningún job** (Coolify deja de correrlos tras la descomisión; el código queda en repo). Al subir a Pro se ejecuta esta fase (conversión a route handlers + Vercel Cron + Resend). Detalle técnico del diseño futuro se mantiene abajo como referencia.

**T4 (brief MIG-04) — Provider email**
- Implementar el `deliver` real en `features/notifications/jobs` (hoy stub): adaptador Resend (`EMAIL_PROVIDER=resend`, `EMAIL_FROM`, `EMAIL_API_KEY`), plantillas de recordatorio de cita; marcar `notificationAttempts` (éxito/fallo, reintentos con backoff ya existente).
- **Puerta**: unit del deliverer (mock HTTP) + envío real a bandeja de Bryan desde dev.

**T5 (brief MIG-05) — Jobs como route handlers + Vercel Cron**
- Convertir los 3 workers a jobs invocables (función pura exportada, sin `process.argv`):
  - `reminders`: route `app/api/cron/reminders/route.ts` que itera organizaciones y ejecuta `deliverDueNotifications` por org vía `runAsTenant`. ⚠️ Diseño actual requiere actor por org y la app (rol NOBYPASSRLS) no puede listar orgs sin GUC → **necesita función `SECURITY DEFINER`** (p. ej. `app_cron_due_deliveries()`) que devuelva las filas due con su org/actor, o job con rol BYPASSRLS dedicado solo para cron. Decidir en el brief (opción recomendada: SECURITY DEFINER que expone mínimo y devuelve payloads; el envío HTTP lo hace la ruta).
  - `insights`: cron diario (mismo patrón).
  - `migration` (lotes CSV): endpoint autenticado por header secreto (`CRON_SECRET`) para ejecución on-demand/manual desde admin.
- `vercel.json`: `"crons": [{ "path": "/api/cron/reminders", "schedule": "*/15 * * * *" }, { "path": "/api/cron/insights", "schedule": "0 3 * * *" }]` (hora Chile ~ UTC-3/4). Requiere Vercel Pro (D4).
- `maxDuration` ≥ 60 en rutas cron si el lote puede exceder el default de 10 s (Pro permite hasta 300 s en funciones serverless Node).
- **Puerta**: trigger manual del cron (`curl -H "Authorization: Bearer $CRON_SECRET" …`) procesa notificaciones pendientes y actualiza `notificationAttempts`; smoke de ambas rutas.

### Fase 4 — Ajustes Next.js/Vercel

**T6 (brief MIG-06) — Config build + regiones + PWA**
- `next.config.ts`: **quitar `output: "standalone"`** (Vercel usa su propio runtime); opcional `experimental/functions` o `vercel.json` para fijar región `gru1` en rutas de app; eliminar/ignorar Dockerfile y compose en el build (Vercel ignora, pero limpiar evita confusión; NO borrar del repo aún — rollback).
- Middleware edge de Better Auth: verificar funcionamiento en Vercel (ya corre en edge hoy; mismo contrato).
- PWA/offline (`app/offline`, service worker): verificar en deploy preview (HTTPS automático; ajustar rutas si el SW cachea rutas API).
- `/api/health/ready`: sin cambios; usarlo como healthcheck de Vercel (monitor).
- Envs en Vercel: `DATABASE_URL` (pooler :6543 con `sslmode=require`), `AUTH_URL`/`APP_URL` = https://dominio-final, `AUTH_SECRET` (rotar), `STORAGE_*`, `EMAIL_*`, `CRON_SECRET`, `DEMO_*` (solo si provision corre en Vercel — NO: provision corre local/CI).
- **Puerta**: build + deploy preview OK; `npm run test:smoke` contra preview; revisar consola del navegador sin errores.

### Fase 5 — Deploy paralelo y validación integral

**T7 (brief MIG-07 / operación Hermes)**
- Provision+migraciones contra **Supabase producción** (una vez, local con credencial admin).
- Merge a `main` (dispara auto-deploy de producción en Vercel — NO hay deploy manual). Antes del merge: preview validado por gatekeeper en la URL de Vercel.
- Smoke E2E manual: sign-in demo → dashboard/agenda/pacientes/cobros; crear cita; subir documento (storage); trigger reminders manual; verificar RLS (usuario sin membresía → /onboarding; profesional sin billing → 404).
- **Puerta**: checklist integral verde + capturas para Bryan (validación visual, como pide el flujo).

### Fase 6 — Cutover y rollback — ✅ **EJECUTADO 2026-09-05**

- ✅ DNS `dental.nexolabs.cloud` → `cname.vercel-dns.com` (CNAME en Cloudflare, proxied off). HTTPS servido por Vercel inmediato. Envs `AUTH_URL`/`APP_URL` revertidas a `https://dental.nexolabs.cloud` ANTES del flip (deploy `4226b73`).
- ✅ Verificación post-cutover: `/api/health/ready` 200 `{"status":"ready"}` · landing 200 · sign-in demo 200 en el dominio final · dashboard con datos Supabase (Clínica Sonrisa Andes).
- Rollback disponible: revertir CNAME Cloudflare a `vps.nexolabs.cloud` (minutos). **Ventana de observación: 1 semana** (Coolify vivo, sin writes nuevos contra su Postgres).
- Monitoreo: Vercel Observability (errores 5xx, latencia), Supabase (uso, backups), alertas de health.
- Backups: Supabase Pro **PITR** activo + `pg_dump` semanal a bucket privado (fuera de Supabase: R2/B2) — resiliencia ante desastre regional (Ley 21.719: contrato DPA con Supabase cubre; ver §8).
- Cierre: stop app Coolify; documentar descomisión en runbook; actualizar `docs/deploy/` (nuevo runbook Vercel+Supabase reemplaza `docs/deploy/coolify.md`).

## 5. Riesgos y mitigaciones

1. **RLS rol-app en Supabase (mayor riesgo técnico)** → validación en Fase 1 T2 (tests integración contra Supabase real) antes de tocar hosting. Alternativa si `CREATE ROLE` falla: conectar app con rol `postgres` (owner; con FORCE RLS las políticas aplican igual y los GUCs resuelven tenancy — misma semántica) o rol dedicado creado desde el dashboard de Supabase.
2. **`prepare:false` y SSL** → cambios en `db/client.ts` (T1) + validación con suite.
3. **Workers no existen en serverless** → Fase 3 T5 (Vercel Cron + SECURITY DEFINER). Si Bryan no quiere Pro aún, el puente (worker residual en VPS apuntando a Supabase) es el plan B.
4. **Storage local no persiste** → Fase 2 antes del cutover. Si hay documentos reales de pacientes, migrarlos (D8).
5. **Email nunca implementado** (recordatorios = feature de venta) → Fase 3 T4; no cortar sin provider real.
6. **Cambio de dominio** afecta Better Auth (baseURL/cookies) → fijar `AUTH_URL` al dominio final ANTES del cutover y re-testear login.
7. **Supabase Free pausa la DB** tras 7 días sin actividad → no usar Free para prod; Pro ($25).
8. **Costos nuevos** (Vercel+Supabase+email) vs Coolify ya pagado → ver §7; mitigación: Hobby/Free mientras sea demo sin cron, migrar a Pro al activar recordatorios o clientes reales.

## 6. Reglas de ejecución

- Hermes = arquitecto/orquestador: escribe briefs `BRIEF-CODEX-MIG-01…`, supervisa y verifica como gatekeeper; **Codex implementa** (no tocar código sin brief aprobado; no desplegar sin avisar; no imprimir secretos).
- Secretos nuevos SOLO en `~/.hermes/home/.secrets/` (archivos `nexodent_supabase.env`, `nexodent_vercel.env`); nunca en repo ni /opt/data.
- Ninguna fase toca Coolify hasta Fase 6 (rollback intacto).
- Texto/copy si aparece UI nueva: tuteo chileno, sin voseo.

## 7. Costos estimados (2026-09, aprox.)

- Vercel Pro: US$20/mes (~$19.000 CLP) — Hobby US$0 sin cron/recordatorios.
- Supabase Pro: US$25/mes (~$24.000 CLP) — incluye PITR, sin pausa. Free: solo demo temporal.
- Resend: US$0 hasta 3.000 emails/mes.
- **Total operativo ≈ US$45/mes (~$43.000 CLP)** — comparable al servidor dedicado que se había presupuestado (~€35/mes) pero sin mantenimiento de Postgres, con PITR y sin el dolor operacional de provision/migraciones en deploys Docker (incidentes 2026-09-02/03).

## 8. Cumplimiento Ley 21.719 (datos de salud = sensibles; rige 01-dic-2026)

- Datos clínicos en Supabase (Brasil/EE.UU.) y Vercel/Resend (EE.UU.) = **transferencia internacional** (arts. 27–28): exige cláusulas contractuales/DPA con cada encargado y registro del tratamiento. Supabase/Vercel/Resend ofrecen DPA estándar — activarlos.
- Región `sa-east-1` mejora latencia pero **no elimina** la obligación de transferencia internacional.
- Clínica = responsable, NexoDent = encargado: contrato de encargo (art. 15 bis), ARCOP en 30 días ante brechas, notificación a Agencia + titulares (art. 14 sexies) — ya cubierto en el diseño del producto; la migración no cambia obligaciones, solo añade los DPA de los nuevos encargados de infraestructura.

## 9. Checklist de Bryan (Fase 0)

1. ¿Auth se queda en Better Auth? (D1 — default SÍ)
2. ¿Datos reales o solo demo? (D8)
3. ¿Dominio: mantener `dental.nexolabs.cloud` o `nexodental.cl`/`.app`? (D7)
4. ¿Presupuesto OK con Pro desde el día 1 o Hobby/Free mientras demo? (D4)
5. ¿Workers vía Vercel Cron (Pro) o puente VPS? (D5)
