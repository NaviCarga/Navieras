# Design

## Context

La pantalla de disponibilidad (`GET /disponibilidad`) ya agrupa los viajes por `fechaZarpe` y muestra, por viaje, el buque, la ruta, el arribo estimado y los cupos. La fecha de zarpe solo aparece en el encabezado del grupo (`<h3><%= grupo.fecha %></h3>`), no como dato de la fila. El diseño original de HU-01 y el Gherkin exigen informar la fecha de zarpe por viaje. No hay cambios de requisitos ni de datos: el modelo ya expone `Viaje.fechaZarpe`.

## Goals / Non-Goals

**Goals:**
- Mostrar la fecha exacta de zarpe de cada viaje de forma explícita en la tabla.
- Mantener el calendario agrupado por fecha de zarpe y el resto de la información sin cambios.
- Asegurar que la prueba de HU-01 detecte la ausencia de este dato en la fila del viaje.

**Non-Goals:**
- Cambiar el modelo de dominio, la base de datos, los repositorios, la ruta o la integración simulada.
- Agregar tarifa, reservas, ordenamientos nuevos o formatos de fecha distintos.
- Modificar los artefactos del curso.

## Decisions

1. **Agregar una columna «Zarpe» en la tabla de viajes, entre «Buque» y «Ruta».**
   - Se usa `viaje.fechaZarpe`, el mismo valor que agrupa el calendario y que proviene de `Viaje.fechaZarpe` en el modelo de dominio.
   - Se muestra en formato ISO `YYYY-MM-DD`, igual que los datos existentes.
   - Alternativa considerada: rotular solo el encabezado del grupo como «Zarpe». Se descarta porque la observación pide una columna y porque el dato debe quedar asociado a cada fila, no solo al grupo.

2. **Mantener el encabezado del grupo con la fecha.**
   - El calendario sigue agrupando por fecha de zarpe; la columna refuerza el dato por viaje sin eliminar la vista de calendario.

3. **Reforzar la prueba de HU-01 en lugar de crear una prueba nueva.**
   - La prueba existente ya valida los escenarios Gherkin; se amplía para verificar que el encabezado «Zarpe» exista y que la fecha de zarpe esté dentro de la fila del buque consultado.
   - Esto evita que una coincidencia de fecha en otra parte del HTML dé un falso positivo.

## Risks / Trade-offs

- **Duplicación visual de la fecha** (encabezado del grupo y columna) → se acepta: mejora la claridad y mantiene la lectura de calendario.
- **Prueba frágil por HTML** → se mitiga buscando la fila completa del buque y comprobando la fecha dentro de ella, no solo la presencia global del texto.
- **Cambio mínimo sin impacto en datos** → no requiere migración ni reejecutar el seed.
