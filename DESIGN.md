# DESIGN.md — NexoDental (sistema de diseño de producto)

> Reglas obligatorias de diseño para TODO trabajo en este repo. Los briefs (BRIEF-CODEX-N) DEBEN cumplir esto. Basado en la skill taste-skill (design-taste-frontend) aplicada a product UI / dashboard clínico.

## 1. Design read (contexto fijo)

**Producto:** dashboard SaaS clínico dental (product UI, no landing page).
**Audiencia:** clínicas dentales chilenas, uso diario operativo, pantalla de escritorio + mobile.
**Lenguaje:** dark-tech sobrio, trust-first (datos de salud = contexto regulado, Ley 21.719).
**Nota taste-skill:** las reglas de landing (hero, marquee, bento, GSAP) NO aplican a este repo. Aplican: consistencia sistémica, tipografía, estados completos, anti-slop de datos, accesibilidad.

## 2. Tokens (mapeo a globals.css `:root`)

Solo usar tokens CSS existentes. NO inventar colores fuera de esta paleta:

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0b1120` | fondo general |
| `--surface` | `#111a2e` | tarjetas/contenedores |
| `--surface-2` | `#1a2740` | hover/elevación |
| `--ink` | `#f1f5f9` | texto primario |
| `--muted` | `#94a3b8` | texto secundario |
| `--accent` | `#22d3ee` | **ÚNICO acento de acción** |
| `--accent-strong` | `#06b6d4` | hover del acento |
| `--success` | `#34d399` | SOLO semántico de dinero/positivo |
| `--warning` | `#fbbf24` | SOLO avisos/estado pendiente |
| `--danger` | `#f87171` | SOLO errores/destructivo |
| `--border` | `#243249` | bordes |
| `--radius` | `14px` | tarjetas |

