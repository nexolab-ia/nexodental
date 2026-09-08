# BRIEF-CODEX-37 — Fix definitivo: colapso del bloque de horarios al activar un día (previa 36 insuficiente)

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + Tailwind. Código en **español, tuteo** (nunca voseo).

## Contexto / Por qué el brief 36 no resolvió

El brief anterior (BRIEF-CODEX-36) completó la cadena de altura del diálogo (`.schedule-dialog-form height:100%`, `.schedule-dialog-content min-height:0` + `overflow-y:auto`) y quedó deployado, pero **el bug persiste** en producción. La verificación con Chromium real sobre el usuario **Dr. Martín Lagos** (2 horarios L-V) muestra que el bloque expandido del día activo sigue **clipado/invisible**: las filas de los días quedan fijas en **~86px** aunque el contenido interno (`schedule-periods`) necesita ~383px.

## Diagnóstico raíz exacto (inspección de CSS computado en producción)

Se inspeccionó el estado real del DOM/CSS tras el deploy:

- `.schedule-dialog-content`: `display: grid`, `overflow-y: auto`, `min-height: 0`, altura 685px, **`scrollHeight === clientHeight` (685 === 685) → NO genera scroll**.
- `grid-template-rows` resuelto: `86.67px 86.67px 86.67px 86.67px 86.67px 72px 72px` → **cada tarjeta de día se aplasta a ~86px**, ignorando su contenido expandido.
- `.schedule-day-card`: `overflow: hidden`, altura 86px. Su hijo `.schedule-periods` (necesita ~383px) **desborda la tarjeta y es recortado por `overflow: hidden`**.
- `.schedule-period`: `height: 150px`, `overflow: visible` (no es el que recorta).
- `.schedule-periods`: `style overflowY: visible`.

**Causa del colapso:** el contenido de los días activos NO puede hacer crecer su fila de la grid (las filas quedan fijas a la altura de un día contraído ~86px), y como la tarjeta tiene `overflow: hidden`, todo lo que sobresale se corta. Encima, al estar todo confinado a 685px sin que `scrollHeight` crezca, tampoco hay forma de scrollear para verlo.

## Objetivo

Que cada tarjeta de día **crezca a la altura natural de su contenido** cuando está activa (mostrando completos: header del horario, inputs "Hora de inicio"/"Hora de fin" con valores, y botón "+ Agregar Horario"), y que si el total de días+períodos excede el alto del diálogo, el contenedor `.schedule-dialog-content` **genere scroll vertical real** (`scrollHeight > clientHeight`).

## Cómo abordarlo (orientativo, no excluyente)

- Las tarjetas deben dejar de contraerse a 86px fijos: asegurar que las filas de `.schedule-dialog-content` usen su **contenido natural** (p. ej. `grid-auto-rows: auto` / remover lo que fuerce filas rígidas) en vez de aplastar al mínimo.
- **Quitar o relajar el `overflow: hidden` de `.schedule-day-card`** si es lo que recorta el bloque expandido (probablemente sea la causa directa del clip visual del períodos). Alternativa: quitar `overflow:hidden` de la tarjeta del día (mantener solo el radio del borde) y dejar el scroll en el contenedor padre.
- Mantener la cadena de altura correcta (no revertir el 36): `.schedule-dialog` con altura limitada, `.schedule-dialog-form height:100%` grid `auto minmax(0,1fr) auto`, `.schedule-dialog-content min-height:0` con `overflow-y:auto`.
- Verificar que con 7 días y varios expandidos el contenido **sí** reporte `scrollHeight > clientHeight` y se pueda scrollear hasta ver el pie (Cancelar / Guardar Horarios).

## Criterios de aceptación (todos obligatorios, verificar en el navegador real)

1. Con Dr. Martín Lagos (2 horarios L-V): el bloque de cada día activo muestra **completo y visible** el header "Horario N" + los dos inputs `time` con sus valores (09:00 / 18:00) + botón "+ Agregar Horario". Nada recortado por la tarjeta.
2. La fila del día activo crece a la altura del contenido (NO ~86px fijos).
3. Si el total supera el alto del diálogo, `.schedule-dialog-content` genera **scroll vertical real** con el pie siempre accesible.
4. Días inactivos siguen compactos (solo header), sin franja residual.
5. Paleta/estilos intactos (fondo `#050b14`/`#080e1a`/`#0a1220`, acento `#3b82f6`, bordes `#162235`).

## No hacer
- NO tocar lógica, datos ni `saveProfessionalAvailability`.
- NO afectar `patient-dialog` ni `members-dialog` — solo `.schedule-*`.
- No revertir el trabajo del 36; construir sobre él.
- Tuteo, texto en español chileno.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. ESLint focalizado + `git diff --check` OK.
3. `npm run build` OK.
4. Para validar el layout sin necesidad de la UI, comprobar que `.schedule-dialog-content` en el estado expandido reporta `scrollHeight > clientHeight` (o que las filas no quedan a 86px fijos) — describe qué cambiaste y por qué eso elimina el corte.
5. Reportar cambio técnico exacto y archivos tocados.

## Nota al gatekeeper (Hermes)
- Validar visualmente contra producción con Dr. Martín Lagos tras el deploy (Chromium real + fuentes). Confirmar horas visibles + scroll. Si sigue colapsando, devolver con el nuevo estado de CSS computado (gridTemplateRows, overflow, scrollHeight/clientHeight).