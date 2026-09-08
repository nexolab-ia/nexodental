# BRIEF-CODEX-34 — Pulir CSS del diálogo de configuración de horarios

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, stack Next.js + Tailwind. Código en **español, tuteo** (nunca voseo).

## Contexto

El feature de agenda (BRIEF-CODEX-33) ya está deployado y la estructura es correcta. El cliente considera que el **estilo se ve desordenado**. Tiene un mock de referencia limpio (dark navy, acento azul `#3b82f6`) que hay que replicar.

**Archivo principal a modificar:** `app/globals.css` (clases `.schedule-*`).
**Archivo complementario (solo si hace falta mover el botón de quitar):** `components/settings/schedule-dialog.tsx`.

## Criterios de aceptación (todos obligatorios)

Ajustar el CSS de las clases `.schedule-*` para que el diálogo coincida pixel a pixel con el mock de referencia:

### Paleta exacta
- Fondo contenedor principal (card dia): `#050B14` a `#080E1A`. Actual usa `#0d1423` → oscurecer.
- Acento azul: `#3b82f6` (toggle activo y badge del día).
- Texto primario: `#FFFFFF`; texto secundario/muted: `#8A99AD`.
- Bordes: `#162235`. Radios: 6px (supportes y inputs 4-6px).
- Fondo icono reloj: `#162235`/`#131D2E` con icono blanco/gris claro.

### Header del día
- Badge con inicial: 36×36px, radio 4px, fondo `#3b82f6`, letra blanca bold 700.
- Título día: blanco, ~16-18px, bold. Subtítulo ("N horario(s) configurado(s)"): `#8A99AD`, 12-13px, regular.
- Toggle: píldora 44×24px, track `#3b82f6` cuando activo, thumb blanco 20px.

### Bloque "Horario N"
- Card interno: borde `#162235`, radio 6px, padding 16px, fondo más claro (`#0A1220`).
- Cabecera: icono reloj (32×32, fondo `#162235`, radio 4px) + título "Horario N" blanco semibold.
- Inputs de hora: dos columnas 1fr/1fr lado a lado, gap 16px. Labels ("Hora de inicio"/"Hora de fin") blancos 12-13px arriba de cada input, margin-bottom 6px. Input: fondo `#050B14`, borde `#162235`, radio 4px, padding 10px 14px, texto blanco 14px.

### Botón quitar horario (fix del "desorden")
- SACAR el botón ✕ flotante posicionado con `position: absolute; inset-block-start: -1.55rem` (se monta fuera del card y se ve roto).
- Reacomodar como icono suave (✕/trash) **dentro** de la cabecera del bloque "Horario N", alineado a la derecha, gris `#8A99AD`, hover blanco. No debe salirse del contenedor.

### Botón "Agregar Horario"
- Cambiar de borde **punteado** (dashed) a **outline sólido**: `border: 1px solid #162235`, fondo transparente, texto `#FFFFFF` (no azul claro `#93c5fd`), full-width, ~40-44px de alto, icono `+` + "Agregar Horario".

### Inputs de hora (critico para "orden")
- Asegurar `color-scheme: dark` y altura consistente; los dos selects `time` de una fila deben quedar **exactamente iguales** en alto/ancho.

## No hacer
- NO cambiar lógica, acciones, RLS ni el guardado de datos (`site_id = NULL` queda igual).
- NO tocar otros módulos ni archivos fuera de `schedule-dialog`/`globals.css`.
- Texto en español chileno, tuteo.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. ESLint focalizado + `git diff --check` OK.
3. `npm run build` OK.
4. Verificar con grep que no quede ningun `schedule-remove` con `position: absolute` fuera del card y que no quede dash en `.schedule-add-period`.
5. Reportar archivos tocados + resultado del build.