# Spec Delta — consulta-disponibilidad

## MODIFIED Requirements

### Requirement: Aviso de falta de capacidad para el tipo de contenedor solicitado

El sistema DEBE (MUST) informar cuando un viaje no cuenta con capacidad disponible para el tipo de contenedor solicitado y NO DEBE ofrecerlo como reserva directa con confirmación inmediata para ese tipo. El sistema DEBE (MUST) mantener la opción de solicitar e informar que una solicitud cuyo sobrecupo acumulado no supere el tope de sobrecupo puede quedar "En lista de espera".

#### Scenario: Consulta de ruta o tipo de contenedor sin cupos disponibles

- **GIVEN** existe un viaje programado entre "Valparaíso" y "Rotterdam"
- **AND** el buque tiene 0 cupos disponibles para contenedores refrigerados de tipo "40RF"
- **WHEN** el exportador consulta la disponibilidad entre "Valparaíso" y "Rotterdam" para contenedores "40RF"
- **THEN** se informa que el viaje no cuenta con capacidad disponible para el tipo de contenedor solicitado
- **AND** no se habilita la reserva directa con confirmación inmediata para ese tipo de contenedor
- **AND** una solicitud cuyo sobrecupo acumulado no supere el tope de sobrecupo puede quedar "En lista de espera"
