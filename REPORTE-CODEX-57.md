# REPORTE-CODEX-57

## Archivos tocados

- `app/(app)/settings/notifications/page.tsx`: carga tenant-safe, valores predeterminados y pantalla.
- `app/(app)/settings/notifications/actions.ts`: validación, persistencia aislada por pestaña y auditoría.
- `components/settings/notifications-page.tsx`: pestañas, editor, vista previa y matriz del equipo.
- `app/globals.css`: estilos responsivos `notif-*` basados en `DESIGN.md`.
- `REPORTE-CODEX-57.md`: reporte de entrega.

## Estructura final del JSONB

```json
{
  "patient": {
    "confirmEmailEnabled": false,
    "reminderEmailEnabled": false,
    "reminderTime": "09:00",
    "whatsappConfirmEnabled": false,
    "whatsappTone": "formal",
    "whatsappMessage": ""
  },
  "team": {
    "professionalEvents": {
      "reserveNew": { "email": false, "mobile": false },
      "confirmed": { "email": false, "mobile": false },
      "cancelled": { "email": false, "mobile": false },
      "rescheduled": { "email": false, "mobile": false }
    },
    "otherUsers": {
      "<membershipId>": { "email": false, "mobile": false }
    }
  }
}
```

Cada acción bloquea la organización, mezcla solo su rama sobre la configuración existente y escribe con `JSON.stringify` más cast `::text::jsonb`. Las claves previas de `settings` y la otra rama se preservan.

## Decisiones de UI

- Con WhatsApp apagado, el editor permanece visible, atenuado y deshabilitado.
- La plantilla Amigable no incluye emoji porque `DESIGN.md` prohíbe emoji en la UI.
- La vista previa se apila bajo el editor en pantallas estrechas.
- Un usuario solo existe en `otherUsers` mientras tiene activado `Recibir avisos`.

## Desvíos

- No se conservaron los estados de entrega en esta ruta. El brief prioriza que sea exclusivamente configuración y la infraestructura existente no fue modificada.
- No se añadió migración. Se usa la columna JSONB existente.
- Se añadió un cast intermedio a `text` antes de `jsonb`. La prueba contra PostgreSQL embebido confirmó que `${j}::jsonb` con el driver actual guarda el string JSON como escalar y no como objeto. `${j}::text::jsonb` conserva `JSON.stringify`, evita `tx.json` y persiste la estructura requerida.
- La comprobación visual automatizada en Chromium no pudo ejecutarse en este entorno porque falta `libatk-1.0.so.0` y el usuario del proceso no tiene permiso para instalar dependencias del sistema. Las comprobaciones de compilación, lint y persistencia en PostgreSQL sí se ejecutaron.
