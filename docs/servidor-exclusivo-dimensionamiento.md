# NexoDent: dimensionamiento de servidor privado exclusivo (producción)

Fecha: 2026-09-03. Estado: RECOMENDACIÓN (no contratar aún — validar con Bryan). Autor: Hermes.

## Contexto / decisión de Bryan
- NexoDent (Next.js 16 + PostgreSQL 17 + Drizzle + Better Auth + RLS forzado, Docker/Coolify) tendrá un **servidor privado exclusivo** en producción — NO compartido con otros sistemas de prueba (hoy corre junto a n8n, orquestador, backend, eyewear-store, etc. en el VPS de nexolabs.cloud).
- Vercel/Supabase/Clerk: descartados (control de datos = requisito del producto de salud).

## Evidencia de consumo real (Glances, 2026-09-03)
- Server compartido actual: 8 vCPU AMD EPYC, 23.5 GB RAM (9.4 GB usados = 40%), disco 387 GB (41 GB usados).
- **Load average: 16.8 (min1) / 12.0 (min5) sobre 8 cores → SOBRECARGADO ~2x** por la suma de sistemas de Bryan. Esto confirma la necesidad de servidor exclusivo.
- NexoDent hoy: `next-server` ~228 MB RAM · postgres ~26-28 MB (proceso) · workers tsx bajo demanda.
- Perfil: app web multi-tenant con ~10 migraciones SQL, jobs/notificaciones (polling), PWA + posible subida de documentos clínicos (hoy storage local stub).

## Dimensionamiento recomendado (3 perfiles)

### P1 — Arranque/validación (suficiente hoy y para ~20-50 clínicas)
- **4 vCPU dedicados/shared estables · 8 GB RAM · 160 GB NVMe** · backup automático ON
- Base: web (~0.5-1 GB con picos) + Postgres (shared_buffers 2-4 GB) + 3 workers (0.3-0.6 GB) + SO/Docker/Coolify (~1-1.5 GB)
- Margen: 30-40% libre para picos y próxima migración SQL

### P2 — Confort + crecimiento (50-200 clínicas, recomendada para producción seria)
- **8 vCPU · 16 GB RAM · 320 GB NVMe** · backups + snapshots
- Permite: Postgres con tuning generoso, workers simultáneos, documentos clínicos (50 MB/paciente), picos diurnos de clínicas (agenda 8-20h), reportes/insights

### P3 — Escala (200+ clínicas o si se quiere dormir tranquilo 3-4 años)
- **12-16 vCPU · 32-64 GB RAM · 500 GB-1 TB NVMe** (o dedicado bare-metal)
- O en su momento: separar BD a su propio server (Postgres dedicado) — patrón lift&shift ya contemplado.

**Regla práctica**: P2 hoy (8/16/320) cuesta poco más que P1 y evita migrar de server a los 6 meses. P1 solo si el presupuesto manda.

## Proveedores (precios verificados 2026-09)

### Hetzner Cloud (mejor precio/calidad, post-subida jun-2026)
| Plan | vCPU/RAM/disco | €/mes | Nota |
|---|---|---|---|
| CX33 | 4/8 GB/80 GB | €8.49 | shared, solo EU |
| CX43 | 8/16 GB/160 GB | €15.99 | shared, solo EU |
| CPX32 | 4/8 GB/160 GB | €35.49 | US ~igual, tráfico 1-8 TB |
| CCX23 | 4/16 GB/160 GB | €85.99 | vCPU DEDICADOS |
- Regiones: Falkenstein/Núremberg (DE), Helsinki (FI), Ashburn (US East), Hillsboro (US West), Singapur.
- Tráfico incluido: EU 20 TB; US 1-8 TB. Backups +20%. IPv4 +€0.50.
- **Latencia a Chile**: US East ~150-170 ms · EU ~250 ms.
- Sin Sudamérica. Ideal si el mercado es Chile pero se acepta 150 ms (apps de gestión OK).

### Contabo (más RAM/disco por €, calidad media)
| Plan | vCPU/RAM/disco | €/mes | Nota |
|---|---|---|---|
| Cloud VPS 4 | 4/8 GB/100 GB SSD | €4.40 | 200 Mbit/s, tráfico ilimitado |
| Cloud VPS 6 | 6/12 GB/200 GB | €6.00 | 300 Mbit/s |
| Cloud VPS 8 | 8/24 GB/300 GB | €11.20 | 600 Mbit/s |
| VDS S | 6 vcores/24 GB/180 GB NVMe | €31.20 | vCPU garantizados |
| Dedicado Ryzen 9 7900 | 12c/64 GB/1 TB NVMe | €109.65 | bare-metal |
- Regiones: EU (DE), US East/West, Singapur, JP, AU, IN.
- Tráfico ilimitado (fair use). Apps one-click incluyen **Coolify**.
- Latencia a Chile similar a Hetzner según región US.

