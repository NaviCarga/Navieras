# Tasks

## 1. Base de datos, dominio y datos de ejemplo

- [x] 1.1 Crear la migración `002_crear_reservas.sql` con las tablas `empresa_exportadora`, `reserva` y `detalle_reserva`, sus claves foráneas, `ON DELETE CASCADE` en `detalle_reserva.reserva_id`, unicidad de `rut` y `codigo_booking`, y `CHECK >= 0` en las cantidades. Verificar ampliando `tests/db.test.ts` para que compruebe las tablas, la cascada y las restricciones.
- [x] 1.2 Agregar los tipos `EmpresaExportadora`, `Reserva`, `DetalleReserva` y `ReservaConDetalles` en `src/dominio/tipos.ts`, y los repositorios `listarReservas`, `obtenerReserva` y `crearReserva` en `src/dominio/repositorios.ts`. Verificar con una prueba que una reserva creada se recupera con sus detalles y su empresa.
- [x] 1.3 Ampliar `src/db/seed.ts` con empresas y reservas de ejemplo para los tres escenarios, sin alterar los viajes y cupos de HU-01, y agregar el conteo de reservas a `ResumenSeed`. Verificar ejecutando `sembrar` dos veces y actualizando `tests/seed.test.ts` para comprobar idempotencia, los datos nuevos y que los dos viajes/cupos de HU-01 conservan sus valores.

## 2. Servicio de inventario e integración simulada

- [x] 2.1 Ampliar `SistemaFlota` y `SistemaFlotaSimulado` con `consultarCapacidad`, `registrarAsignacion` y `registrarLiberacion`, registrando cada mensaje en `integraciones_log`. Verificar ampliando `tests/integracion.test.ts` para comprobar los mensajes y resultados de las tres llamadas.
- [x] 2.2 Implementar `confirmarReserva` en `src/servicios/inventario.ts` dentro de una transacción: agrupar TEUs por tipo, verificar viaje y cupos, descontar con actualizaciones condicionales, pasar a `Confirmada` y registrar la asignación; si no alcanza, pasar a `Rechazada` sin tocar cantidades. Verificar con pruebas de servicio para confirmación exitosa, capacidad insuficiente y `changes` de las actualizaciones condicionales.
- [x] 2.3 Implementar `cancelarReserva` en `src/servicios/inventario.ts` dentro de una transacción: exigir estado `Confirmada`, comparar `hoy` con `plazo_maximo_cancelacion`, rechazar fuera de plazo sin cambios y, dentro del plazo, restituir viaje y cupos, pasar a `Cancelada` y registrar la liberación. Verificar con pruebas de servicio para cancelación dentro y fuera del plazo, y para una reserva en estado distinto de `Confirmada`.

## 3. Pantalla de reservas y rutas

- [x] 3.1 Agregar el rol `naviera` a `ROLES` y al selector de `src/vistas/parciales/encabezado.ejs`, y un enlace «Reservas» al encabezado. Verificar con una petición HTTP a `/rol?rol=naviera` que la cookie y la pantalla reflejan el rol.
- [x] 3.2 Implementar `GET /reservas` y la vista `src/vistas/reservas.ejs` con empresa, viaje, ruta, zarpe, TEUs, detalles por tipo, estado, plazo y acciones. Verificar con una petición HTTP que el HTML muestra las reservas de ejemplo y sus datos.
- [x] 3.3 Implementar `POST /reservas/:id/confirmar` con patrón POST/Redirect/GET y los mensajes de confirmación o capacidad insuficiente. Verificar con la prueba `HU-02 · Descuento automático de cupo al confirmar una reserva` (capacidad del viaje 50 → 40, cupo descontado y estado `Confirmada`) y `HU-02 · Rechazo de confirmación de reserva por capacidad insuficiente (prevención de sobreventa)` (capacidad sigue en 4 y estado `Rechazada`) en `tests/hu02.test.ts`.
- [x] 3.4 Implementar `POST /reservas/:id/cancelar` con patrón POST/Redirect/GET y los mensajes de cancelación o fuera de plazo. Verificar con la prueba `HU-02 · Restitución automática de cupo por cancelación dentro del plazo permitido` (capacidad 30 → 38 y estado `Cancelada`) y con una prueba adicional de rechazo fuera de plazo (estado sigue `Confirmada` y capacidad sin cambios).
- [x] 3.5 Manejar reservas inexistentes o en estado que no permite la operación redirigiendo con un mensaje informativo, sin error 500. Verificar con peticiones HTTP a un id inexistente y a una reserva `Cancelada`.

## 4. Verificación y documentación

- [x] 4.1 Ejecutar `npm test` y `npm run typecheck` y comprobar que pasan las pruebas de base de datos, seed, integración, inventario, pantalla, los tres escenarios Gherkin de HU-02 y las pruebas previas de HU-01.
- [x] 4.2 Actualizar `README.md` con la pantalla de reservas, los datos de ejemplo nuevos, los roles de demostración (incluido `naviera`), el flujo de confirmar/cancelar y la indicación de que el ERP Naviero está simulado. Verificar que los comandos y la URL documentados funcionan tal como están escritos.

## Workflow follow-up

- Archivar el cambio después de que el estudiante valide el sistema y confirme que funciona como esperaba.
- Verificar el resultado archivado en `openspec/changes/archive/` y las especificaciones vigentes en `openspec/specs/`.
