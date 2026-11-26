# Tasks — ajuste-hu-04-lista-espera

## 1. Datos: migración 005 y tipos

- [x] 1.1 Crear `src/db/migrations/005_crear_sobre_reserva.sql`: tabla `sobre_reserva` (`reserva_id` PK/FK a `reserva` con `ON DELETE CASCADE`, `posicion_lista_espera INTEGER NULL CHECK >= 1`, `exceso_solicitado_teu INTEGER NOT NULL CHECK >= 0`) e índice; comentario que indica que `Buque.capacidadTotalTEU` ya existe en `buque.capacidad_total_teu` (migración 001) y no se duplica. Verificar con una prueba en `tests/db.test.ts` que la 005 queda en `schema_migrations`, que la tabla existe con esas columnas, que `buque.capacidad_total_teu` sigue presente y que borrar la reserva borra su `sobre_reserva`.
- [x] 1.2 Agregar a `src/dominio/tipos.ts` `posicionListaEspera` y `excesoSolicitadoTEU` (`number | null`) en `Reserva`, y `capacidadTotalTEU` en `CapacidadViaje` (`src/integraciones/sistemaFlota.ts`); verificar con `npm run typecheck`.
- [x] 1.3 En `src/dominio/repositorios.ts`: leer la posición y el exceso con `LEFT JOIN sobre_reserva` en `obtenerReserva`/`listarReservas`; agregar `obtenerReservaPorCodigo`, `registrarSobreReserva`, `salirDeLista` (posición `NULL`), `renumerarLista(viajeId)` (1..n conservando el orden) y `teuEnListaEspera(viajeId)` (E). Verificar con pruebas unitarias en `tests/reservasRepositorio.test.ts`.
- [x] 1.4 Hacer que el ERP simulado devuelva `capacidadTotalTEU` del buque en `consultarCapacidad` y lo registre en `integraciones_log`; verificar en `tests/integracion.test.ts`.

## 2. Datos de ejemplo

- [x] 2.1 En `src/db/seed.ts`: agregar el buque `IMO-9000003` «Buque Austral» de 100 TEU; pasar `VIA-004` a ese buque y `BK-HU02-002` a 10 contenedores `20GP`; agregar viajes del Buque Austral con D = 0 (lista vacía, lista con 3 TEU, lista con 2 + 1 TEU con plazo vencido en la de 2, confirmada 8 + espera 3, confirmada 2 + espera 3, y un viaje con zarpe ya pasado y una reserva en espera) con sus cupos, reservas y filas de `sobre_reserva`. Mantener el seed idempotente (ejecutarlo dos veces no duplica filas) y actualizar los conteos de `tests/seed.test.ts`; verificar con `npm test -- seed`.

## 3. Regla de sobrecupo y transiciones (servicios)

- [x] 3.1 Crear `src/servicios/listaEspera.ts` con `evaluarSobrecupo` (función pura: `q`, `D_efectiva`, `cabe`, `exceso` con el supuesto S-1, `E`, `tope = floor(capacidadTotalTEU × 3 / 100)`, `sobrecupo`) y comentarios de trazabilidad (`// HU-04 CA2, HU-02, EST-01`). Verificar con pruebas unitarias en `tests/listaEspera.test.ts`: tope de 100 → 3 y de 4000 → 120, límite inclusivo (sobrecupo 3 cabe, 4 no), `D_efectiva` por tipo sin fila de cupo y el caso S-1 de varios tipos.
- [x] 3.2 Extraer de `confirmarReserva` el descuento de TEU y cupos a `comprometerInventario` y modificar `confirmarReserva` para que, si la carga no cabe, aplique la regla: `En lista de espera` (registra `sobre_reserva` en la última posición y notificación `lista_espera`) o `Rechazada`, sin tocar el inventario. Verificar con `tests/inventario.test.ts` actualizado.
- [x] 3.3 Implementar `revisarListaEspera(db, viajeId, sistemaFlota)`: recorre por posición, confirma la primera reserva que quepa completa (saltando las que no caben), conserva el código, deja la posición en `NULL`, renumera, registra la asignación en el ERP, asigna agente (HU-03) y notifica (`confirmacion_lista_espera`). Verificar con pruebas unitarias del caso «salta la que no cabe».
- [x] 3.4 Modificar `cancelarReserva`: desde `Confirmada` (dentro del plazo) restituye y llama a `revisarListaEspera`, y devuelve la reserva confirmada desde la lista si la hubo; desde `En lista de espera` cancela sin aplicar el plazo, sale de la lista y renumera, sin tocar el inventario. Verificar con `tests/inventario.test.ts`.
- [x] 3.5 Implementar `cerrarListasPorZarpe(db, hoy)`: `En lista de espera` con `fecha_zarpe ≤ hoy` → `Vencida`, posición `NULL`, renumeración, notificación `vencimiento_lista_espera`; devuelve cuántas vencieron y es idempotente. Verificar con una prueba unitaria que la segunda llamada devuelve 0.
- [x] 3.6 Modificar `registrarBooking` (`src/servicios/booking.ts`): reemplazar `faltaCapacidad`/`sin_cupo` por `evaluarSobrecupo` antes de la evaluación comercial; nuevos resultados `lista_espera` (con posición) y `rechazada_sobrecupo` (registrada como `Rechazada`, con sobrecupo y tope); la revalidación de `confirmarReserva` puede devolver `lista_espera` o `rechazada`. Actualizar `tests/booking.test.ts` (la prueba «informa falta de cupo sin registrar la reserva» pasa a verificar el registro `Rechazada`/`En lista de espera`) y verificar con `npm test -- booking`.

## 4. Rutas y pantallas

