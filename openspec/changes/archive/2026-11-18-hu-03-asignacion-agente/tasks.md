# Tasks

## 1. Datos y dominio (modelo `AgenteOperativo` y asociación `gestiona`)

- [x] 1.1 Crear `src/db/migrations/003_crear_agente_operativo.sql` con `agente_operativo`, `reserva.agente_operativo_id` (nullable, FK `ON DELETE SET NULL`) y `notificacion`; verificar que arranca sobre una base existente y que `schema_migrations` registra la migración (`npm run db:reset`).
- [x] 1.2 Agregar `AgenteOperativo`, `Notificacion` y el agente opcional de `ReservaConDetalles` en `src/dominio/tipos.ts`; verificar que `npx tsc --noEmit` compila sin errores.
- [x] 1.3 Implementar en `src/dominio/repositorios.ts`: `listarAgentes` (con `/reservasActivasActuales` calculado), `obtenerAgente`, `listarReservasConfirmadasSinAgente`, `listarReservasDeAgente`, `asignarAgenteAReserva`, `listarNotificacionesDeAgente`, `registrarNotificacion` y el agente en `SELECT_RESERVA`; verificar con pruebas unitarias de repositorio (`npm test -- tests/reservasRepositorio.test.ts` y las pruebas nuevas de agentes).
- [x] 1.4 Ampliar `src/db/seed.ts` con los agentes A-001 a A-004, el viaje `VIA-006` y las reservas `BK-HU03-001` (temporal Asia-Pacífico), `BK-HU03-002` (confirmada Europa asignada a Carla) y la asignación de `BK-HU02-003` a Diego; verificar que `npm run db:seed` es idempotente y actualizar `tests/seed.test.ts` a los nuevos totales (6 viajes, 6 cupos, 5 reservas) dejando `npm test -- tests/seed.test.ts` en verde.

## 2. Lógica de asignación automática

- [x] 2.1 Crear `src/servicios/asignacion.ts` con `asignarAgenteAReserva` idempotente: zona del puerto de destino, candidatos con cupo, orden por `/reservasActivasActuales` y `identificadorEmpleado`, guardado de `agente_operativo_id` y notificaciones a agente y exportador; verificar con pruebas unitarias de los casos éxito, límite alcanzado, desempate y zona sin agentes.
- [x] 2.2 Integrar la asignación en `src/rutas/reservas.ts` después de una confirmación exitosa y ampliar el mensaje con el agente asignado o con el aviso de alerta; verificar que `npm test -- tests/hu02.test.ts` sigue en verde y que el mensaje muestra el resultado de la asignación.
- [x] 2.3 Mantener la confirmación idempotente: confirmar dos veces o asignar una reserva que ya tiene agente no duplica notificaciones ni cambia el responsable; verificar con una prueba que el segundo intento no altera el agente ni el conteo de notificaciones.

## 3. Pantallas, roles y alertas (flujo reconstruido de CU-05/CU-06)

- [x] 3.1 Agregar `src/vistas/agente.ejs` y la ruta `GET /agente` con selector de agente (`?agente=<identificadorEmpleado>`), mostrando reservas asignadas y notificaciones; verificar con `supertest` que un agente con reservas ve su booking y su mensaje de notificación.
- [x] 3.2 Agregar `src/vistas/alertas.ejs` y la ruta `GET /alertas`, con reservas `Confirmada` sin agente y tabla de agentes con carga actual y límite; verificar que una reserva confirmada sin agente aparece en la pantalla y que un agente en el límite se muestra como sin cupo.
- [x] 3.3 Implementar `POST /alertas/:reservaId/reintentar` con los mensajes de éxito («Agente asignado a la reserva BK-…: …») y de error («No se pudo asignar la reserva BK-…: todos los agentes de la zona "…" alcanzaron su límite de reservas activas.»); verificar con pruebas que la asignación retira la reserva de la lista de alertas.
- [x] 3.4 Actualizar `src/app.ts` (`DESTINO_POR_ROL`: `agente → /agente`, `administrador → /alertas`), el encabezado con enlaces por rol y la columna «Agente» de `src/vistas/reservas.ejs` con la etiqueta «Sin agente asignado»; verificar que el cambio de rol lleva a la pantalla correcta y que `/reservas` muestra el responsable.

## 4. Pruebas de aceptación Gherkin

- [x] 4.1 Crear `tests/hu03.test.ts` con la prueba `HU-03 · Asignación exitosa de agente según reglas de ruta y carga de trabajo` (reserva Asia-Pacífico, verifica agente de menor carga y notificaciones al agente y al exportador).
- [x] 4.2 Agregar la prueba `HU-03 · Escalamiento por falta de agentes disponibles con cupo de atención en la zona` (Europa con todos los agentes en el límite, verifica reserva `Confirmada` sin agente y alerta al administrador).
- [x] 4.3 Agregar la prueba `HU-03 · Reintento exitoso cuando se libera cupo de atención` (reintento desde `/alertas`, verifica asignación, notificación y que la alerta deja de mostrarse).
- [x] 4.4 Ejecutar la suite completa (`npm test`) y verificar que todas las pruebas de HU-01, HU-02 y HU-03 pasan.

## 5. Documentación

- [x] 5.1 Actualizar `README.md` con la migración, el seed ampliado, los roles de demostración, el recorrido de los tres escenarios de HU-03 y el comando de pruebas; verificar siguiendo el README desde una base limpia (`npm run db:reset` y `npm run dev`).

## Workflow follow-up

- Validar el sistema con el estudiante mediante `/cin324-validar-sistema`.
- Archivar el cambio con `/opsx-archive` cuando la validación cierre sin observaciones pendientes.
