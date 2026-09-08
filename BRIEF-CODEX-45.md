# BRIEF-CODEX-45 — Agenda: vista Global (todos), selector de box con búsqueda, y Leyenda de Estados

**Rama/entorno:** `main`, repo `nexolab-ia/nexodental`, Next.js + CSS en `app/globals.css`. Código en **español, tuteo** (nunca voseo), fechas es-CL, zona Chile. Respeta `DESIGN.md`.

## Contexto

La agenda ("Mi Calendario", `/agenda`) tiene hoy las vistas **Día** y **Semana** con toggle Profesional/Box y `Global` deshabilitado. Este brief agrega 3 features pedidas por el usuario (según capturas del diseño objetivo):

1. **Vista Global**: muestra **TODOS los profesionales como columnas/lanes juntos** (visión completa de la clínica) en el día o semana, conservando el toggle **Profesional/Box** para decidir si las columnas son los profesionales o los boxes.
2. **Selector de box con búsqueda**: cuando la vista por Box, el selector es un **combobox** donde se escribe para **filtrar los boxes ingresados** (de la tabla `boxes`) y se puede elegir cualquiera.
3. **Leyenda de Estados**: un panel (junto al grid, lado derecho de la barra de fecha o como columna) que describe el significado de los colores de las citas: **Agendada, Agendada Online, Confirmada, Cancelada, No asistió, Bloqueado**.

## Estado actual (verificado en código)

- `features/scheduling/agenda-client.tsx`: `type View = "day" | "week"`; `filterMode: "professional" | "box"`. El botón "Global" está `aria-disabled disabled title="Próximamente"`. El selector (`<label className="agenda-selector">`) es un `<select>` simple: para profesionales muestra avatar + opciones; para boxes solo opciones (sin búsqueda).
- El grid se construye con `days.map(...)` y una columna/lane por día. En día = 1 lane, en semana = 7 lanes del mismo profesional/box.
- Citas: `AgendaAppointment` (`agenda-queries.ts`) expone `kind, status, patientName, startsAt, endsAt, sessionTypeName` y ahora `source` y `attendance` deben sumarse (ver mapeo).
- **Columnas de appointments en BD** (verificado): `status` enum (`pending|confirmed|cancelled`), `kind` enum (`appointment|block`), `source` varchar (`internal|public`), `attendance` varchar (nullable, `attended|missed`). Todo disponible para pintar la leyenda.

## Mapeo de la Leyenda de Estados (obligatorio, exacto)

| Leyenda | Significado | Condiciones en datos |
|---|---|---|
| **Agendada** | Cita creada, sin confirmar | `kind='appointment'` AND `status='pending'` AND `source='internal'` |
| **Agendada Online** | Cita creada desde agenda online | `kind='appointment'` AND `status='pending'` AND `source='public'` |
| **Confirmada** | Cita confirmada | `kind='appointment'` AND `status='confirmed'` |
| **Cancelada** | Cita cancelada | `status='cancelled'` (ver Nota) |
| **No asistió** | Paciente no asistió | `kind='appointment'` AND `attendance='missed'` |
| **Bloqueado** | Bloqueo de agenda | `kind='block'` |

**Nota Cancelada:** la query de agenda hoy filtra `status <> 'cancelled'` (no carga canceladas). Para que la leyenda tenga sentido en el grid, decidir: (a) mostrar la leyenda completa aunque las canceladas no se pinten (la leyenda documenta el sistema), o (b) empezar a incluir canceladas atenuadas en el grid. **Decisión sugerida: (b) incluir citas canceladas en el grid con estilo atenuado/rojo** para que la leyenda "Cancelada" tenga correspondencia visual; cambiar la query para traerlas (con `status='cancelled'` incluidas) y pintarlas `.is-cancelled`. Si prefieres no pintarlas, dejar la leyenda igualmente (solo documental). Documentar la elección.

