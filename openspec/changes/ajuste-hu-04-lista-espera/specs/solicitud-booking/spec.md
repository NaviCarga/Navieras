# Spec Delta — solicitud-booking

## ADDED Requirements

### Requirement: Solicitud sin cupo dentro del tope de sobrecupo queda en lista de espera

Con `q` = TEUs solicitados, `D_efectiva` = menor valor entre la capacidad disponible del viaje y la suma de los cupos disponibles de los tipos solicitados, `E` = TEUs del viaje "En lista de espera" y `tope` = 3 % de la capacidad total del buque (inclusivo): si la carga no cabe y `E + (q − D_efectiva) ≤ tope`, el sistema DEBE (MUST) registrar la reserva "En lista de espera" con código Booking y la última posición, sin evaluación comercial ni descuento.

#### Scenario: Solicitud dentro del tope de sobrecupo queda en lista de espera

- **GIVEN** un viaje programado usa un buque con capacidad total de 100 TEUs
- **AND** la capacidad disponible del viaje es de 0 TEUs
- **AND** no existen reservas "En lista de espera" para ese viaje
- **WHEN** el exportador registra una solicitud de reserva por 3 TEUs para ese viaje
- **THEN** la reserva se registra en estado "En lista de espera" con un código único de reserva (Booking)
- **AND** la reserva queda en la posición 1 de la lista de espera del viaje
- **AND** la capacidad disponible del viaje se mantiene en 0 TEUs
- **AND** se informa al exportador el estado "En lista de espera" y su posición

### Requirement: Solicitud sin cupo sobre el tope de sobrecupo se rechaza

Si la carga no cabe y el sobrecupo acumulado `E + (q − D_efectiva)` supera el tope de sobrecupo del viaje, el sistema DEBE (MUST) registrar la solicitud como reserva en estado "Rechazada", informar al exportador que supera el tope de sobrecupo y NO DEBE descontar capacidad ni cupos.

#### Scenario: Solicitud sobre el tope de sobrecupo se rechaza automáticamente

- **GIVEN** un viaje programado usa un buque con capacidad total de 100 TEUs
- **AND** la capacidad disponible del viaje es de 0 TEUs
- **AND** no existen reservas "En lista de espera" para ese viaje
- **WHEN** el exportador registra una solicitud de reserva por 4 TEUs para ese viaje
- **THEN** la solicitud de reserva cambia a estado "Rechazada"
- **AND** se informa al exportador que la solicitud supera el tope de sobrecupo del viaje
- **AND** la capacidad disponible del viaje se mantiene en 0 TEUs sin descontar cupos

#### Scenario: Solicitud rechazada por tope de sobrecupo compartido con la lista de espera

- **GIVEN** un viaje programado usa un buque con capacidad total de 100 TEUs
- **AND** la capacidad disponible del viaje es de 0 TEUs
- **AND** existe una reserva "En lista de espera" de 3 TEUs para ese viaje
- **WHEN** otro exportador registra una solicitud de reserva por 1 TEU para ese viaje
- **THEN** la solicitud de reserva cambia a estado "Rechazada" porque el sobrecupo acumulado de 4 TEUs supera el tope de sobrecupo de 3 TEUs
- **AND** la reserva de 3 TEUs se mantiene "En lista de espera" en la posición 1
- **AND** la capacidad disponible del viaje se mantiene en 0 TEUs sin descontar cupos

### Requirement: Reserva temporal y revalidación con regla de sobrecupo

Cuando la solicitud es válida y la carga cabe, el sistema DEBE (MUST) registrar la reserva en `Reserva temporal` y revalidar la disponibilidad justo antes de confirmar con la misma regla de sobrecupo. Si ya no cabe, DEBE (MUST) liberar el cupo bloqueado y dejar la reserva "En lista de espera" (sobrecupo dentro del tope) o "Rechazada" (sobre el tope), informando al exportador.

#### Scenario: Revalidación con disponibilidad vigente

- **GIVEN** una solicitud válida registrada en estado "Reserva temporal"
- **WHEN** el sistema revalida la disponibilidad antes de confirmar
- **THEN** el cupo bloqueado se mantiene
- **AND** la reserva continúa hacia el estado "Confirmada"

#### Scenario: Disponibilidad agotada al revalidar

- **GIVEN** una solicitud registrada en estado "Reserva temporal"
- **WHEN** al revalidar la disponibilidad ya no existe capacidad suficiente para la carga
- **THEN** la reserva no se confirma y el cupo bloqueado se libera
- **AND** la reserva queda "En lista de espera" con su posición si el sobrecupo acumulado no supera el tope, o "Rechazada" si lo supera, y se informa al exportador

## REMOVED Requirements

### Requirement: Verificación preliminar de disponibilidad

**Reason**: Con el cambio del profesor una solicitud sin cupo ya no se descarta sin registrarse: queda "En lista de espera" o "Rechazada" según el tope de sobrecupo (HU-04 CA2, EST-01).
**Migration**: Reemplazado por «Solicitud sin cupo dentro del tope de sobrecupo queda en lista de espera» y «Solicitud sin cupo sobre el tope de sobrecupo se rechaza».

### Requirement: Reserva temporal y revalidación de disponibilidad

**Reason**: Al revalidar sin cupo la reserva ya no queda siempre "Rechazada"; aplica la regla de sobrecupo (EST-01: `Revalidando → En lista de espera / Rechazada`).
**Migration**: Reemplazado por «Reserva temporal y revalidación con regla de sobrecupo».
