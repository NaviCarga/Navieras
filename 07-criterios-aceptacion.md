# Criterios de aceptación (Gherkin)
 
## HU-01 — Consulta de itinerarios y disponibilidad de espacio en buques
Historia: Como exportador, quiero consultar los itinerarios y la disponibilidad de espacio en los buques según ruta y tipo de contenedor, para conocer en tiempo real las fechas de zarpe y cupos disponibles sin depender de gestiones manuales.
 
```gherkin
Característica:Consulta de disponibilidad de espacio e itinerarios de buques
  Escenario: Consulta exitosa de itinerarios con cupo disponible según ruta y contenedor
    Dado que existen viajes programados entre el puerto de origen "San Antonio" y el puerto de destino "Shanghái"
    Y el buque asignado al viaje cuenta con una disponibilidad de 25 contenedores de tipo "40HQ"
    Cuando el exportador consulta la disponibilidad para la ruta "San Antonio" a "Shanghái" requiriendo contenedores "40HQ"
    Entonces se informa el itinerario del viaje con sus fechas de zarpe, arribo estimado y nombre del buque
    Y se confirma la disponibilidad de 25 cupos para contenedores de tipo "40HQ"
 
  Escenario: Consulta de ruta o tipo de contenedor sin cupos disponibles
    Dado que existe un viaje programado entre "Valparaíso" y "Rotterdam"
    Y el buque tiene 0 cupos disponibles para contenedores refrigerados de tipo "40RF"
    Cuando el exportador consulta la disponibilidad entre "Valparaíso" y "Rotterdam" para contenedores "40RF"
    Entonces se informa que el viaje no cuenta con capacidad disponible para el tipo de contenedor solicitado
    Y no se habilita el viaje para nuevas solicitudes de reserva de ese tipo de contenedor
```
 
## HU-02 — Actualización automática del inventario de espacio por reservas
 Historia:Como naviera, quiero que se actualice automáticamente la disponibilidad de espacio de los buques ante cada confirmación o cancelación de reserva, para reflejar de forma inmediata el cupo real y evitar sobreventas.
 
