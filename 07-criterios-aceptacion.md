# Criterios de aceptación (Gherkin)
 
## HU-01 — Consulta de disponibilidad de espacio mediante calendario por fechas
Historia: Como Forwarder, quiero consultar la disponibilidad de espacio disponible y las fechas de salida de los buques a través de un calendario interactivo, para planificar y asegurar mis embarques de exportación a tiempo.
 
```gherkin
Característica: Consulta de disponibilidad de espacio por fecha
 
  Escenario: Consulta exitosa de disponibilidad para una fecha con cupo
    Dado que existe un buque programado para la fecha "2026-11-15" con capacidad disponible de 150 TEUs
    Cuando el Forwarder solicita consultar la disponibilidad de carga para la fecha "2026-11-15"
    Entonces el sistema presenta el estado del buque indicando un total de 150 TEUs disponibles para reserva
    Y confirma que la fecha se encuentra abierta para recibir solicitudes de booking
 
  Escenario: Consulta de fecha sin disponibilidad de espacio (buque completo)
    Dado que el buque asignado para la fecha "2026-11-20" tiene su capacidad de carga al 100% de ocupación
    Cuando el Forwarder solicita consultar la disponibilidad de carga para la fecha "2026-11-20"
    Entonces el sistema informa que no existe espacio disponible para embarque en la fecha seleccionada
    Y sugiere las próximas fechas de salida con espacio disponible más cercanas
```
 
## HU-02 — Cotización y tarificación automática inmediata
 Historia: Como Forwarder, quiero obtener la cotización automática del flete al ingresar la cantidad de contenedores requeridos, para conocer el costo del servicio sin esperar evaluaciones manuales.

Gherkin
```gherkin
Característica: Cotización y tarificación automática de espacio
 
  Escenario: Tarificación automática para una solicitud estándar (10 o menos contenedores)
    Dado que la tarifa base configurada por contenedor es de 1.200 USD
    Cuando el Forwarder ingresa una solicitud de espacio para 5 contenedores
    Entonces el sistema aplica la tarifa base por defecto
    Y calcula un costo total de cotización de 6.000 USD de forma inmediata
 
  Escenario: Tarificación automática con descuento por volumen (más de 10 contenedores)
    Dado que existe una regla de tarificación por volumen que aplica un 10% de descuento para solicitudes superiores a 10 contenedores
    Cuando el Forwarder ingresa una solicitud de espacio para 15 contenedores con tarifa base de 1.200 USD
    Entonces el sistema aplica automáticamente el descuento por volumen correspondiente
    Y calcula un costo total de cotización de 16.200 USD sin requerir evaluación manual
```

[Misma estructura. Mínimo 4 historias.]
