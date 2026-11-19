# Spec Delta

## Purpose

Permite al exportador solicitar y obtener la confirmación de una reserva de espacio (booking) sobre un viaje disponible, validando sus datos y estado comercial, verificando y revalidando el cupo del viaje y emitiendo un comprobante con un código único de reserva.

## ADDED Requirements

### Requirement: Registro de la solicitud de booking

El sistema DEBE (MUST) ofrecer al exportador un formulario único para solicitar una reserva sobre un viaje disponible, con empresa exportadora, tipo y cantidad de contenedores con su detalle, tipo de mercancía, peso estimado y número de contrato obligatorio. La solicitud DEBE (MUST) quedar asociada a una `EmpresaExportadora`, a un `Viaje` y contener al menos una línea de `DetalleReserva`.

#### Scenario: Registro de los datos de la solicitud

- **GIVEN** un exportador que accede al formulario de booking de un viaje disponible
- **WHEN** registra la empresa exportadora, el detalle de contenedores, el tipo de mercancía, el peso estimado y el número de contrato
- **THEN** el sistema asocia la solicitud a esa empresa y a ese viaje con al menos una línea de detalle
- **AND** el número de contrato queda registrado en la reserva

### Requirement: Validación de datos obligatorios y contrato

Antes de registrar una solicitud, el sistema DEBE (MUST) validar que todos los campos obligatorios estén informados y que el número de contrato tenga el formato requerido. Si falta un dato o el contrato es inválido, DEBE (MUST) mostrar los errores, no registrar la solicitud y no modificar el inventario del viaje.

#### Scenario: Rechazo de una solicitud con datos inconsistentes

- **GIVEN** un exportador que completa el formulario de booking
- **WHEN** envía la solicitud sin el número de contrato o sin detalle de contenedores
- **THEN** el sistema muestra los errores para corregir
- **AND** no registra la solicitud ni modifica el inventario del viaje

### Requirement: Verificación preliminar de disponibilidad

El sistema DEBE (MUST) verificar, antes de registrar la solicitud, que la capacidad disponible del viaje y el cupo del tipo de contenedor alcancen para la carga solicitada. Si no alcanzan, DEBE (MUST) informar la falta de cupo sin descontar inventario y sin registrar la reserva.

#### Scenario: Rechazo de una solicitud sin cupo suficiente

- **GIVEN** un viaje que no dispone de cupo suficiente para la cantidad de contenedores solicitada
- **WHEN** el exportador registra la solicitud de reserva
- **THEN** el sistema informa la falta de cupo en el viaje
- **AND** no descuenta capacidad ni registra la reserva

### Requirement: Validación comercial y aduanera del exportador

El sistema DEBE (MUST) validar el estado comercial y documental del exportador mediante el Sistema de Evaluación Comercial y Aduana simulado antes de confirmar la reserva. Si el exportador registra un bloqueo vigente, la solicitud DEBE (MUST) quedar en estado `Rechazada`, informando el motivo y sin descontar cupos del inventario.

#### Scenario: Rechazo de solicitud de reserva por bloqueo comercial o documental del exportador

- **GIVEN** que el exportador registra un bloqueo vigente en su evaluación comercial o aduanera
- **AND** el viaje seleccionado dispone de cupos suficientes para la carga solicitada
- **WHEN** el exportador registra una solicitud de reserva de espacio
- **THEN** la solicitud de reserva cambia a estado "Rechazada"
- **AND** se informa al exportador el motivo del rechazo sin descontar cupos del inventario del viaje

### Requirement: Reserva temporal y revalidación de disponibilidad

Cuando la solicitud es válida, el sistema DEBE (MUST) registrar la reserva en estado `Reserva temporal`, manteniendo el cupo bloqueado, y DEBE (MUST) revalidar la disponibilidad justo antes de confirmar. Si la disponibilidad ya no alcanza, DEBE (MUST) informar la falta de disponibilidad, no confirmar la reserva y liberar el cupo bloqueado.

#### Scenario: Revalidación con disponibilidad vigente

- **GIVEN** una solicitud válida registrada en estado "Reserva temporal"
- **WHEN** el sistema revalida la disponibilidad antes de confirmar
- **THEN** el cupo bloqueado se mantiene
- **AND** la reserva continúa hacia el estado "Confirmada"

#### Scenario: Rechazo por disponibilidad agotada al revalidar

- **GIVEN** una solicitud registrada en estado "Reserva temporal"
- **WHEN** al revalidar la disponibilidad ya no existe capacidad suficiente para la carga
- **THEN** el sistema informa la falta de disponibilidad
- **AND** la reserva no se confirma y el cupo bloqueado se libera

### Requirement: Confirmación de la reserva y comprobante

Cuando la disponibilidad se confirma, el sistema DEBE (MUST) registrar la reserva en estado `Confirmada` con un código único de booking, descontar los TEUs y cupos del viaje, asignar el agente operativo según la regla de HU-03, registrar la notificación al exportador y emitir el comprobante de confirmación.

#### Scenario: Confirmación exitosa de solicitud de reserva con cliente y carga validados

- **GIVEN** que el exportador tiene vigencia comercial activa y sin bloqueos crediticios
- **AND** el viaje seleccionado dispone de al menos 5 cupos para contenedores "20GP"
- **WHEN** el exportador registra una solicitud de reserva por 5 contenedores "20GP" indicando el detalle de la mercancía
- **THEN** la reserva se registra en estado "Confirmada" con un código único de reserva (Booking)
- **AND** se emite el comprobante de confirmación de reserva al exportador
