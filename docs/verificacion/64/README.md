# BRIEF-CODEX-64/65 — Pantalla Plan realineada a spec cimaos 1920×873

Captura final `plan_1920_final.png`. Verificado en producción con Chromium headless (Cuenta demo, 1920×873):

- Cards (overview, detalle, período, historial): fondo #101827, borde 1px #202a3a, radio 8px, header 44px.
- Métricas "Mi plan actual": 3 en fila, alto 124px, gap 12px, radio 8px.
- Tabs Plan/IA/Uso: 33px de alto.
- Subtabs Renovar/Agregar: radio 10px, gap 8px, alto 44px.
- Grid inferior: 2 columnas de 824px, gap 16px, columna izquierda iniciando en x:232.
- Opción "Mensual" seleccionada: 822×76, padding 6.4px 12px, borde cian #22d3ee, radio 10px.
- Botón Pagar con MercadoPago: 822×44, cian #22d3ee, radio 10px.
- Fix 65: headers de Detalle/Período con h2 arriba y subtítulo debajo (gap ~5px), badge Activo intacto.

Historial de pagos (<details>) mantiene su layout preexistente (no es parte de este brief).