```gherkin
Característica: Sincronización automática del inventario de espacio del buque

  Escenario: Descuento automático de cupo al confirmar una reserva
    Dado que un viaje programado cuenta con una capacidad disponible de 50 TEUs
    Y existe una solicitud de reserva válida por un total de 10 TEUs para dicho viaje
    Cuando la reserva cambia su estado a "Confirmada"
    Entonces la capacidad disponible del viaje se reduce automáticamente a 40 TEUs
    Y el cupo de 10 TEUs queda comprometido y asociado a la reserva confirmada

  Escenario: Rechazo de confirmación de reserva por capacidad insuficiente (prevención de sobreventa)
    Dado que un viaje programado cuenta únicamente con 4 TEUs de capacidad disponible
    Cuando se intenta confirmar una solicitud de reserva por 6 TEUs para ese mismo viaje
    Entonces se rechaza la confirmación de la reserva por falta de capacidad en el buque
    Y la capacidad disponible del viaje se mantiene en 4 TEUs sin alteraciones

  Escenario: Restitución automática de cupo por cancelación dentro del plazo permitido
    Dado que un viaje tiene una capacidad disponible de 30 TEUs
    Y existe una reserva "Confirmada" de 8 TEUs cuyo zarpe se encuentra dentro del plazo permitido de anulación
    Cuando la reserva cambia su estado a "Cancelada"
    Entonces la capacidad disponible del viaje aumenta automáticamente a 38 TEUs
```
## HU-03 — Asignación automática de agente operativo a reserva confirmada
Historia: Como administrador de la naviera, quiero que se asigne automáticamente un agente operativo a cargo de cada reserva confirmada, para agilizar la gestión interna y asegurar un responsable directo para el exportador.
```gherkin
Característica: Asignación automática de agente operativo a reservas confirmadas

  Escenario: Asignación exitosa de agente según reglas de ruta y carga de trabajo
    Dado que existen agentes operativos habilitados para la zona geográfica "Asia-Pacífico" con capacidad de atención disponible
    Cuando una reserva con destino a la zona "Asia-Pacífico" cambia su estado a "Confirmada"
    Entonces se asigna automáticamente a la reserva el agente habilitado con menor cantidad de reservas activas
    Y se notifica al agente asignado y al exportador los datos de la reserva y del responsable operativo

  Escenario: Escalamiento por falta de agentes disponibles con cupo de atención en la zona
    Dado que todos los agentes operativos de la zona "Europa" han alcanzado su límite máximo de reservas activas
    Cuando una reserva con destino a la zona "Europa" cambia su estado a "Confirmada"
    Entonces la reserva queda registrada en estado "Confirmada sin agente asignado"
    Y se emite una alerta de asignación manual pendiente dirigida al administrador de la naviera
```
## HU-04 — Solicitud y confirmación de reserva de espacio (Booking) con validación externa
Historia: Como exportador, quiero solicitar una reserva de espacio para mi carga en un viaje disponible, para asegurar el cupo de mis contenedores y obtener la confirmación formal de embarque.
```gherkin
Característica: Procesamiento y confirmación de solicitud de reserva de espacio

  Escenario: Confirmación exitosa de solicitud de reserva con cliente y carga validados
    Dado que el exportador tiene vigencia comercial activa y sin bloqueos crediticios
    Y el viaje seleccionado dispone de al menos 5 cupos para contenedores "20GP"
    Cuando el exportador registra una solicitud de reserva por 5 contenedores "20GP" indicando el detalle de la mercancía
    Entonces la reserva se registra en estado "Confirmada" con un código único de reserva (Booking)
    Y se emite el comprobante de confirmación de reserva al exportador

  Escenario: Rechazo de solicitud de reserva por bloqueo comercial o documental del exportador
    Dado que el exportador registra un bloqueo vigente en su evaluación comercial o aduanera
    Y el viaje seleccionado dispone de cupos suficientes para la carga solicitada
    Cuando el exportador registra una solicitud de reserva de espacio
    Entonces la solicitud de reserva cambia a estado "Rechazada"
    Y se informa al exportador el motivo del rechazo sin descontar cupos del inventario del viaje
```
## HU-05 — Revisión manual y alertas de solicitudes inconsistentes
Historia: Como encargado de espacios de la naviera (case manager), quiero recibir las solicitudes de Booking que presenten inconsistencias en una cola de revisión manual y recibir una notificación cuando sean derivadas, para poder revisarlas y corregirlas antes de continuar con su procesamiento.
```gherkin
Característica: Gestión de solicitudes inconsistentes mediante revisión manual

  Escenario: Derivación de una solicitud inconsistente a revisión manual
    Dado que el exportador envía una solicitud de Booking
    Y el sistema detecta inconsistencias durante la validación automática
    Cuando finaliza la validación de la solicitud
    Entonces la solicitud cambia al estado "Pendiente de revisión manual"
    Y se incorpora a la cola de revisión del encargado de espacios
    Y se notifica al encargado sobre la nueva solicitud pendiente

  Escenario: Corrección de una solicitud pendiente de revisión manual
    Dado que existe una solicitud en estado "Pendiente de revisión manual"
    Y el encargado de espacios accede a la cola de revisión
    Cuando revisa y corrige los datos inconsistentes
    Y la solicitud supera nuevamente las validaciones correspondientes
    Entonces la solicitud puede continuar con el procesamiento del Booking

  Escenario: Generación de alerta por solicitud no atendida
    Dado que existe una solicitud en la cola de revisión manual
    Y ha transcurrido el plazo de atención configurado
    Y la solicitud todavía no ha sido atendida
    Cuando el sistema verifica las solicitudes pendientes
    Entonces genera una alerta para el encargado de espacios
    Y la solicitud permanece identificada como pendiente de revisión
```

