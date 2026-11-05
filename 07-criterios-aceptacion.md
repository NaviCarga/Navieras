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
 
## HU-02 — [Título breve de la historia]
[Misma estructura. Mínimo 4 historias.]
