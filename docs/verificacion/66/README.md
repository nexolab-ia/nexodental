# BRIEF-CODEX-66/67 — Pantalla Usuarios realineada a spec cimaos 1920×873

Captura `members_1920_final.png`. Verificado en prod con Chromium headless (Cuenta demo, 1920×873):

- Título y subtítulo en x:232 y:73/98.
- Botón "Invitar Usuario": 147×32, cian, x:1749.
- Fila filtro+tabs en y:136 (misma fila): filtro "Todos los roles" 200×36 x:232, indicador de cupos a 16px, tabs segmentados a la derecha (contendor padding 3px, fondo #101827, tab activo con fondo superficie #1a2740).
- Tarjeta de usuario: x:232 w:824, fondo #101827, borde #202a3a, radio 8px, padding 16px; grilla 2 col `824px 824px` gap 16px.
- Interior: avatar 40×40 (x:249), badge rol 52×18, badge estado 54×22, horarios 24×24 gap 4px, datos Rol/Email/Miembro desde en 2 columnas con valores a la derecha.
- Fix 67: .members-page padding:0 para ancho completo (antes heredaba padding:2rem del main → tarjetas de 792px arrancando en x:264).
- Sin solapamientos; horarios L-V activos en cian, S-D inactivos; 5 tarjetas demo en 2 columnas.

NOTA: El "4 de 1 profesionales utilizados" y los usuarios listados (Emilia/Martín/Sofía/Tomás/Paula) son DATOS del seed con plan base de 1 profesional — no del layout. Ajuste de cupo/seeds es tema de datos, no de esta realineación.
