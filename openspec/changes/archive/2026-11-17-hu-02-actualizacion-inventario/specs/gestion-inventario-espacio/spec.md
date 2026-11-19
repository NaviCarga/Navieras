# Spec Delta

## Purpose

Actualiza de forma transaccional el inventario de espacio de un viaje y de sus cupos por tipo de contenedor cuando una reserva se confirma o se cancela, para mantener la disponibilidad publicada y evitar sobreventas.

## ADDED Requirements

### Requirement: Descuento automático de cupo al confirmar una reserva

El sistema DEBE (MUST) descontar de la capacidad disponible del viaje y del cupo del tipo de contenedor los TEUs de una reserva que cambia a estado `Confirmada`, y DEBE dejar esos TEUs comprometidos y asociados a la reserva confirmada.

#### Scenario: Descuento automático de cupo al confirmar una reserva

- **GIVEN** un viaje programado cuenta con una capacidad disponible de 50 TEUs
- **AND** existe una solicitud de reserva válida por un total de 10 TEUs para dicho viaje
- **WHEN** la reserva cambia su estado a "Confirmada"
- **THEN** la capacidad disponible del viaje se reduce automáticamente a 40 TEUs
- **AND** el cupo de 10 TEUs queda comprometido y asociado a la reserva confirmada

### Requirement: Rechazo de confirmación por capacidad insuficiente

El sistema DEBE (MUST) rechazar la confirmación de una reserva cuando la capacidad disponible del viaje o del cupo del tipo de contenedor sea menor que los TEUs solicitados, dejando la reserva en estado `Rechazada` y sin alterar la capacidad disponible existente.

#### Scenario: Rechazo de confirmación de reserva por capacidad insuficiente (prevención de sobreventa)

- **GIVEN** un viaje programado cuenta únicamente con 4 TEUs de capacidad disponible
- **WHEN** se intenta confirmar una solicitud de reserva por 6 TEUs para ese mismo viaje
- **THEN** se rechaza la confirmación de la reserva por falta de capacidad en el buque
- **AND** la capacidad disponible del viaje se mantiene en 4 TEUs sin alteraciones

### Requirement: Restitución automática de cupo por cancelación dentro del plazo

El sistema DEBE (MUST) restituir a la capacidad disponible del viaje y al cupo del tipo de contenedor los TEUs de una reserva `Confirmada` que cambia a estado `Cancelada` dentro del plazo máximo de cancelación.

#### Scenario: Restitución automática de cupo por cancelación dentro del plazo permitido

- **GIVEN** un viaje tiene una capacidad disponible de 30 TEUs
- **AND** existe una reserva "Confirmada" de 8 TEUs cuyo zarpe se encuentra dentro del plazo permitido de anulación
- **WHEN** la reserva cambia su estado a "Cancelada"
- **THEN** la capacidad disponible del viaje aumenta automáticamente a 38 TEUs

### Requirement: Rechazo de cancelación fuera del plazo máximo

El sistema DEBE (MUST) rechazar la cancelación de una reserva `Confirmada` cuando la fecha actual supere su plazo máximo de cancelación, manteniendo la reserva en estado `Confirmada` y sin alterar la capacidad disponible.

#### Scenario: Rechazo de cancelación de una reserva fuera del plazo permitido

- **GIVEN** existe una reserva "Confirmada" de 8 TEUs cuyo plazo máximo de cancelación ya venció
- **WHEN** se intenta cancelar la reserva
- **THEN** se rechaza la cancelación por estar fuera del plazo permitido
- **AND** la reserva se mantiene en estado "Confirmada" y la capacidad disponible no cambia