Colores (estilo de la imagen, respetando DESIGN.md semántica de color y SIN inventar sobre la paleta; estos son estáticos de estado, no acento de acción):
- Agendada: azul (`#3b82f6`).
- Agendada Online: púrpura/`#8b5cf6`.
- Confirmada: verde `--success` (#34d399).
- Cancelada: rojo `--danger` (#f87171).
- No asistió: naranja `--warning` (#fbbf24).
- Bloqueado: patrón rayado (CSS `repeating-linear-gradient` gris).

## Cambios requeridos (todos obligatorios)

### A. Modelo de datos para el grid
- En `AgendaAppointment` (`agenda-queries.ts`) añadir `source: string` y `attendance: string | null` al SELECT (y al tipo).
- Decidir el manejo de canceladas (Nota) y ajustar la query: si se pintan, quitar `AND status <> 'cancelled'` o traerlas con un flag; de lo contrario dejar el filtro. Documentar.
- En la query de profesionales/boxes, no hay cambio (boxes ya cargados `active`).

### B. Vista Global (todos los profesionales/boxes) en `agenda-client.tsx`
- Extender `type View = "day" | "week" | "global"`.
- Habilitar el botón "Global" (`changeView("global")`), quitando disabled.
- **Comportamiento:** la vista Global muestra **todos** los profesionales (si `filterMode=professional`) o **todos** los boxes (si `filterMode=box`) como **lanes paralelos** en el día o semana:
  - En **día Global**: N columnas (una por profesional/box activo), cada una con su `day-heading` (nombre del profesional/box) y su lane de citas, todas comparten el mismo eje horario.
  - En **semana Global**: N×7 lanes (matriz), o en su defecto N filas, cada fila = profesional/box con sus 7 días y sus citas. **Seleccionar una implementación razonable que se vea bien**: sugerencia N filas (una por profesional/box), cada fila con 7 columnas de día; el grid se hace scrollable vertical + horizontal.
  - Las citas visibles en Global = **todas** las del rango (sin filtro por selección individual), pintadas en su lane según `professionalMembershipId`/`boxId`.
  - El selector de profesional/box individual sigue visible pero en Global no filtra (o queda oculto/deshabilitado, indicando que se muestran todos); sugerencia: ocultarlo o dejarlo deshabilitado con tooltip "En Global se muestran todos".
- `navigate/selectDate/days` con "global" usan la misma aritmética (semana ancla al lunes).
- La línea "ahora" se pinta en cada lane del día correspondiente.

### C. Combobox de box con búsqueda
- Cuando `filterMode === "box"`, reemplazar el `<select>` actual por un **combobox** con entrada de texto que filtra los boxes `boxes` por nombre (case-insensitive) a medida que se escribe, mostrando la lista filtrada de los boxes ingresados + opción de elegir cualquiera.
- Mantener seleccionado el box actual; al elegir uno, `setSelectedBoxId`. Si no se selecciona ninguno (lista vacía), mostrar sugerencia de crear/ninguno.
- Accesible (`role="combobox"`, `aria-*`, lista de sugerencias). No requiere librería.

### D. Leyenda de Estados
- Renderizar un bloque **"Leyenda de Estados"** (título exacto) junto al grid (lado derecho de la barra de fecha `.agenda-datebar`, o como panel bajo/escudo la barra; decidir el mejor lugar: sugerencia un `<aside>` compacto entre la barra de fecha y el grid). Icono de información opcional.
- Lista de 6 ítems, cada uno con un **swatch** (cuadro de color/patrón del mapeo) + su **label exacto**: Agendada, Agendada Online, Confirmada, Cancelada, No asistió, Bloqueado.
- Coherente con el pintado real de citas (los `is-*` estados del grid deben usar esos colores). Si hoy el grid usa otros (ej. `.is-pending` warning), **ajustar el grid para que coincida con la leyenda** (Agendada azul, Online púrpura, Confirmada verde, No asistió naranja, Bloqueado rayado, Cancelada rojo). Revisar el CSS actual `.agenda-appointment.is-pending/.is-block` y re-mapear.

### E. Estilo (DESIGN.md)
- Clases nuevas: `.agenda-day-heading` reutilizable para nombre de profesional/box (`.is-lane-heading`), `.agenda-lane-label`, `.agenda-legend` (+`.agenda-legend-item`, `.agenda-swatch`, `.is-agendada/.is-online/.is-confirmed/.is-cancelled/.is-missed/.is-block`), `.global-grid`/matriz, `.agenda-box-combobox` (+lista filtrada). Las citas del grid se pintan con las clases de estado correspondientes.
- Seguir tokens; los colores de la leyenda son semánticos de estado (no reemplazan el único acento de acción `--accent`). Botones 44px, `prefers-reduced-motion`.

## No hacer
- NO instalar librerías de calendario/combobox.
- NO tocar otras páginas ni la creación de citas.
- NO cambiar `agenda-queries` fuera de añadir `source`/`attendance` y (si aplica) incluir canceladas.
- Tuteo, sin emoji.

## Verificación (obligatoria)
1. `npx tsc --noEmit` OK.
2. `npm run lint` + `git diff --check` OK.
3. `npm run build` OK.
4. Confirmar: Global renderiza todos los profesionales/boxes como lanes y navega; combobox filtra boxes por texto; leyenda muestra los 6 estados con sus colores y coinciden con el pintado del grid.
5. Reportar archivos tocados + decisión sobre canceladas.

## Nota al gatekeeper (Hermes)
Tras deploy, validar en Chromium con la demo: /agenda → Global (ver todos los profesionales como lanes, y con toggle Box todas las salas), Día/Semana siguen bien, selector de box filtra por texto, y la leyenda muestra los 6 estados con colores correctos. Si hace falta, insertar citas con distintos estados (pending internal/public, confirmed, missed attendance, cancelled, block) vía BD para validar el pintado y limpiar después.