- [x] 4.1 `POST /booking` y vistas `booking.ejs`/`comprobante.ejs`: «En lista de espera» redirige al comprobante, que muestra estado, posición y que no hay cupo comprometido; «Rechazada» por sobrecupo muestra el código y el motivo con el sobrecupo y el tope. Actualizar `tests/bookingRutas.test.ts` y verificar con `npm test -- bookingRutas`.
- [x] 4.2 Nueva vista `estado-reserva.ejs` y rutas `GET /booking/estado?codigo=` (estado, viaje, posición; mensaje si el código no existe) y `POST /booking/:id/cancelar` (botón «Cancelar reserva en lista de espera»). Agregar el enlace «Consultar estado de mi reserva» en el encabezado o en `/booking`. Verificar con pruebas de ruta.
- [x] 4.3 `/reservas`: columna «Posición en lista de espera», botón cancelar también para reservas en espera, mensajes de confirmar/cancelar con el nuevo estado (y la reserva confirmada desde la lista, si la hubo) y botón «Cerrar listas de espera vencidas» (`POST /reservas/cerrar-listas`). Actualizar `tests/reservas.test.ts` y verificar con `npm test -- reservas`.
- [x] 4.4 Llamar a `cerrarListasPorZarpe` al inicio de `GET /disponibilidad`, `GET /reservas`, `GET /booking`, `GET /booking/estado` y `GET /booking/:id/comprobante`. Verificar con una prueba que abrir `/reservas` deja «Vencida» una reserva en espera de un viaje ya zarpado.
- [x] 4.5 HU-01: cambiar el texto de `disponibilidad.ejs` para el tipo sin cupo («Sin confirmación inmediata para este tipo; la solicitud puede quedar "En lista de espera" si no supera el tope de sobrecupo.») manteniendo «Solicitar». Actualizar la prueba `HU-01 · Consulta de ruta o tipo de contenedor sin cupos disponibles` en `tests/hu01.test.ts` con los tres `Entonces` del escenario y verificar con `npm test -- hu01`.

## 5. Pruebas por escenario Gherkin (una por escenario nuevo o modificado)

- [x] 5.1 `tests/hu04.test.ts` — `HU-04 · Solicitud dentro del tope de sobrecupo queda en lista de espera`: viaje de 100 TEU con D = 0 y lista vacía; solicitud de 3 TEU → «En lista de espera», código Booking, posición 1, D sigue en 0 y la pantalla muestra estado y posición.
- [x] 5.2 `tests/hu04.test.ts` — `HU-04 · Solicitud sobre el tope de sobrecupo se rechaza automáticamente`: 4 TEU → «Rechazada» registrada, mensaje de tope, D y cupos en 0.
- [x] 5.3 `tests/hu04.test.ts` — `HU-04 · Solicitud rechazada por tope de sobrecupo compartido con la lista de espera`: lista con 3 TEU; otro exportador pide 1 TEU → «Rechazada» (sobrecupo 4 > 3), la de 3 TEU sigue en posición 1 y D en 0.
- [x] 5.4 `tests/hu04.test.ts` — `HU-04 · Consulta del estado y la posición de una reserva en lista de espera`: `GET /booking/estado?codigo=` de la reserva en posición 2 muestra «En lista de espera» y la posición 2.
- [x] 5.5 `tests/hu04.test.ts` — `HU-04 · Reserva en lista de espera vence al llegar la fecha de zarpe`: reserva de 3 TEU en espera en viaje con D = 0 y zarpe ≤ hoy; al cargar una pantalla → «Vencida», sin posición y con notificación al exportador.
- [x] 5.6 `tests/hu02.test.ts` — reemplazar la prueba del escenario 2 por `HU-02 · Rechazo de confirmación de reserva por capacidad insuficiente sobre el tope de sobrecupo` (100 TEU, D = 4, 10 TEU → «Rechazada», sobrecupo 6 > 3, D sigue en 4) y corregir la codificación de los nombres de las pruebas existentes (`Â·` → `·`).
- [x] 5.7 `tests/hu02.test.ts` — `HU-02 · Confirmación desde lista de espera al liberarse cupo por cancelación`: cancelar la confirmada de 8 TEU → la de 3 TEU queda «Confirmada» con el mismo código, D = 5, agente asignado y sin posición.
- [x] 5.8 `tests/hu02.test.ts` — `HU-02 · Reserva en lista de espera se mantiene si el cupo liberado no alcanza`: cancelar la confirmada de 2 TEU → D = 2 y la de 3 TEU sigue «En lista de espera» en posición 1.
- [x] 5.9 `tests/hu02.test.ts` — `HU-02 · Cancelación de una reserva en lista de espera`: cancelar la de 2 TEU con plazo vencido → «Cancelada», sin posición, la de 1 TEU pasa a posición 1 y D sigue en 0.

## 6. Documentación e integración

- [x] 6.1 Actualizar `README.md`: regla de lista de espera y tope de sobrecupo, nuevas pantallas (`/booking/estado`, botón de cierre de listas), datos de ejemplo del Buque Austral y por qué hay que correr `npm run db:reset`, recorrido manual de cada escenario nuevo y aviso de integraciones simuladas. Verificar que los comandos documentados funcionan tal como están escritos.
- [x] 6.2 Ejecutar `npm test` y `npm run typecheck` y verificar que ambos terminan sin errores (todas las pruebas, incluidas HU-01 a HU-04, pasan).

## Workflow follow-up

- Guía de prueba manual para el estudiante y validación del sistema con `/cin324-validar-sistema`.
- Archivar el cambio (`openspec-archive-change`) cuando el estudiante valide; actualizar `.cin324/proyecto.md`.
- Commit, push y tag los hace el estudiante.
