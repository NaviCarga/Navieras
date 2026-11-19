# Spec Delta

## Purpose

Permite al exportador consultar en línea los viajes programados y los cupos de contenedor disponibles por ruta y tipo de contenedor, presentados como un calendario por fecha de zarpe, para decidir sin depender de llamadas o correos manuales.

## ADDED Requirements

### Requirement: Consulta de itinerarios y disponibilidad por ruta y tipo de contenedor

El sistema DEBE (MUST) permitir al exportador consultar los viajes programados según puerto de origen, puerto de destino y tipo de contenedor, mostrando un calendario por fecha de zarpe con el nombre del buque, la fecha de zarpe, el arribo estimado y los cupos disponibles para el tipo solicitado.

#### Scenario: Consulta exitosa de itinerarios con cupo disponible según ruta y contenedor

- **GIVEN** existen viajes programados entre el puerto de origen "San Antonio" y el puerto de destino "Shanghái"
- **AND** el buque asignado al viaje cuenta con una disponibilidad de 25 contenedores de tipo "40HQ"
- **WHEN** el exportador consulta la disponibilidad para la ruta "San Antonio" a "Shanghái" requiriendo contenedores "40HQ"
- **THEN** se informa el itinerario del viaje con sus fechas de zarpe, arribo estimado y nombre del buque
- **AND** se confirma la disponibilidad de 25 cupos para contenedores de tipo "40HQ"

### Requirement: Aviso de falta de capacidad para el tipo de contenedor solicitado

El sistema DEBE (MUST) informar cuando un viaje no cuenta con capacidad disponible para el tipo de contenedor solicitado y NO DEBE ofrecerlo como disponible para nuevas solicitudes de reserva de ese tipo.

#### Scenario: Consulta de ruta o tipo de contenedor sin cupos disponibles

- **GIVEN** existe un viaje programado entre "Valparaíso" y "Rotterdam"
- **AND** el buque tiene 0 cupos disponibles para contenedores refrigerados de tipo "40RF"
- **WHEN** el exportador consulta la disponibilidad entre "Valparaíso" y "Rotterdam" para contenedores "40RF"
- **THEN** se informa que el viaje no cuenta con capacidad disponible para el tipo de contenedor solicitado
- **AND** no se habilita el viaje para nuevas solicitudes de reserva de ese tipo de contenedor
