# Spec Delta — gestion-inventario-espacio

## ADDED Requirements

### Requirement: Confirmación con capacidad insuficiente según el tope de sobrecupo

Al intentar confirmar una `Reserva temporal` cuya carga no cabe en la capacidad del viaje o en el cupo de algún tipo, el sistema DEBE (MUST) comparar el sobrecupo acumulado con el tope de sobrecupo (3 % de la capacidad total del buque, inclusivo): si lo supera, la reserva queda `Rechazada`; si no, queda "En lista de espera" en la última posición. En ambos casos NO DEBE alterar la capacidad ni los cupos.

#### Scenario: Rechazo de confirmación de reserva por capacidad insuficiente sobre el tope de sobrecupo

- **GIVEN** un viaje programado usa un buque con capacidad total de 100 TEUs
- **AND** el viaje cuenta únicamente con 4 TEUs de capacidad disponible
- **AND** no existen reservas "En lista de espera" para ese viaje
- **WHEN** se intenta confirmar una solicitud de reserva por 10 TEUs para ese mismo viaje
- **THEN** se rechaza la confirmación de la reserva porque el sobrecupo acumulado de 6 TEUs supera el tope de sobrecupo de 3 TEUs
- **AND** la capacidad disponible del viaje se mantiene en 4 TEUs sin alteraciones

#### Scenario: Confirmación con capacidad insuficiente dentro del tope pasa a lista de espera (EST-01)

- **GIVEN** un viaje programado usa un buque con capacidad total de 100 TEUs y cuenta con 4 TEUs de capacidad disponible
- **AND** no existen reservas "En lista de espera" para ese viaje
- **WHEN** se intenta confirmar una reserva "Reserva temporal" por 6 TEUs para ese viaje
- **THEN** la reserva queda "En lista de espera" en la posición 1 porque el sobrecupo acumulado de 2 TEUs no supera el tope de 3 TEUs
- **AND** la capacidad disponible del viaje se mantiene en 4 TEUs sin alteraciones

## MODIFIED Requirements

### Requirement: Restitución automática de cupo por cancelación dentro del plazo

El sistema DEBE (MUST) restituir a la capacidad disponible del viaje y al cupo del tipo de contenedor los TEUs de una reserva `Confirmada` que cambia a estado `Cancelada` dentro del plazo máximo de cancelación y, a continuación, DEBE (MUST) revisar la lista de espera del viaje para confirmar la primera reserva que quepa completa.

#### Scenario: Restitución automática de cupo por cancelación dentro del plazo permitido

- **GIVEN** un viaje tiene una capacidad disponible de 30 TEUs
- **AND** existe una reserva "Confirmada" de 8 TEUs cuyo zarpe se encuentra dentro del plazo permitido de anulación
- **WHEN** la reserva cambia su estado a "Cancelada"
- **THEN** la capacidad disponible del viaje aumenta automáticamente a 38 TEUs

## REMOVED Requirements

### Requirement: Rechazo de confirmación por capacidad insuficiente

**Reason**: El escenario de HU-02 cambió: la capacidad insuficiente ya no implica siempre «Rechazada»; depende del tope de sobrecupo (07-criterios-aceptacion, HU-02 escenario 2; EST-01).
**Migration**: Reemplazado por «Confirmación con capacidad insuficiente según el tope de sobrecupo».