### DigitalOcean (precios 2026, per-second)
| Plan | vCPU/RAM/disco | US$/mes | Nota |
|---|---|---|---|
| Basic 4 GiB | 2 vCPU/4 GB/80 GB | $24 | shared |
| Basic 8 GiB | 4 vCPU/8 GB/160 GB | $48 | shared |
| CPU-Opt 8 GiB | 4 vCPU/8 GB/50 GB | $84 | dedicados |
| General 16 GiB | 4 vCPU/16 GB/50 GB | $126 | dedicados |
- Regiones: NYC/SFO/AMS/FRA/LON/SGP/BLR/SYD/TOR — **sin Sudamérica** (FAQ oficial no lista São Paulo). Latencia Chile: NYC ~150 ms.
- Backups 20-30% del droplet. Managed Postgres disponible aparte.

### Vultr / otros LATAM
- Vultr: tiene São Paulo (latencia Chile ~250 ms vía Brasil) — precio consultar (bloqueó fetch).
- Google Cloud: única nube con **región en Chile (santiago)** — latencia ~5-15 ms pero costo mucho mayor (instancia mínima ~US$30+/mes + red); overkill para arrancar.
- **Nota**: DO/Vultr sin datacenter en Chile; para SaaS B2B chileno 150 ms es aceptable; si Bryan quiere <50 ms, Google Cloud Santiago o un host local chileno (más caro).

## Recomendación concreta
1. **Elección por defecto**: Hetzner Cloud **CX43 (8 vCPU/16 GB/160 GB, €15.99/mes)** en **Ashburn (US East)** — mejor balance precio/prestaciones; tráfico 1-8 TB alcanza; vCPU compartidos estables son suficientes para una app de gestión (los picos son moderados). Con backups (+20%) ≈ **€19/mes ≈ CLP ~19.000-20.000**.
2. **Alternativa más económica**: Contabo **Cloud VPS 6 (6/12/200, €6/mes)** ≈ CLP ~6.300 (tráfico ilimitado, puerto 300 Mbit/s) — sobra para arrancar; upgrade a Cloud VPS 8 (€11.20) si crece.
3. **Si Bryan quiere "dormir tranquilo" y aislarse del noisy-neighbor**: Hetzner **CCX23 (4 vCPU dedicados/16 GB, €85.99)** o Contabo VDS S (€31.20). Para un SaaS B2B sin picos extremos, **no necesario al inicio**.
4. **Instalación**: Coolify en el server nuevo (Bryan ya lo domina) → lift & shift del docker-compose actual; dominio dental.nexolabs.cloud o dominio propio del producto; backup off-host (ej. Storage Box de Hetzner o Contabo Auto Backup).

## DECISIÓN DE BRYAN (2026-09-03)
- **Perfil**: P2 (8 vCPU / 16 GB / 160-320 GB NVMe + backups).
- **Proveedor**: Hetzner (Cloud).
- **Dominio**: quería nexodental.com o .cloud, pero **ambos ya están registrados** (nexodental.com en uso activo; nexodental.cloud parking). Disponibles verificados: **nexodental.app ✅, nexodent.app ✅, nexodental.cl ✅, nexodent.cl ✅, nexodental.io ✅, nexodental.co ✅**. Recomendación: nexodental.app (SaaS global, HTTPS forzado) o nexodental.cl (raíz Chile). Pendiente: Bryan elige y contrata.
- **Cronograma**: la migración al servidor exclusivo se hará **al FINAL del desarrollo** (seguimos desarrollando en el VPS actual de prueba). No contratar servidor todavía — este doc queda como runbook listo para ejecutar.

## Costo total mensual estimado
| Perfil | Server | Backups | Total aprox (CLP @ ~950/USD, 1.05/EUR) |
|---|---|---|---|
| P1 Contabo VPS 6 | €6.00 | incl. opción | ~CLP 6.300-8.000 |
| P2 Hetzner CX43 US | €15.99 +20% | €19.19 | ~CLP 20.000 |
| P2+ Contabo VPS 8 | €11.20 | opcional | ~CLP 12.000 |
| P3 Hetzner CCX23 | €85.99 +20% | ~€103 | ~CLP 108.000 |
| P3 Contabo dedicado | €109.65 | — | ~CLP 115.000 |

*CLP aproximado — verificar tipo de cambio del día antes de contratar.*

## Próximos pasos (cuando Bryan decida)
1. Confirmar perfil + proveedor + región (¿Chile/EE.UU.?) + dominio.
2. Crear server → instalar Coolify → desplegar NexoDent (mismo docker-compose del repo, envs desde .secrets) → migraciones + seed.
3. Backup off-host + monitoreo (Glances/Uptime Kuma) + prueba de restore.
4. DNS cutover; dejar el VPS actual solo para los otros sistemas de Bryan.
