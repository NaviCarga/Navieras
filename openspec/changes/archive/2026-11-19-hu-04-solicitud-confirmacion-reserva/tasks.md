# Tasks

## 1. Datos y documentos

- [x] 1.1 Agregar `numeroContrato` a la clase `Reserva` en `08-modelo-dominio.md` y en `diagramas/modelo-dominio.puml`; verificar que atributo y tabla de clases coincidan en ambos archivos.
- [x] 1.2 Crear `src/db/migrations/004_agregar_contrato_reserva.sql` con la columna `numero_contrato` en `reserva`; verificar con `npm run db:reset` que `schema_migrations` registre `001`–`004`.
- [x] 1.3 Extender `src/dominio/tipos.ts` y `src/dominio/repositorios.ts` para leer y crear reservas con `numeroContrato`; verificar con `npm run typecheck`.
- [x] 1.4 Agregar al seed la empresa `Carga Rápida SpA` con `estadoComercial = 'Bloqueada'` y un `numeroContrato` de ejemplo a cada reserva sembrada; verificar con `npm run db:seed` y la prueba existente `tests/seed.test.ts`.

## 2. Integración simulada y servicio de booking

- [x] 2.1 Crear `src/integraciones/evaluacionComercial.ts` (interfaz + simulación que aprueba `Activa` y bloquea cualquier otro estado, registrando en `integraciones_log`); verificar con una prueba unitaria que cubra aprobado, bloqueado y el log.
- [x] 2.2 Implementar `generarCodigoBooking` con el patrón `BK-<año>-<secuencia>` y verificar con una prueba que dos reservas del mismo año obtengan códigos distintos y correlativos.
- [x] 2.3 Implementar `registrarBooking` en `src/servicios/booking.ts` con validación de datos/contrato y verificación preliminar de disponibilidad; verificar con pruebas de datos faltantes, contrato inválido y `sin_cupo` sin cambios en el inventario.
- [x] 2.4 Completar `registrarBooking` con el rechazo por bloqueo comercial (estado `Rechazada`, sin descuento), la reserva temporal, la revalidación con `confirmarReserva` y la asignación con `asignarAgenteAReserva`; verificar con pruebas de servicio del rechazo por bloqueo, la revalidación agotada y la confirmación exitosa con descuento de TEU/cupos.

## 3. Rutas y pantallas

- [x] 3.1 Agregar `GET /booking` y `POST /booking` con el formulario (empresa con estado visible, viaje, hasta tres líneas de contenedor, mercancía y contrato), la lista de errores y los mensajes de rechazo; verificar con supertest los casos de datos inválidos y `sin_cupo`.
- [x] 3.2 Agregar `GET /booking/:id/comprobante` y la navegación «Solicitar reserva» desde disponibilidad y el encabezado; verificar que el comprobante muestre código Booking, viaje, contenedores, contrato, plazo y agente.
- [x] 3.3 Escribir `tests/hu04.test.ts` con una prueba de integración por escenario Gherkin: confirmación exitosa por 5 contenedores `20GP` con comprobante y descuento, y rechazo por bloqueo sin descontar cupos; verificar con `npm test`.

## 4. Cierre

- [x] 4.1 Ejecutar `npm run db:reset`, `npm test` y `npm run typecheck`; verificar que las 46 pruebas previas y las nuevas pasen y que el recorrido manual de ambos escenarios funcione en `http://localhost:3000`.
- [x] 4.2 Actualizar `README.md` con el recorrido de HU-04, la empresa bloqueada de ejemplo y cómo correr las pruebas; verificar que los comandos documentados funcionen tal como están escritos.

## Workflow follow-up

- Validar el sistema con la skill `cin324-validar-sistema` antes de archivar.
- Archivar el cambio con `openspec-archive-change` cuando la validación no tenga observaciones pendientes.
