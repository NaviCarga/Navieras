# Proposal

## Why

Hoy las reservas confirmadas no tienen un responsable operativo asignado: el administrador de la naviera debe decidir a mano quién atiende cada booking y avisar por canales externos, lo que retrasa la gestión y deja al exportador sin un punto de contacto claro. La historia **HU-03** pide que el sistema asigne automáticamente un agente operativo según la zona del destino y su carga de trabajo, y que notifique a las partes.

## What Changes

- Al confirmarse una reserva, el sistema determina la zona geográfica del puerto de destino del viaje y busca entre los `AgenteOperativo` habilitados para esa zona que aún tengan cupo de atención (`/reservasActivasActuales` < `limiteMaximoReservas`).
- Si hay candidatos, asigna el agente con **menor cantidad de reservas activas** (desempate por menor `identificadorEmpleado`) y guarda la asociación `gestiona`.
- Si no hay candidatos, la reserva permanece `Confirmada` **sin agente asignado** y se emite una alerta de asignación manual pendiente al administrador.
- Se registran notificaciones internas para el agente asignado y el exportador con los datos de la reserva y del responsable.
- Se agrega la pantalla **Panel del agente** (reservas asignadas y notificaciones) y la vista **Alertas del administrador** (reservas sin agente, con opción de reintentar la asignación).
- Se amplía el selector de rol de demostración para distinguir el usuario de cada actor y se cargan agentes y reservas confirmadas de ejemplo (Asia-Pacífico, Europa y Sudamérica).
- No se modifica el comportamiento de inventario ya especificado: HU-03 se dispara después de que la reserva queda `Confirmada`.

**Fuera de alcance:**
- Registro, validación y confirmación de solicitudes de reserva (HU-04 / CU-02, DSS-02): esta historia consume reservas ya confirmadas (de ejemplo o confirmadas por HU-02).
- Asignación manual completa de un agente a elección del administrador: solo alerta, lista de pendientes y reintento automático (decisión D5 de la ficha).
- Notificación real por correo: se simula como registro interno visible en los paneles.
- Autenticación real y control de acceso (RP-24) y demás requisitos no funcionales: no se implementan; se usa el selector de rol de demostración.
- Otros requisitos no funcionales (RP-20, RP-21, RP-23, RP-25) quedan como contexto.

## Capabilities

### New Capabilities
- `asignacion-agente-operativo`: asignación automática de un `AgenteOperativo` a cada `Reserva` confirmada según la zona del destino y la carga de atención, con notificaciones internas y alerta al administrador cuando no hay agente disponible.

### Modified Capabilities
- (ninguna: los requisitos de `gestion-inventario-espacio` no cambian; HU-03 se apoya en la transición a `Confirmada` que ya existe)

## Impact

- **Historia y trazabilidad:** HU-03 (`04-historias-usuario.md`), actividad TO-BE «Asignación automatizada de ejecutivos…» derivada de la Iniciativa 14 «Case manager» (`02-rediseno-to-be.md`), casos de uso **CU-05** y **CU-06** (`09-casos-de-uso.md`), requisito **RP-26** (apoyo RP-15 y RP-14), ficha `.cin324/historias/HU-03.md`. No hay DSS; flujo reconstruido.
- **Datos:** nueva tabla `agente_operativo` (clase `AgenteOperativo`), columna `agente_operativo_id` en `reserva` (asociación `gestiona` 0..1) y tabla `notificacion` (registro interno, no clase de dominio). Nueva migración numerada; nada de reescribir migraciones previas.
- **Código:** `src/dominio/tipos.ts`, `src/dominio/repositorios.ts`, nuevo `src/servicios/asignacion.ts`, `src/rutas/asignacion.ts` (panel del agente y alertas del administrador), integración en `src/servicios/inventario.ts` al confirmar, vistas EJS nuevas (`agente.ejs`, `alertas.ejs`) y encabezado con navegación por rol, `src/db/seed.ts` y `src/app.ts`.
- **Pruebas:** una por escenario Gherkin de HU-03, más pruebas de la regla de selección y del reintento de asignación.
- **Documentación:** `README.md` con el recorrido de HU-03.
