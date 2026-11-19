# Proposal

## Why

La disponibilidad que ve el exportador en el portal puede quedar desactualizada si el cupo no se descuenta al confirmar una reserva o no se restituye al cancelarla, lo que produce sobreventas y errores de inventario. Esta historia implementa la actualización automática del inventario de espacio (HU-02), trazada a las actividades TO-BE «Revalida disponibilidad al confirmar» y «Asigna buques, contenedores y BL; registra automáticamente», y a los casos de uso CU-03 (cancelar reserva dentro del plazo) y CU-04 (actualizar capacidad disponible y cupos del viaje).

## What Changes

- Se agrega una **pantalla de reservas** para el rol de demostración «Naviera», con el estado, el viaje, los TEUs y los tipos de contenedor de cada reserva.
- Se agrega la acción **Confirmar reserva**: revalida la capacidad del viaje y de cada cupo por tipo; si alcanza, descuenta los TEUs y deja la reserva en estado `Confirmada`; si no alcanza, la deja en `Rechazada` sin modificar los cupos.
- Se agrega la acción **Cancelar reserva** para reservas `Confirmadas`: si la fecha actual está dentro de `plazoMaximoCancelacion`, restituye los TEUs y deja la reserva en `Cancelada`; si está fuera del plazo, rechaza la cancelación sin modificar nada.
- Se actualizan **`Viaje.capacidadDisponibleTEU`** y **`CupoContenedor.cantidadDisponible`** de forma transaccional, discriminando el tipo de contenedor mediante `DetalleReserva`.
- El **Sistema Central de Flota (ERP Naviero)** se implementa como una integración simulada que consulta la capacidad y registra la asignación, dejando cada llamada en el log de integraciones.
- Se agregan **datos de ejemplo** con reservas en estado `Reserva temporal` y `Confirmada`, con detalles por tipo de contenedor.
- Se agregan **pruebas automáticas**, una por cada escenario Gherkin de HU-02.

**Fuera de alcance:** el formulario completo de solicitud de reserva/booking y sus validaciones (HU-04), el vencimiento automático de la reserva temporal (RP-07 y transición a `Vencida`), la asignación automática de agente operativo (HU-03), las notificaciones reales por correo, los requisitos no funcionales RP-20, RP-21 y RP-25, y la autenticación real. La acción de confirmar existe solo para poder demostrar y probar el inventario; no sustituye el flujo de booking de HU-04.

## Capabilities

### New Capabilities
- `gestion-inventario-espacio`: actualización transaccional del inventario de espacio de un viaje y de sus cupos por tipo de contenedor al confirmar o cancelar una reserva, con prevención de sobreventa y restitución dentro del plazo.

### Modified Capabilities
- Ninguna. No existen capacidades previas en `openspec/specs/` (la capacidad de HU-01 aún no se ha archivado).

## Impact

- **Código nuevo:** dominio y repositorios de `Reserva`, `DetalleReserva` y `EmpresaExportadora`; servicio de inventario; rutas `GET /reservas`, `POST /reservas/:id/confirmar` y `POST /reservas/:id/cancelar`; vistas de reservas; ampliación del adaptador simulado del ERP con consulta de capacidad y registro de asignación.
- **Base de datos:** migración `002` con las tablas `empresa_exportadora`, `reserva` y `detalle_reserva`, y datos de ejemplo para los tres escenarios.
- **Dependencias:** las ya instaladas (`express`, `ejs`, `better-sqlite3`, `typescript`, `tsx`, `vitest`, `supertest`); no se agregan dependencias nuevas.
- **Pruebas:** una prueba de integración por escenario Gherkin de HU-02, más pruebas de inventario y de transacciones.
- **Trazabilidad:** HU-02, CU-03, CU-04, EST-01, EST-02 y RP-20 (no funcional, solo contexto).
