# asignacion-agente-operativo Specification

## Purpose

Asigna automáticamente un agente operativo responsable a cada reserva confirmada según la zona geográfica de su destino y su carga de atención disponible, notificando al agente y al exportador y alertando al administrador cuando no hay agente disponible.

## Requirements

### Requirement: Asignación automática de agente al confirmar una reserva

El sistema DEBE (MUST) asignar a cada `Reserva` que pasa a estado `Confirmada` el `AgenteOperativo` habilitado para la zona geográfica del puerto de destino del viaje que tenga menor cantidad de reservas activas, entre los que no hayan alcanzado su `limiteMaximoReservas`, y DEBE registrar la asociación `gestiona`. Las reservas activas de un agente son sus reservas en estado `Confirmada`; el desempate es el menor `identificadorEmpleado`.

#### Scenario: Asignación exitosa de agente según reglas de ruta y carga de trabajo

- **GIVEN** existen agentes operativos habilitados para la zona geográfica "Asia-Pacífico" con capacidad de atención disponible
- **WHEN** una reserva con destino a la zona "Asia-Pacífico" cambia su estado a "Confirmada"
- **THEN** se asigna automáticamente a la reserva el agente habilitado con menor cantidad de reservas activas
- **AND** se notifica al agente asignado y al exportador los datos de la reserva y del responsable operativo

### Requirement: Alerta al administrador cuando no hay agente con cupo de atención

El sistema DEBE (MUST) dejar la reserva en estado `Confirmada` sin agente asignado y emitir una alerta de asignación manual pendiente al administrador de la naviera cuando no exista un agente de la zona de destino con cupo de atención. La reserva permanece en estado `Confirmada`; «sin agente asignado» es la ausencia de la asociación `gestiona` y se muestra con la etiqueta «Confirmada sin agente asignado».

#### Scenario: Escalamiento por falta de agentes disponibles con cupo de atención en la zona

- **GIVEN** todos los agentes operativos de la zona "Europa" han alcanzado su límite máximo de reservas activas
- **WHEN** una reserva con destino a la zona "Europa" cambia su estado a "Confirmada"
- **THEN** la reserva queda registrada en estado "Confirmada sin agente asignado"
- **AND** se emite una alerta de asignación manual pendiente dirigida al administrador de la naviera

### Requirement: Reintento de asignación desde la alerta

El sistema DEBE (MUST) permitir al administrador de la naviera reintentar la asignación de una reserva `Confirmada` que no tiene agente, aplicando la misma regla de selección, retirando la alerta cuando la asignación se logra y notificando al agente y al exportador.

#### Scenario: Reintento exitoso cuando se libera cupo de atención

- **GIVEN** una reserva `Confirmada` sin agente asignado y su alerta de asignación manual pendiente
- **AND** un agente operativo de la zona de destino ya tiene cupo de atención disponible
- **WHEN** el administrador de la naviera reintenta la asignación desde la lista de reservas sin agente
- **THEN** se asigna a la reserva el agente de la zona con menor cantidad de reservas activas
- **AND** la alerta de asignación manual pendiente deja de estar pendiente
- **AND** se notifica al agente asignado y al exportador
