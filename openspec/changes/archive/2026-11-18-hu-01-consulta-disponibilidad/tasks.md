# Tasks

## 1. Estructura y dependencias

- [x] 1.1 Crear `package.json`, `tsconfig.json` (modo estricto) y la estructura `src/` (app, server, db, dominio, servicios, integraciones, rutas, vistas) y `tests/`. Verificar que `npm install` termina sin errores.
- [x] 1.2 Configurar la aplicación Express con EJS, el middleware de rol de demostración y la redirección `GET /` → `/disponibilidad`. Verificar que `npm run dev` arranca y responde con redirección a `/disponibilidad`.

## 2. Base de datos y datos de ejemplo

- [x] 2.1 Crear la migración `001` con las tablas `buque`, `puerto`, `viaje`, `cupo_contenedor`, `integraciones_log` y `schema_migrations`, incluyendo claves foráneas, `ON DELETE CASCADE` en `cupo_contenedor.viaje_id` y la unicidad `(viaje_id, tipo_contenedor)`. Verificar con una prueba que las tablas y restricciones existen en una base en memoria.
- [x] 2.2 Implementar el seed idempotente con los datos de los escenarios (San Antonio → Shanghái con 25 cupos «40HQ»; Valparaíso → Rotterdam con 0 cupos «40RF») y `npm run db:seed`. Verificar ejecutándolo dos veces que no duplica filas y que los cupos son 25 y 0.

## 3. Dominio e integración simulada

- [x] 3.1 Implementar los tipos y repositorios de `Buque`, `Puerto`, `Viaje` y `CupoContenedor`, y la consulta `consultarDisponibilidad(origen, destino, tipoContenedor)`. Verificar con una prueba que filtra por origen, destino y tipo, y que devuelve `cantidadDisponible = 0` cuando no hay cupo.
- [x] 3.2 Implementar la interfaz `SistemaFlota` y `SistemaFlotaSimulado` (mensajes «Solicitar itinerarios y capacidad» y «Retornar viajes y cupos disponibles»), con registro en `integraciones_log` y selección por `ERP_SIMULADO`. Verificar con una prueba que la llamada devuelve los viajes y deja una fila de log.

## 4. Pantalla de consulta y pruebas de los escenarios

- [x] 4.1 Implementar `GET /disponibilidad` con el formulario de filtros (origen, destino, tipo de contenedor), el calendario agrupado por fecha de zarpe y el aviso de falta de capacidad. Verificar con una petición HTTP que el HTML muestra el buque, las fechas y los cupos, o el aviso cuando no hay capacidad.
- [x] 4.2 Agregar la prueba `HU-01 · Consulta exitosa de itinerarios con cupo disponible según ruta y contenedor` y verificar que pasa con `npm test`.
- [x] 4.3 Agregar la prueba `HU-01 · Consulta de ruta o tipo de contenedor sin cupos disponibles` y verificar que pasa con `npm test`.

## 5. Verificación de integración y documentación

- [x] 5.1 Ejecutar la suite completa con `npm test` y verificar que pasan las dos pruebas Gherkin y las pruebas de base de datos, consulta e integración.
- [x] 5.2 Actualizar `README.md` con cómo instalar, cargar datos de ejemplo, ejecutar (`http://localhost:3000`), probar y cambiar el rol de demostración, indicando que el ERP Naviero está simulado. Verificar que los comandos documentados funcionan tal como están escritos.

## Workflow follow-up

- Archivar el cambio después de que el estudiante valide el sistema y confirme que funciona como esperaba.
- Verificar el resultado archivado en `openspec/changes/archive/` y las especificaciones vigentes en `openspec/specs/`.
