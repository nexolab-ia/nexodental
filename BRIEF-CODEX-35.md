# BRIEF-CODEX-35 — Suite E2E con Playwright (login, org, RLS por rol)

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, stack Next.js 16 + Supabase + Better Auth. Código en **español, tuteo** (nunca voseo).

## Contexto

El proyecto ya tiene tests unit/smoke con **Vitest** (`npm run test:unit/integration/smoke`) que validan rutas y lógica por lectura de archivos. Falta un **E2E real por navegador** que pruebe la app viva como la usa un dentista: login email/password, ingreso a dashboard, creación de organización y acceso RLS según rol, corriendo **100% por CLI, headless**, desde `npx playwright test`.

Objetivo: montar **Playwright** (el estándar de la comunidad Supabase/Next para E2E) contra el entorno de producción dental.nexolabs.cloud, con una primera tanda de specs de humo que puedan correr en CI sin intervención humana.

**Referencia funcional existente (NO reescribir):**
- Login: `app/login/page.tsx` usa `<LoginForm />` (`app/login/login-form.tsx`) → POST `/api/auth/sign-in/email`, input `name="email"` + `name="password"`, botón submit, `role="alert"` para errores, `router.replace("/dashboard")` en éxito.
- Usuario demo de producción: `emilia.demo@nexodent.invalid` + **DEMO_PASSWORD** (el valor real NO está en el repo; está en el archivo de secrets de deploy). Email/password NO hardcodear — leer desde env.
- Rutas de referencia: `/login`, `/dashboard`, `/settings`, `/api/demo/sign-in`.

## Criterios de aceptación (todos obligatorios)

### 1. Instalar y configurar Playwright
- `npm i -D @playwright/test` + `npx playwright install chromium` (solo Chromium es suficiente para esta fase; evitar descargar Firefox/WebKit si no se usan para no inflar CI).
- Crear `playwright.config.ts` con:
  - `testDir: "e2e"`, `fullyParallel: false` (los tests de E2E sobre el mismo usuario demo deben correr serializados para no chocar sesiones).
  - `baseURL: process.env.E2E_BASE_URL ?? "https://dental.nexolabs.cloud"`.
  - Un proyecto `chromium` con `headless: true` por defecto.
  - `reporter: [["list"], ["html", { open: "never" }]]`.
  - `use: { trace: "retain-on-failure", screenshot: "only-on-failure" }`.
- Añadir script npm: `"test:e2e": "playwright test"`.
- Añadir `e2e` a tsconfig (mismo estilo que `tests/`) y a la config de ESLint si aplica, para que `npx tsc --noEmit` y lint cubran los nuevos specs.

### 2. Support: lectura de credencial demo desde env
- Helper en `e2e/fixtures/env.ts`: lee `E2E_DEMO_EMAIL` (default `emilia.demo@nexodent.invalid`) y `E2E_DEMO_PASSWORD` (obligatoria; si falta, fallar con mensaje claro antes de los tests — nunca imprimir el valor).
- NO hardcodear la password en ningún `.spec.ts`. Documentar en `.env.example` las nuevas variables `E2E_BASE_URL`, `E2E_DEMO_EMAIL`, `E2E_DEMO_PASSWORD`.

### 3. Specs de humo (primera tanda, `e2e/`)
**`e2e/login.spec.ts`**
- Login exitoso: ir a `/login`, llenar email/password demo válidos, submit, esperar navegación a `/dashboard` (esperar URL que contenga `/dashboard`).
- Login fallido: credencial inválida → assert del `role="alert"` visible y permanencia en `/login`.

**`e2e/dashboard.spec.ts`**
- Logged-in (loguin previo en `beforeEach` o storageState): el dashboard carga y muestra la UI esperada (un título/encabezado de referencia; verificar con un selector estable existente en `app/dashboard` — si no hay, usar un distintivo textual que ya exista; NO rediseñar nada).

**`e2e/org.spec.ts`**
- Crear/ver organización: entrada al flujo de settings/org de la app, crear una org de test (sufijo único por run para no chocar), verificar que aparece listada. Revertir/limpiar si es barato; si no, dejar constancia de que la org de test queda creada (nombre con sufijo `-e2e-<timestamp>`).

**`e2e/rls.spec.ts`** (acceso por rol)
- Probar que el acceso a datos queda acotado según rol del usuario demo (la demo es clínica `emilia.demo@nexodent.invalid`): verificar en la UI que puede ver su organización/clínica y que NO ve datos de otras orgs (redirigido o negado). Basarse en el comportamiento RLS ya implementado; NO esperar que el demo tenga rol admin — adaptar la assertion al rol real de la demo.

### 4. Ejecutable y estable
- Los 4 specs deben correr con `npx playwright test` (headless) contra `https://dental.nexolabs.cloud` usando la credencial demo.
- Añadir waits robustos basados en selectores/URL (automáticos de Playwright), NO `sleep` fijos.
- Dejar `e2e/` autocontenido y comentado en español.

## No hacer
- NO tocar lógica de la app, rutas, RLS, auth ni datos de producción fuera de crear/borrar la org de test (que ya se nominaliza como residual).
- NO imprimir ni loguear DEMO_PASSWORD, AUTH_SECRET ni ningún secreto.
- NO cambiar la estructura de `tests/` existente ni sus scripts Vitest.
- Texto en español chileno, tuteo.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. ESLint focalizado sobre `e2e/` + `git diff --check` OK.
3. `npm run build` OK (los specs no deben romper el build).
4. `E2E_DEMO_PASSWORD=<valor real del archivo de secrets> npx playwright test` → **todos los specs en verde** contra producción. Adjuntar la salida del reporter y confirmar que no haya secretos en logs/traces.
5. Reportar archivos creados/modificados + resultado real de la corrida (pass/fail por spec).

## Nota al gatekeeper (Hermes)
- Correr la suite y adjuntar el resultado; si un spec falla por selector estable, el gatekeeper valida si es selector a actualizar o bug real antes de devolver a Codex. NO devolver a Codex a menos que sea bug real.