# BRIEF-CODEX-36 — Fix: día activo en "Configurar Horarios de Trabajo" colapsa y oculta los horarios

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + Tailwind. Código en **español, tuteo** (nunca voseo).

## Contexto

En el diálogo **"Configurar Horarios de Trabajo"** (`components/settings/schedule-dialog.tsx` + su CSS en `app/globals.css`, clases `.schedule-*`), cuando un día queda **activo** (toggle encendido) y tiene horarios guardados, el bloque expandido del día (los períodos "Horario 1..N" con los inputs de hora y el botón "+ Agregar Horario") **se colapsa a unos pocos píxeles de alto**: las horas NO son visibles ni editables.

Reproducido contra producción (dental.nexolabs.cloud, sesión demo): usuario **Dr. Martín Lagos** tiene **2 horarios configurados de Lunes a Viernes**. Al abrir su diálogo, las tarjetas de Lunes a Viernes están activas pero sus bloques de períodos aparecen como una franja oscura aplastada (los inputs de hora quedan ocultos). Los días inactivos (Sábado, DomDomingo, "0 horarios") se ven bien.

## Causa raíz (CSS en `app/globals.css`)

El problema es de layout: la tarjeta del día usa `overflow: hidden` y vive dentro de un contenedor de scroll con rejilla `minmax(0, 1fr)`, así que el bloque expandido `.schedule-periods` **se recorta en vez de hacer crecer la tarjeta**. Verificado con geometría: el borde inferior del bloque expandido colisiona con la tarjeta siguiente (`clipped = true`) y el contenedor `.schedule-dialog-content` reporta `scrollHeight === contentHeight` (no genera scroll).

Reglas actuales relevantes (líneas 1954-1956, 1967-1968):
- `.schedule-dialog-content { display: grid; ...; overflow-y: auto; }`
- `.schedule-day-card { overflow: hidden; ...; }`
- `.schedule-periods { display: grid; gap: 0.75rem; padding: 0 1rem 1rem; }`
- `.schedule-period { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); ...; padding: 16px; }`

## Objetivo

Que al estar activo un día, su bloque de períodos se muestre **completo y visible** (header del horario, inputs "Hora de inicio"/"Hora de fin" con sus valores, y el botón "+ Agregar Horario" al final), y que si el total de tarjetas + períodos excede el alto del diálogo, el contenido sea **scrolleable** (scroll vertical funcional en el contenido del diálogo, nunca contenido recortado sin acceso).

## Criterios de aceptación (todos obligatorios)

1. Con un día activo y 2 períodos, el bloque expandido se dibuja a su altura natural: el header "Horario 1" + los dos inputs `time` (con valores 09:00–12:00 por defecto o los guardados) + botón "+ Agregar Horario" son **visibles en pantalla**, no recortados ni pisados por la tarjeta siguiente.
2. Si el alto total supera `max-height` del diálogo, aparece **scroll vertical** funcional dentro de `.schedule-dialog-content` (poder bajar y ver todos los días/períodos + pie con botones Cancelar/Guardar).
3. Los días inactivos siguen mostrando solo su header (tiempo) y no dejan la franja oscura residual.
4. Mantener estilos y paleta actuales (fondo `#050b14`/`#080e1a`/`#0a1220`, acento `#3b82f6`, bordes `#162235`, alturas 44px/70px etc.). NO rediseñar visualmente; solo arreglar la altura/overflow.

## No hacer
- NO tocar la lógica de datos ni la acción `saveProfessionalAvailability` (el guardado funciona).
- NO cambiar la estructura del TSX salvo lo mínimo imprescindible para el layout (primero intentar solo CSS; si hace falta marcado, justificarlo).
- NO afectar los otros diálogos (`patient-dialog`, `members-dialog`) — solo `.schedule-*`.
- Texto en español chileno, tuteo.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. ESLint focalizado + `git diff --check` OK.
3. `npm run build` OK.
4. Reproducir en local/dev o documentar el fix y confirmar con las clases `.schedule-*` que el contenedor expandido ya no colapsa (p. ej. `.schedule-periods` no queda restringido por `overflow: hidden` del padre si ese es el culpable, o el contenido del diálogo genera scroll real).
5. Reportar archivos tocados + qué cambio técnico se aplicó (CSS y/o TSX) y el motivo exacto del colapso.

## Nota al gatekeeper (Hermes)
- Validar visualmente contra producción con el usuario **Dr. Martín Lagos** (2 horarios L-V) tras el deploy, capturando el diálogo y confirmando horas visibles + scroll si aplica. NO devolver a Codex salvo que siga colapsando.