# Ley 21.719 — Protección de Datos Personales (Chile) — Referencia NexoDent

> Análisis técnico desde el texto oficial (Diario Oficial 13-dic-2024, CVE 2583630). NO es asesoría jurídica.
> Vigencia: **1 de diciembre de 2026** (art. 1º transitorio: día 1 del mes 24 posterior a la publicación).
> UTM sept-2026: $71.721 CLP.

## Mapa de impacto en NexoDent

| Área | Artículo | Qué exige | Impacto en el sistema |
|---|---|---|---|
| Datos de salud = sensibles | 16, 16 bis | Consentimiento **expreso** (escrito/verbal/medio tecnológico). Solo fines sanitarios | Registro de consentimiento por paciente: timestamp + versión política + quién lo tomó |
| Responsable vs encargado | 15 bis | Clínica = responsable; SaaS = encargado. **Contrato de encargo** obligatorio. Sub-encargados requieren autorización escrita. Fin del servicio → suprimir/devolver | DPA por clínica en `/settings/documentos-legales` |
| Privacidad por diseño/default | 14 quáter | Medidas desde el diseño; solo datos estrictamente necesarios por defecto | RLS FORCE actual ya cumple en gran parte → argumento de venta |
| Seguridad | 14 quinquies | Cifrado, seudonimización, disponibilidad, restauración, evaluación periódica | Backups + DR + cifrado en reposo |
| Brechas | 14 sexies | Reportar a Agencia sin dilación; si salud/NNA<14 → avisar a cada titular; registrar naturaleza/efectos/nº afectados | Logs para caracterizar brecha + notificación masiva |
| Derechos ARCO+portabilidad | 5-11 | Acceso (gratis trimestral), rectificación, supresión, oposición, portabilidad (formato común), bloqueo temporal. Respuesta ≤30 días corridos; bloqueo 2 días hábiles | Export de ficha (JSON/CSV/PDF), supresión/anónimización, buzón ARCO con SLA |
| Niños | 16 quáter | <14: consentimiento padres. Sensibles <16: padres | Campo representante legal en pacientes menores |
| Transparencia | 14 ter | Política pública con versión; responsable; categorías; finalidades; base legal; medidas; conservación; retiro de consentimiento | Página pública de privacidad (propia + plantilla por clínica) |
| **Transferencia internacional** | 27, 28 | EE.UU. sin adecuación chilena → cláusulas tipo/garantías aprobadas + autorización del responsable | **Hosting Chile evita el problema; US East lo exige documentar** |
| Sanciones | 35 | Leves ≤5.000 UTM (~$358M), graves ≤10.000 (~$717M), gravísimas ≤20.000 UTM (~$1.434M). Reincidencia ×3; grandes empresas 2%/4% ingresos | — |
| Régimen pymes | 6º transitorio | 12 meses post-vigencia: solo amonestación para empresas de menor tamaño (Ley 20.416) | Alivio para clínicas chicas |

## Definiciones clave (art. 2)
- **Responsable**: decide fines y medios del tratamiento (la clínica).
- **Encargado/mandatario**: trata por encargo e instrucciones (NexoDent). Usar datos para otro fin o cederlos sin autorización → pasa a ser responsable y responde solidariamente.
- **Anonimización**: irreversible → deja de ser dato personal.
- **Seudonimización**: ya no atribuible sin info adicional separada.
- **Consentimiento**: libre, específico, inequívoco, informado, previo, acción afirmativa clara.
- Derechos: acceso (q), rectificación (r), supresión (s), oposición (t), portabilidad (u: formato electrónico estructurado, genérico, de uso común).

## Decisiones pendientes (para BRIEF futuro)
1. **Hosting**: Chile (ventaja de venta "datos 100% en Chile") vs US East (requiere cláusulas + autorizaciones escritas por clínica).
2. Feature "Documentos legales": DPA por clínica + política con versiones + buzón ARCO + export/supresión por paciente.
3. Registro de consentimiento de paciente (base para ficha clínica).
4. Revisar con abogado los contratos finales.

## Fuente
- Texto oficial: PDF Diario Oficial 13-dic-2024 Núm. 44.023 CVE 2583630 (descargado y analizado 2026-09-03).
- LeyChile idNorma 1209272 (SPA, requiere navegador).
