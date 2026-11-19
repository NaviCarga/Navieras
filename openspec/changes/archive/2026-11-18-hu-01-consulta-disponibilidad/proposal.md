# Proposal

## Why

El exportador no tiene forma de ver la disponibilidad de espacio en los buques ni los itinerarios sin depender de llamadas o correos manuales, lo que alarga el tiempo de respuesta y provoca solicitudes rechazadas. Esta historia implementa la consulta autónoma de disponibilidad en el portal (HU-01), actividad TO-BE «Consulta disponibilidad y tarifa referencial en el portal» (solo la parte de disponibilidad) y caso de uso CU-01.

## What Changes

- Se agrega una pantalla de **consulta de itinerarios y disponibilidad** con filtros por puerto de origen, puerto de destino y tipo de contenedor.
- Se muestra un **calendario por fecha de zarpe** con el buque, la fecha de zarpe, el arribo estimado y los cupos disponibles para el tipo de contenedor solicitado.
- Si no hay cupo para el tipo solicitado, se informa que el viaje no cuenta con capacidad y no se ofrece como disponible para ese tipo.
- La consulta es de **solo lectura**: no crea ni modifica viajes, buques, puertos ni cupos.
- El **Sistema Central de Flota (ERP Naviero)** se implementa como una integración simulada que devuelve los datos de ejemplo cargados.
- Se incluye un **selector de rol de demostración** (Exportador) para identificar al actor.
- Se agregan **pruebas automáticas**, una por cada escenario Gherkin de HU-01.

**Fuera de alcance:** la tarifa referencial (parte de RP-01), la solicitud y confirmación de reservas (HU-04), la actualización automática del inventario (HU-02), la asignación de agentes (HU-03), el bloqueo efectivo de reservas en viajes sin cupo, los requisitos no funcionales RP-19, RP-22, RP-24 y RP-25, y la autenticación real.

## Capabilities

### New Capabilities
- `consulta-disponibilidad`: consulta de viajes y cupos de contenedor por puerto de origen, puerto de destino y tipo de contenedor, presentada como calendario por fecha de zarpe, con aviso cuando no hay capacidad.

### Modified Capabilities
- Ninguna. No existen capacidades previas en `openspec/specs/`.

## Impact

- **Código nuevo:** estructura inicial de la aplicación TypeScript + Express + EJS, capa de dominio (`Viaje`, `Buque`, `Puerto`, `CupoContenedor`), ruta y vista de consulta, adaptador del ERP Naviero simulado y selector de rol.
- **Base de datos:** tablas para `buque`, `viaje`, `puerto` y `cupo_contenedor` en SQLite, con migraciones numeradas y datos de ejemplo.
- **Dependencias:** `express`, `ejs`, `better-sqlite3`, `typescript`, `tsx`, `vitest` y `supertest`.
- **Pruebas:** una prueba de integración por escenario Gherkin de HU-01.
- **Trazabilidad:** HU-01, CU-01, DSS-01, EST-02 (solo lectura) y RP-01 (parte de disponibilidad).
