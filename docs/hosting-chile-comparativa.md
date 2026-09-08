# Hosting en Chile — Comparativa de rentabilidad (sept-2026)

> Contexto: NexoDent necesita servidor exclusivo de producción. Plan original: Hetzner US East (~8 vCPU/16GB).
> Ley 21.719 (rige 1-dic-2026): datos de salud + hosting fuera de Chile = transferencia internacional con garantías → **residencia local elimina el problema** y es argumento de venta ("datos 100% en Chile").
> TC referencia sept-2026: US$1 ≈ CLP $937. IVA 19% donde corresponde. Verificado con fuentes oficiales/precios públicos 2026-09-03.

## Target de referencia
Equivalente al Hetzner CX43 (8 vCPU / 16 GB / NVMe): **Hetzner US East ≈ US$21-23/mes ≈ CLP $20.000-22.000/mes** (los planes cost-optimized CX Gen3 no existen en US; Ashburn usa estructura previa ~20% más cara que Alemania, con 1 TB tráfico).

## Comparativa (planes ~16 GB RAM, orden por precio mensual)

| Proveedor | Specs | Precio CLP/mes | DC | Notas |
|---|---|---|---|---|
| **Oracle Cloud Chile** (sa-santiago-1 + Valparaíso) | ARM A1 free: 2-4 OCPU/24GB | **$0** (free) / PAYG 4 OCPU | Santiago (2 regiones) | ⚠️ free recortado 2026 (2 OCPU/12GB cuentas free; PAYG conserva 4/24); riesgo de terminación; sin SLA → no para producción de datos de salud |
| **Hetzner US East** (actual) | CX43 equiv: 8vCPU/16GB/160GB | ~CLP $20.000-22.000 | Ashburn, EE.UU. | Más barato; PERO datos fuera de Chile → transferencia internacional Ley 21.719 |
| **OpenCloud (Haulmer)** | 6vCPU/16GB/320GB SSD | $50.000 + IVA = **$59.500** | Chile | Mejor precio chileno real; Proxmox; tráfico 6TB; Haulmer (fintech CL) |
| **V2Networks** | Cloud-4: 6vCPU/16GB/150GB NVMe | $49.900 + IVA = **$59.381** | Santiago (Tier III) | Respaldos semanales incluidos; Cloud-5 8vCPU/24GB/200GB = $95.081 |
| **DCH** | Plan Empresa: 8GB/100GB NVMe (vCPU no pub) | $70.000 + IVA = $83.300 | Santiago | Proxmox, backups diarios; no publica vCPU (cotizar) |
| **Vultr Santiago (scl)** | vhp-8c-16gb-amd: 8vCPU/16GB/350GB | US$96 ≈ **$89.900** | Santiago (scl, API) | Nube madura (API/K8s/DDoS); caro vs locales |
| **Hosting.cl** | Cyber: 6vCPU/8GB/150GB SSD | $179.900 + IVA = $214.081 | DC propio (VMware) | Carísimo por specs; enfocado hosting/cPanel |
| **Vínculo** | 4 vCPU/8GB/750GB | $200.000 + IVA = $238.000 | Santiago | Caro, specs bajas |

## Hiperscalers con región en Chile (para referencia)
- **Oracle Cloud**: Santiago (sa-santiago-1, 2020) + Valparaíso (2023) — primero con 2 regiones en Chile.
- **Azure Chile Central**: operativa desde jun-2025 (3 zonas de disponibilidad).
- **Google Cloud**: southamerica-west1 (Santiago) desde 2021.
- **AWS**: región Chile prometida "fin de 2026" (US$4.000M inversión) — aún no operativa.

## Opiniones comunidad (r/chileIT, sept-2026)
- "Hetzner excelente y barato (lo más barato que he pillado), Vultr vale callampa (te limitan el CPU rate), Linode/Hostinger/DO más caros".
- "Para grandes infraestructuras AWS/DigitalOcean; no usar hosting chilenos en general" (sesgo a favor de internacionales).
- "Vultr tiene servidores en Santiago y anda 10/10" (otro usuario).

## Veredicto para NexoDent
1. **La prima por residencia chilena es real**: pasar de Hetzner US (~$21.000) al mejor chileno (~$59.500) = **~2,8x mensual** (~$460.000 CLP/año de diferencia). Es el costo de poder vender "datos 100% en Chile" y simplificar cumplimiento Ley 21.719.
2. **Recomendación rentable si se decide Chile**: **V2Networks Cloud-4 o Cloud-5** (NVMe real, respaldos incluidos, Tier III, tráfico ilimitado) u **OpenCloud** (más barato, tráfico limitado 6TB). Verificar soporte/reactividad con prueba de 1 mes.
3. **No usar Oracle free para producción** de datos de salud (riesgo de terminación, ARM-only, sin SLA) — serviría para staging/QA gratis en Chile.
4. **Vultr scl**: opción intermedia si se valora API/nube madura y marca internacional, pagando ~$30.000 CLP/mes más que V2/OpenCloud.
5. Migración al final del desarrollo; Coolify hace el cambio de host trivial (mismo Dockerfile).

## Pendientes
- Cotizar DCH plan con 8+ vCPU/16GB (no publican vCPU).
- Confirmar disponibilidad real de instancias Oracle free en sa-santiago-1 (a veces sin capacidad).
- Decisión: ¿residencia chilena como pitch de venta (premium) o Hetzner US + cláusulas contractuales (ahorro)?
