# BRIEF-CODEX-62 — Organización 1:1 con cimaos: quitar botones de guardar y auto-guardar los campos

**Fecha:** 2026-09-10
**Tipo:** Cambio de UI + comportamiento (código) para replicar cimaos
**Repo:** nexolab-ia/nexodental (rama main)

## Contexto / decisión de Bryan

Bryan aprobó el realineo de medidas del BRIEF-CODEX-61 (header 48, sidebar 208, tarjeta 1664×432, logo 100×100, etc.) y decidió: **"Déjala como Cimaos"**.

La referencia (**cimaos**, `docs/referencias/organizacion-template-cimaos-1920.jpg`) **NO tiene botones de guardar** en ninguna de las dos tarjetas: el header de cada tarjeta es solo (icono + título + subtítulo) y la derecha queda vacía. La tarjeta "Horarios de Atención" son solo header + 2 campos.

Hoy en NexoDental hay dos botones ("Guardar cambios" al pie de la tarjeta 1 y "Guardar horario" en el header de la tarjeta 2, agregado en el 61), lo que rompe la paridad con cimaos.

## Cambios requeridos

### 1. Quitar los botones visibles de guardar en la pantalla Organización

En `app/(app)/settings/organizacion/page.tsx`, **elimina ambos bloques** `<div className="settings-card-actions">…</div>` (el de "Guardar cambios" de la tarjeta "Información de la clínica" y el de "Guardar horario" de "Horarios de Atención").

Consecuencia esperada: el header de cada tarjeta queda solo con (icono + título + subtítulo) y el cuerpo solo con sus campos, tal como cimaos. Las alturas deben quedar en las del spec: tarjeta "Información de la clínica" ~432px, tarjeta "Horarios de Atención" ~155px. Como el contenido ahora define la altura natural, **elimina las alturas fijas hardcodeadas** agregadas en el 61 que quedaron pensadas para el layout con botón (`.organization-profile-card { height: 432px }`, `.organization-schedule-card { height: 155px }`, y los `position:absolute` del `.settings-card-actions`) — dejando que la tarjeta mida lo que mide el contenido (header 65px + padding 16px + campos), que es como cimaos. Verifica que el resultado sea ≈432 y ≈155 respectivamente; si el contenido natural no llega, ajusta espaciados (no agregues relleno decorativo vacío).

Limpia también el CSS que quedó muerto por este cambio (reglas de `.organization-*-card .settings-card-actions` y del botón dentro de Organización que ya no aplican), en `app/globals.css`.

### 2. Auto-guardado de los campos (sin botón)

Como no hay botón, los formularios deben **guardarse automáticamente**. Implementa un auto-save discreto:

- Al **cambiar** cualquier campo del formulario (evento `change`: se dispara al salir del campo en inputs de texto y al instante en `select`/`input[type=date|time|email|tel]`), enviar automáticamente el formulario correspondiente a su server action (`updateOrganizationProfile` / `updateOrganizationSchedule`).
- Aplica un pequeño **debounce** (p. ej. 400-600 ms) para no disparar en cada tecleo.
- Muestra un **indicador transitorio, discreto y sobrio** en la esquina derecha del header de la tarjeta: "Guardando…" mientras envía y "Guardado ✓" (o similar) al completar, con color `--muted`/`--success` según corresponda, tamaño ~12px. Debe **desaparecer solo** a los ~2 s. No debe quedar un control permanente (para que el header quede como cimaos, vacío en reposo). Respeta `prefers-reduced-motion`.
- Respeta el diseño: un solo acento cian, verde solo para el OK de guardado (semánticamente "correcto"), sin emojis en la UI (usa un SVG chico de check, no "✓" como emoji si el repo no usa emojis; revisa el estándar del repo).
- Si el guardado falla, mostrar un aviso discreto (muted/danger) y NO perder lo escrito.

Sugerencia de implementación: un componente cliente reutilizable `components/settings/auto-save-form.tsx` que envuelva a los children en el `<form action={action}>` y haga `form.requestSubmit()` en el `change` (con debounce) + el indicador de estado. `page.tsx` sigue siendo server component y usa este wrapper para ambos formularios. Mantén intactas las server actions y su validación (required, longitudes, teléfono, etc.).

**Restricciones:**
- Código y comentarios en español, tuteo (NUNCA voseo).
- No tocar los botones de guardar de OTRAS pantallas de settings (Plan, Usuarios, Notificaciones, etc.): solo la pantalla Organización.
- No cambies la validación del servidor ni el esquema de datos.
- No rompas mobile (<767px) ni el punto intermedio (768-1099px).
- Respeta `DESIGN.md` y los tokens existentes. Sin em-dash en copy visible.
- NO hagas commit.

## Verificación

1. `npm run build` + tsc OK.
2. En la pantalla Organización, a 1920×873, no debe haber ningún botón de guardar visible; header de tarjeta solo con icono+título+subtítulo; tarjeta 1 ≈432px y tarjeta 2 ≈155px.
3. Editar un campo y salir de él debe guardar (persistir) y mostrar el indicador transitorio. Recargar y verificar que el dato persistió.
4. `git diff` acotado a `app/(app)/settings/organizacion/page.tsx`, `components/settings/auto-save-form.tsx` (nuevo) y `app/globals.css`.

Entrega el diff sin commit para revisión del gatekeeper.