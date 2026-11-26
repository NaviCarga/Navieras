# Spec Delta — lista-espera

## Purpose

Gestiona la lista de espera por sobrecupo de cada viaje: las reservas «En lista de espera» (`SobreReserva`) con su posición, su consulta por el exportador, su confirmación automática cuando se libera cupo, su cancelación y su vencimiento al llegar la fecha de zarpe.

## ADDED Requirements

### Requirement: Confirmación automática desde la lista de espera al liberarse cupo

Cuando una reserva `Confirmada` se cancela dentro del plazo y se restituye capacidad, el sistema DEBE (MUST) recorrer la lista de espera del viaje por orden de posición y confirmar la primera reserva que quepa completa, conservando su código Booking, descontando capacidad y cupos, asignando agente operativo y notificando al exportador. Las que no caben siguen en la lista.

#### Scenario: Confirmación desde lista de espera al liberarse cupo por cancelación

- **GIVEN** un viaje programado usa un buque con capacidad total de 100 TEUs y su capacidad disponible es de 0 TEUs
- **AND** existe una reserva "Confirmada" de 8 TEUs cuyo zarpe se encuentra dentro del plazo permitido de anulación
- **AND** existe una reserva "En lista de espera" de 3 TEUs en la posición 1 de la lista de espera del viaje
- **WHEN** la reserva "Confirmada" de 8 TEUs cambia su estado a "Cancelada"
- **THEN** la reserva de 3 TEUs cambia su estado a "Confirmada" conservando su código de reserva (Booking)
- **AND** la capacidad disponible del viaje queda en 5 TEUs
- **AND** se asigna automáticamente un agente operativo a la reserva confirmada
- **AND** la reserva deja de figurar en la lista de espera y de contar para el tope de sobrecupo del viaje

#### Scenario: Reserva en lista de espera se mantiene si el cupo liberado no alcanza

- **GIVEN** un viaje programado usa un buque con capacidad total de 100 TEUs y su capacidad disponible es de 0 TEUs
- **AND** existe una reserva "Confirmada" de 2 TEUs cuyo zarpe se encuentra dentro del plazo permitido de anulación
- **AND** existe una reserva "En lista de espera" de 3 TEUs en la posición 1 de la lista de espera del viaje
- **WHEN** la reserva "Confirmada" de 2 TEUs cambia su estado a "Cancelada"
- **THEN** la capacidad disponible del viaje aumenta automáticamente a 2 TEUs
- **AND** la reserva de 3 TEUs se mantiene en estado "En lista de espera" en la posición 1

#### Scenario: Se confirma la primera reserva de la lista que cabe completa (decisión confirmada)

- **GIVEN** un viaje con capacidad disponible de 0 TEUs, una reserva "En lista de espera" de 3 TEUs en la posición 1 y otra de 2 TEUs en la posición 2
- **AND** existe una reserva "Confirmada" de 2 TEUs dentro del plazo permitido de anulación
- **WHEN** la reserva "Confirmada" de 2 TEUs cambia su estado a "Cancelada"
- **THEN** la reserva de 2 TEUs cambia a "Confirmada" y la capacidad disponible del viaje queda en 0 TEUs
- **AND** la reserva de 3 TEUs se mantiene "En lista de espera" en la posición 1

### Requirement: Cancelación de una reserva en lista de espera

El sistema DEBE (MUST) permitir cancelar una reserva «En lista de espera» sin aplicar el plazo máximo de cancelación: pasa a `Cancelada`, deja de figurar en la lista y de contar para el tope de sobrecupo, se recalculan las posiciones restantes y la capacidad del viaje no cambia.

#### Scenario: Cancelación de una reserva en lista de espera

- **GIVEN** un viaje programado usa un buque con capacidad total de 100 TEUs y su capacidad disponible es de 0 TEUs
- **AND** existe una reserva "En lista de espera" de 2 TEUs en la posición 1 de la lista de espera del viaje
- **AND** existe otra reserva "En lista de espera" de 1 TEU en la posición 2
- **AND** la fecha de cancelación es posterior al plazo máximo de cancelación de la reserva de 2 TEUs
- **WHEN** el exportador cancela la reserva de 2 TEUs ("Cancelar reserva en lista de espera")
- **THEN** la reserva de 2 TEUs cambia su estado a "Cancelada" sin aplicar el plazo máximo de cancelación
- **AND** la reserva de 2 TEUs deja de figurar en la lista de espera y de contar para el tope de sobrecupo del viaje
- **AND** la reserva de 1 TEU pasa a la posición 1 de la lista de espera
- **AND** la capacidad disponible del viaje se mantiene en 0 TEUs

### Requirement: Consulta del estado y la posición en la lista de espera

El sistema DEBE (MUST) permitir al exportador consultar una reserva por su código Booking y mostrar su estado y, si está «En lista de espera», su posición en la lista del viaje. El comprobante de la reserva y el listado de reservas de la Naviera DEBEN (MUST) mostrar también la posición.

#### Scenario: Consulta del estado y la posición de una reserva en lista de espera

- **GIVEN** que el exportador tiene una reserva en estado "En lista de espera" en la posición 2 de la lista de espera de un viaje
- **WHEN** el exportador consulta el estado de su reserva
- **THEN** se muestra el estado "En lista de espera"
- **AND** se muestra la posición 2 en la lista de espera del viaje

### Requirement: Vencimiento de la lista de espera por zarpe

Cuando llega la fecha de zarpe de un viaje, el sistema DEBE (MUST) pasar a `Vencida` cada reserva «En lista de espera» de ese viaje, quitarla de la lista, recalcular posiciones y notificar al exportador. El cierre DEBE (MUST) ejecutarse al consultar las pantallas de disponibilidad, reservas, booking y comprobante, y a pedido de la Naviera, sin repetir el efecto.

#### Scenario: Reserva en lista de espera vence al llegar la fecha de zarpe

- **GIVEN** que el exportador tiene una reserva "En lista de espera" de 3 TEUs en un viaje con capacidad disponible de 0 TEUs
- **WHEN** llega la fecha de zarpe del viaje sin que se haya liberado cupo suficiente para la reserva
- **THEN** la reserva cambia a estado "Vencida"
- **AND** la reserva deja de figurar en la lista de espera del viaje
- **AND** se notifica al exportador que su reserva quedó "Vencida" por el zarpe del viaje