### Reglas de color (obligatorias)
1. **UN solo acento**: `--accent` (#22d3ee) para TODA acción/CTA/link/tab activo/avatar. Prohibido usar verde, azul-añil o cian-otro como acento de acción.
2. **Semántica estricta**: verde (`--success`) únicamente para valores monetarios positivos y estados OK; amarillo para pendientes/avisos; rojo para errores/destructivo. No usar verde ni amarillo como decoración.
3. **Sin data fantasma**: un gráfico/barra/progreso con valor 0 NO dibuja barras ni segmentos. Si el dato es 0 o vacío, mostrar estado vacío, no visualización decorativa (aplica a gráficos, barras de progreso, sparklines).
4. **Formato de fecha en es-CL** en toda la UI (dd/mm/aaaa o texto "lunes, 7 de septiembre de 2026"). Prohibido MM/DD/YYYY americano.
5. Light mode (`[data-theme="light"]`): mantener jerarquía equivalente (acento hue ajustado, misma semántica).

## 3. Tipografía

- Display/encabezados: `var(--font-display)` (Space Grotesk).
- UI/body/labels: `var(--font-ui)` (Inter).
- Números/IDs/fechas tabulares donde aplique: `var(--font-mono)` (JetBrains Mono) o `font-variant-numeric: tabular-nums`.
- Escala: H1 ~30px bold display; tarjetas 15-16px; labels/copy auxiliar 12-13px `--muted`. Mantener la escala existente; no inflar títulos.
- Tuteo, español chileno. Sin em-dash (—) en copy visible; usar punto/comma/paréntesis (regla taste-skill, se aplica a todo texto visible).

## 4. Layout y componentes

- Radios: `--radius` (14px) en tarjetas/contenedores; inputs/botones 6-10px; pills 999px. Sistema documentado, no mezclar a la vez.
- Cards: usar cuando la elevación comunica jerarquía; si se agrupa contenido plano, usar `border-t`/espacio, no tarjetas en tarjetas.
- Botones: altura mínima 42-44px; labels de UNA línea en desktop (sin wrap); contraste texto/fondo WCAG AA (4.5:1). Estados completos: default, hover, `:active` (scale .98), disabled, loading (skeleton).
- Estados vacíos: SIEMPRE con icono + texto + **CTA accionable** ("Crear primera cita", "Registrar pago", "Invitar usuario").
- Inputs: label ARRIBA del campo, borde `--border` visible (nunca input invisible sobre la tarjeta), error debajo del campo, placeholder legible, focus ring `--accent`.
- Diálogos: patrón `<dialog>` nativo + `showModal`, backdrop oscurecido, sticky footer. Ya estándar en el repo (schedule/absences/members) — mantener.
- Densidad: dashboard clínico real = usar el espacio; evitar 85% de pantalla vacía en vistas con datos (agenda, reportes). Si no hay contenido para llenar, proporcionar estados vacíos ricos, no vacío plano.

### 4.1 Shell de Configuración y pantalla Organización (spec 1920×873)

Paridad 1:1 con la referencia **cimaos** (`docs/referencias/organizacion-template-cimaos-1920.jpg`). Medidas obligatorias (viewport 1920×873, DPR 1), implementadas en `app/globals.css` dentro de `.app-compact` y `@media (min-width: 1100px)`:

- **Topbar:** alto 48px; padding horizontal 16px; ítems de nav 32px de alto, gap 4px.
- **Sidebar (nav de Configuración):** ancho 208px (13rem); padding 8px; borde derecho 1px. Títulos de grupo 24px (12px uppercase, padding 4px 12px); ítems 32px (padding 6px 12px); activo fondo `#202a3a`, radio 6px.
- **Contenido:** empieza en x:208 con padding 24px (contenido útil 1664px). Título 16px semibold (alto 24px); subtítulo 12px; enlace "Ayuda" alineado a la derecha.
- **Tarjeta:** bordes `#202a3a`, radio 8px, fondo `#101827`. Header de 65px (padding 12px 16px, borde inferior). Cuerpo con padding 16px. Separación entre tarjetas 24px.
- **Tarjeta "Información de la clínica":** 1664×432px. Logo/imagen 100×100px (radio 8px). Formulario en 2 columnas de 807px (gap 16px). Bloque label+input de 56px (gap 8px); inputs 36px de alto, padding 4px 12px, 14px / line-height 20px.
- **Tarjeta "Horarios de Atención":** 1664×155px. Dos campos (apertura/cierre) en 2 columnas de 807px.
- **Sin botones de guardar (patrón cimaos):** las tarjetas NO muestran botón de guardar. Los formularios de esta pantalla **auto-guardan** al cambiar/salir de cada campo (debounce ~400-600ms) con un indicador transitorio y discreto ("Guardando…" / "Guardado") que desaparece solo (~2s). El header de la tarjeta queda vacío a la derecha en reposo. Otras pantallas de settings conservan sus botones.

## 5. Métricas y datos

- Números con formato CLP (`$ 0`, `$12.500`), separador de miles y `.` decimal donde aplique.
- KPIs con valores reales; si el dato viene vacío, mostrar 0 o "—" según convención de la tarjeta y NUNCA inventar valores visuales (barras/gráficos) para el 0.
- Leyenda textual bajo métricas con referencia clara; evitar texto repetido "Sin referencia" en toda columna (variar o eliminar).

## 6. Anti-slop (prohibiciones concretas)

- Nada de gradientes morados/neón, glow genérico, glassmorphism decorativo en dashboard.
- Nada de interminables micro-animaciones; micro-motion SOLO funcional (feedback táctil `:active`, skeletons en carga, transición de diálogos). Respetar `prefers-reduced-motion`.
- Sin emoji en UI; iconos inline SVG del set existente del repo (mismo stroke, ~1.8).
- Sin copy vago tipo "Disponible pronto" en funcionalidad real; reemplazar por la función o quitar el control.
- Sin datos de demostración confundidos con reales en producción (los "dato ficticio" de la agenda demo son aceptables SOLO con la marca visible de demo).

## 7. Verificación de briefs (checklist que el gatekeeper aplica)

- [ ] Un solo acento (#22d3ee) en acciones; verde solo monetario/OK.
- [ ] Sin barras/gráficos con valor 0 (estado vacío en su lugar).
- [ ] Fechas en es-CL.
- [ ] Estados vacíos con CTA.
- [ ] Inputs con borde visible y label arriba.
- [ ] Botones 44px, una línea, contraste AA.
- [ ] Tuteo, sin em-dash.
- [ ] `npm run build` + tsc OK.
- [ ] Validación visual en Chromium real contra producción antes de cerrar.

## 8. Referencias

- Tokens: `app/globals.css` (`:root`, `[data-theme="light"]`).
- Patrón de diálogo: `components/settings/absences-dialog.tsx`, `schedule-dialog.tsx`.
- Skill de origen: `design-taste-frontend` (taste-skill v2), aplicada con la sección "OUT OF SCOPE" de la skill (product UI, no landing).