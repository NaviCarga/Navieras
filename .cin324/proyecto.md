# Estado del proyecto — generación de la aplicación

## Proyecto
- Nombre: Naviera Guerrero — reserva de espacio en buques
- Repositorio de documentación: esta carpeta
- Última auditoría: 2026-11-05 — resultado: completo, con supuestos menores (todos los bloqueantes presentes)

## Mapa de artefactos (rutas detectadas)
| Artefacto | Ruta(s) | Estado |
|-----------|---------|--------|
| BPMN AS-IS | `01-proceso-as-is.md`, `diagramas/as-is.bpmn`, `diagramas/as-is.png` | completo |
| BPMN TO-BE | `02-rediseno-to-be.md`, `diagramas/to-be.bpmn`, `diagramas/to-be.png` | completo |
| Historias de usuario | `04-historias-usuario.md` (HU-01 a HU-04) | completo |
| Criterios Gherkin | `07-criterios-aceptacion.md` (HU-01 a HU-04) | completo |
| Modelo de dominio | `08-modelo-dominio.md`, `diagramas/modelo-dominio.puml`, `diagramas/modelo-dominio.png` | completo |
| Casos de uso | `09-casos-de-uso.md`, `diagramas/casos-de-uso.puml`, `diagramas/casos-de-uso.png` | completo |
| Diagramas de estado | `11-diagramas-estado.md`, `diagramas/est-01.puml`, `diagramas/est-02.puml` | completo |
| Diagramas de secuencia | `10-diagramas-secuencia.md`, `diagramas/dss-01.puml`, `diagramas/dss-02.puml` | completo (HU-03 sin DSS) |
| Requisitos y atributos de calidad | `03-requisitos.md`, `06-atributos-calidad.md`, `12-trazabilidad.md` | completo |

## Supuestos acordados (por elementos faltantes o dudosos)
- 2026-11-05 — HU-03 no tiene diagrama de secuencia y su estado «Confirmada sin agente asignado» no aparece en EST-01. Se reconstruirá el flujo al validar HU-03 si se elige; mientras tanto no bloquea.
- 2026-11-05 — La tabla de transiciones de `11-diagramas-estado.md` omite transiciones presentes en `est-01.puml` y `est-02.puml`; se toma el `.puml` como fuente de verdad.
- 2026-11-05 — `BL` se usa en `DSS-02` y RP-13 pero no es clase del dominio; no se modelará como entidad mientras las historias actuales no lo exijan.
- 2026-11-05 — Para HU-02 se interpreta «cupo total del buque» como `capacidadDisponibleTEU` de `Viaje` y detalle en `CupoContenedor` (se unifica el término a Viaje/CupoContenedor).

## Stack (se define una sola vez)
- Lenguaje y framework: TypeScript + Express + EJS (modo estricto de TypeScript)
- Base de datos: SQLite — archivo `data/app.db` con `better-sqlite3`; migraciones SQL numeradas en `src/db/migrations/`, registradas en `schema_migrations`
- Pruebas: Vitest + supertest (una prueba por escenario Gherkin)
- Cómo instalar: `npm install`
- Cómo cargar datos de ejemplo: `npm run db:seed`
- Cómo ejecutar: `npm run dev` — URL: `http://localhost:3000`
- Cómo probar: `npm test`

## Historias
| Historia | Estado | Cambio de OpenSpec | Fecha | Observaciones |
|----------|--------|--------------------|-------|----------------|
| HU-01 | archivada | `hu-01-consulta-disponibilidad`; ajuste `ajuste-hu-01-columna-zarpe` | 2026-11-05 | Consulta de itinerarios y disponibilidad (calendario); ficha en `.cin324/historias/HU-01.md`. Validación 2026-11-18: `VAL-HU-01-1.md`; OBS-1 tipo D (columna/fecha de zarpe) corregida y verificada en pantalla. Cambios archivados el 2026-11-18. |
| HU-02 | archivada | `hu-02-actualizacion-inventario`; ajuste `ajuste-hu-02-navegacion-rol` | 2026-11-12 | Actualización automática del inventario de espacio; ficha en `.cin324/historias/HU-02.md`; 13/13 tareas y 34 pruebas pasan (HU-01 y HU-02). Se agregó `npm run db:reset` para repetir el recorrido. Ajuste de navegación del selector implementado y validado el 2026-11-17; cambios archivados el 2026-11-17. |
| HU-03 | archivada | `hu-03-asignacion-agente` | 2026-11-18 | Asignación automática de agente operativo (sin DSS; ficha en `.cin324/historias/HU-03.md`); 16/16 tareas y 46 pruebas pasan. Panel del agente (`/agente`), alertas del administrador (`/alertas`) y seed con agentes por zona. Validación 2026-11-18: `VAL-HU-03-1.md`; OBS-1 tipo F (la confirmación sin agente en Europa es el comportamiento documentado). |
| HU-04 | archivada | `hu-04-solicitud-confirmacion-reserva` | 2026-11-19 | Solicitud y confirmación de booking; ficha en `.cin324/historias/HU-04.md`. Formulario y comprobante en `/booking`, validación de datos/contrato, verificación y revalidación de cupo, rechazo por bloqueo comercial, asignación de agente y notificación simulada. 21/21 tareas y 63 pruebas pasan. Se agregó al seed una empresa bloqueada (`79.999.999-9`), contratos de ejemplo y 15 cupos `20GP` en `VIA-003` para el escenario de 5 contenedores. Validación 2026-11-19: OBS-1 (viaje/tipo sin cupo se sigue ofreciendo para solicitar) descartada conscientemente; el sistema queda coherente con los artefactos. Cambio archivado el 2026-11-19. |

## Validaciones
| Historia | Informe | Estado | Fecha |
|----------|---------|--------|-------|
| HU-01 | `.cin324/validaciones/VAL-HU-01-1.md` | Validada sin observaciones pendientes; OBS-1 tipo D corregida y verificada en pantalla | 2026-11-18 |
| HU-02 | `.cin324/validaciones/VAL-HU-02-1.md` | Validada sin observaciones pendientes; OBS-1 y OBS-2 resueltas; archivada el 2026-11-17 | 2026-11-17 |
| HU-03 | `.cin324/validaciones/VAL-HU-03-1.md` | Validada sin observaciones pendientes; OBS-1 tipo F (comportamiento documentado); cambio archivado el 2026-11-18 | 2026-11-18 |

## Cambios posteriores
| Cambio | Historia afectada | Motivo | Fecha |
|--------|-------------------|--------|-------|
| `ajuste-hu-01-columna-zarpe` | HU-01 | Corrección de defecto de generación: mostrar la fecha de zarpe por viaje en la tabla | 2026-11-10 |
| `ajuste-hu-02-navegacion-rol` | HU-02 | Brecha de especificación: al elegir «Naviera», abrir `/reservas`; los demás roles mantienen `/disponibilidad` | 2026-11-17 |
