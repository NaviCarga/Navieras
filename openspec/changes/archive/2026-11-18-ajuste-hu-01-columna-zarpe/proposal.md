# Proposal

## Why

La validación de HU-01 encontró que la pantalla de disponibilidad no muestra la fecha de zarpe como dato explícito de cada viaje: la fecha aparece solo como título del grupo del calendario, mientras que el Gherkin de HU-01 y el diseño del cambio original exigen informar la fecha de zarpe por viaje. Esto impide identificar con claridad la fecha exacta en que zarpa el buque.

## What Changes

- Agregar la columna **«Zarpe»** a la tabla de viajes de la pantalla `GET /disponibilidad`, mostrando `Viaje.fechaZarpe` en cada fila.
- Mantener el calendario agrupado por fecha de zarpe y el resto de la información actual (buque, ruta, arribo estimado y cupos).
- Reforzar la prueba de HU-01 para que verifique la fecha de zarpe asociada a cada viaje y no solo su presencia en cualquier parte del HTML.
- No se modifican requisitos, escenarios Gherkin, modelo de dominio, casos de uso, diagramas ni la base de datos: el comportamiento ya está especificado y el defecto es de generación.

## Capabilities

### New Capabilities

Ninguna. El ajuste no introduce comportamiento nuevo.

### Modified Capabilities

Ninguna. El requisito de HU-01 ya exige mostrar la fecha de zarpe por viaje; se corrige la implementación para cumplirlo.

## Impact

- **Pantalla:** `src/vistas/disponibilidad.ejs` (encabezado y celda de la nueva columna «Zarpe»).
- **Pruebas:** `tests/hu01.test.ts` (verificación explícita de la fecha de zarpe por viaje).
- **Sin cambios:** rutas, dominio, repositorios, integración simulada, migraciones, datos de ejemplo ni `README.md` (los comandos no cambian).
- **Historia de origen:** HU-01 — consulta de itinerarios y disponibilidad de espacio en buques.
- **Actividad del TO-BE:** «Consulta disponibilidad y tarifa referencial en el portal» (solo la parte de disponibilidad).
- **Caso de uso:** CU-01 — Consultar viajes y cupos de contenedor por puerto origen/destino.
- **Fuera de alcance:** tarifa referencial, solicitud de reserva, cambios de estado y cualquier otro ajuste visual no respaldado por los artefactos.
