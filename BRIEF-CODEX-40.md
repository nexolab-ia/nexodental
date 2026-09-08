# BRIEF-CODEX-40 — Fijar consistencia de diseño según DESIGN.md (dashboard): acentos, data fantasma, micro-detalles

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + CSS en `app/globals.css`. Código en **español, tuteo** (nunca voseo).

## Contexto

Se creó `DESIGN.md` en la raíz del repo: sistema de diseño obligatorio del proyecto (paleta, 1 acento, semántica de color, sin data fantasma, estados vacíos, es-CL, tuteo). Este brief aplica sus reglas al **dashboard** (`app/(app)/dashboard/page.tsx` + clases en `app/globals.css`) para eliminar las inconsistencias detectadas en la auditoría visual.

**Lee `DESIGN.md` primero y respétalo.**

## Diagnóstico (verificado contra producción)

1. **Gráfico con data fantasma (regla 2.3 del DESIGN.md):** el sparkline de "Ingresos del día" (`panel-body` → `<svg className="sparkline">`) renderiza barras aunque todos los valores sean $0: usa `Math.max(2, p.totalClp/max*52)` que fuerza `<rect height=2>` y barras visibles cuando no hay ingresos. Con `income.collectedClp = 0` se dibujan barras cian falsas + el total dice $0 → contradicción visual.
2. **Doble acento en la tarjeta "Ingresos del día" (KPI vs panel):** el KPI superior usa `accent-value` (= `var(--success)` verde) para el monto, y el panel derecho "Ingresos del día" usa `income-total` (blanco). El valor del panel abajo también blanco, para compararse igual, y la mini-lista usa `success-text` verde en pagos. **Regla DESIGN.md 2.1/2.2:** un solo acento de acción (cian) y verde SOLO como semántico de dinero. Decisión: **verde = semántica de dinero** está permitido por el DESIGN.md (solo monetario/OK); lo que NO puede pasar es que el mismo monto en dos tarjetas use colores distintos.
3. **`max` dividido por cero/ref seguro:** `Math.max(1, ...)` está bien, pero el `height=Math.max(2,...)` maquilla el 0. El arreglo debe venir de NO renderizar el gráfico cuando no hay datos.
4. **Repetición de copy "Sin referencia" (regla 4/5):** la sección "Salud de clínica" repite el sufijo "Sin referencia" en varias métricas con valor `—`/`$0`. Reemplazar por una sola línea de estado o texto variado por métrica (ej. "Aún sin datos de asistencia", "Sin pagos este día", "Sin pacientes nuevos").
5. **Contraste de botones chicos:** el botón "Ver fecha" y CTAs pequeños dentro de tarjetas deben mantener `min-height` accesible (≈40px) y contraste AA (el cian #22d3ee sobre fondo oscuro con texto `--ink` está ok; verificar los hover).

## Cambios requeridos (todos obligatorios)

### A. Sparkline sin data fantasma
- Si `income.skyline` no existe o todos los `totalClp` de los últimos 7 días son 0 (o `collectedClp === 0`), NO renderizar el `<svg>`. En su lugar mostrar un estado vacío compacto: icono + "Aún no hay pagos registrados" (ya existe `Empty` en la lista de movimientos; usarlo también para el gráfico, o una variante pequeña sin CTA).
- Si hay datos, mantener el sparkline actual (barras cian `--accent`).
- NO usar `Math.max(2, ...)` como mínimo artificial cuando el valor es 0; el render está condicionado por datos reales.

### B. Unificar color del monto de ingresos
- En el KPI superior "Ingresos del día": mantener el monto en **verde `--success`** SOLO si es > 0; si es 0 o el rol no tiene finanzas, color `--ink` (blanco) como el resto de KPIs. La clase `accent-value` debe aplicarse condicionalmente (o introducir `money-value` y usarla SOLO cuando hay plata).
- En el panel derecho "Ingresos del día": `income-total` en verde `--success` cuando `collectedClp > 0`, blanco cuando es 0. Así ambos lugares muestran la misma semántica.
- Los `success-text` de pagos en la mini-lista se mantienen (verde = dinero, correcto).

### C. Copy de "Salud de clínica"
- Reemplazar el sufijo repetido "Sin referencia" por textos distintos y reales (ver diagnóstico 4). Mantener el tono: español chileno, tuteo, sin em-dash.

### D. Fecha
- NO tocar `<input type="date">` (usa formato del navegador, es correcto). Verificar que todos los textos derivados de `dateLabel`/`localTime` usen `es-CL` (ya lo hacen) y que no haya `en-US` escondido en el dashboard.

## No hacer
- NO tocar lógica de datos ni de roles (permisos finanzas quedan igual).
- NO rediseñar layout, ni KPIs, ni la agenda del día.
- NO cambiar `app/globals.css` fuera de lo necesario para estos casos (clases `.sparkline`, `.accent-value`, `.income-total`, copy del dashboard).
- NO tocar otras páginas (agenda, reportes, settings) en este brief — su auditoría va después.
- Tuteo, sin em-dash, sin emoji.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. ESLint focalizado + `git diff --check` OK.
3. `npm run build` OK.
4. Describir el cambio exacto (qué condicionales quedaron para sparkline y colores).
5. Reportar archivos tocados.

## Nota al gatekeeper (Hermes)
- Tras deploy, validar en Chromium real con la demo: dashboard con $0 → NO debe verse sparkline con barras, "Ingresos del día" sin doble color, copy variado en Salud de clínica. Y/o insertar datos de prueba vía BD para ver el sparkline con valores (barras cian + montos verdes) — si es barato, hacerlo y confirmar ambos estados.