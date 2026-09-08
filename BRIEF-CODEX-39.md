# BRIEF-CODEX-39 — Ajustes al formulario "Nueva Ausencia" (período con conteo de días, horas en específico, radios lineales compactos)

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + Tailwind. Código en **español, tuteo** (nunca voseo).

## Contexto

El formulario "Nueva Ausencia" (`components/settings/absences-dialog.tsx` + clases CSS en `app/globals.css`) ya está desplegado y funciona (calendario de rango, tipo, duración, descripción, persistencia con RLS). Bryan pidió **tres ajustes visuales/UX** en el formulario:

1. **Panel "Período seleccionado": moverlo abajo** y que **indique la cantidad de días** del período (ej. "5 días de ausencia", "1 día de ausencia"), no solo las fechas.
2. **En "Horario específico": indicar desde qué hora comienza y hasta qué hora termina.**
3. **Los radios de duración ("Día completo" / "Horario específico"): en forma lineal (uno al lado del otro), compactos ("económicos") y con el mismo tamaño** para que se vean equilibrados visualmente.

## Estado actual (referencia)

En `AbsenceForm` (dentro de `absences-dialog.tsx`):
- `.absence-period` (icono calendario + `<strong>Período seleccionado</strong>` + `<p>` con el rango o placeholder "Selecciona el rango de fechas en el calendario") está **dentro de la columna derecha** (`absence-fields`), entre los radios/times y el textarea de descripción.
- Los radios están en un `<fieldset>` con clases `.absence-radios` (dos `<label>` apiladas en columna).
- Cuando `duration === "specific_hours"` se muestran `.absence-times` con dos `<label>`/inputs `time` ("Hora inicio" / "Hora fin").
- Layout general: `.absence-form-content` es grid de 2 columnas (`minmax(300px,.92fr) minmax(320px,1.08fr)`) con calendario a la izquierda y campos a la derecha; pie con Cancelar / Crear Ausencia.

## Cambios requeridos (obligatorios)

### 1. Contador de días en "Período seleccionado" + mover el panel abajo
- **Mover el bloque `.absence-period` fuera de la columna derecha**: debe quedar **debajo de todo el contenido del formulario**, ocupando todo el ancho (fila 2 del contenido, tras la grid de 2 columnas) — antes del footer de Cancelar/Crear Ausencia. Diseño de tarjeta informativa, misma paleta (fondo `#0a1220`, borde `#162235`, icono calendario `#3b82f6`).
- En el texto del panel, además del rango de fechas, **indicar la cantidad de días**: calcular `endsOn - startsOn + 1` (inclusivo). Texto: **"5 días de ausencia"** / **"2 días de ausencia"** / **"1 día de ausencia"** (singular cuando es 1).
  - Ejemplo visual: `Período seleccionado` → `2 de septiembre de 2026 – 4 de septiembre de 2026 · 3 días de ausencia`.
  - Con placeholder sin selección: el texto actual "Selecciona el rango de fechas en el calendario" se mantiene, sin contador.
- Regla con "Horario específico": como el rango queda restringido a un solo día (`starts_on = ends_on`), el contador será "1 día de ausencia"; ver punto 2.

### 2. "Horario específico": mostrar desde/hasta
- Cuando `duration === "specific_hours"`, además de los inputs de hora existentes, el panel "Período seleccionado" debe indicar el **rango horario**: desde `Hora inicio` hasta `Hora fin` (ej. "desde las 09:00 hasta las 13:00" o "09:00 – 13:00").
- Si aún no se eligieron las horas, mostrar el placeholder indicando que hay que definirlas.
- Los inputs `.absence-times` ya existen y no cambian; solo reflejar sus valores en el panel.

### 3. Radios de duración: lineales, compactos, iguales
- Cambiar `.absence-radios` de apilado vertical a **fila horizontal** (`display: flex` o grid 2 columnas iguales), con **ambas opciones del mismo ancho** (flex 1/1fr cada una) para que se vean parejas.
- Estilo compacto: cada opción como cápsula/segmento con borde (`#162235`), radio de 6px, padding vertical pequeño (~10px), texto centrado; la seleccionada con borde/accento `#3b82f6` y fondo tenue azul (ej. `rgba(59,130,246,.10)`).
- Tamaño de fuente 0.82–0.9rem; mantener el input radio funcional (accesible, focus-visible).

## No hacer
- NO tocar lógica de datos/persistencia ni el calendario ni las validaciones (solo presentación).
- NO cambiar la tabla `absences` ni acciones.
- Mantener paleta dark (fondos `#050b14`/`#080e1a`/`#0a1220`, acento `#3b82f6`, bordes `#162235`).
- Tuteo, español chileno.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. ESLint focalizado + `git diff --check` OK.
3. `npm run build` OK.
4. Archivos tocados + cómo quedó el layout (describir la nueva posición del período y los radios).

## Nota al gatekeeper (Hermes)
- Validar visualmente en producción (Chromium real) tras deploy: seleccionar rango de 3 días → panel abajo con "3 días de ausencia"; modo "Horario específico" → desde/hasta; radios lineales equilibrados.