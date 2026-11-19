# Tasks

## 1. Pantalla y prueba del ajuste

- [x] 1.1 Agregar el encabezado «Zarpe» y la celda `viaje.fechaZarpe` en la tabla de `src/vistas/disponibilidad.ejs`, entre «Buque» y «Ruta». Verificar con una petición HTTP a `/disponibilidad?origen=San%20Antonio&destino=Shangh%C3%A1i&tipoContenedor=40HQ` que el HTML contiene `<th>Zarpe</th>` y la fecha `2026-11-20` dentro de la fila de «Buque Andino».
- [x] 1.2 Reforzar la prueba del primer escenario en `tests/hu01.test.ts` para comprobar que la fecha de zarpe está en la fila del viaje y no solo en el encabezado del grupo. Verificar que `npm test -- tests/hu01.test.ts` pasa.

## 2. Verificación de integración y documentación

- [x] 2.1 Ejecutar la suite completa con `npm test` y el chequeo de tipos con `npm run typecheck`; verificar que todas las pruebas y el tipado pasan.
- [x] 2.2 Actualizar la descripción de la pantalla en `README.md` para indicar que la tabla muestra buque, fecha de zarpe, ruta, arribo estimado y cupos; verificar que los comandos documentados siguen funcionando tal como están escritos.

## Workflow follow-up

- Archivar este ajuste después de que el estudiante valide que la columna «Zarpe» se muestra correctamente.
- Verificar el resultado archivado en `openspec/changes/archive/` y las especificaciones vigentes en `openspec/specs/`.
