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
Historia: Como naviera, quiero que se actualicen automáticamente las disponibilidades de espacio en buques en el calendario, para reflejar de forma inmediata las nuevas reservas confirmadas y evitar errores de inventario de espacio.
 
```gherkin
Característica: Sincronización automática del inventario de espacio del buque

  Escenario: Descuento automático de cupo al confirmar una reserva
    Dado que un viaje programado cuenta con una capacidad disponible de 50 TEUs
    Y existe una solicitud de reserva válida por un total de 10 TEUs para dicho viaje
    Cuando la reserva cambia su estado a "Confirmada"
    Entonces la capacidad disponible del viaje se reduce automáticamente a 40 TEUs
    Y el cupo de 10 TEUs queda comprometido y asociado a la reserva confirmada

  Escenario: Rechazo de confirmación de reserva por capacidad insuficiente sobre el tope de sobrecupo
    Dado que un viaje programado usa un buque con capacidad total de 100 TEUs
    Y el viaje cuenta únicamente con 4 TEUs de capacidad disponible
    Y no existen reservas "En lista de espera" para ese viaje
    Cuando se intenta confirmar una solicitud de reserva por 10 TEUs para ese mismo viaje
    Entonces se rechaza la confirmación de la reserva porque el sobrecupo acumulado de 6 TEUs supera el tope de sobrecupo de 3 TEUs
    Y la capacidad disponible del viaje se mantiene en 4 TEUs sin alteraciones

  Escenario: Restitución automática de cupo por cancelación dentro del plazo permitido
    Dado que un viaje tiene una capacidad disponible de 30 TEUs
    Y existe una reserva "Confirmada" de 8 TEUs cuyo zarpe se encuentra dentro del plazo permitido de anulación
    Cuando la reserva cambia su estado a "Cancelada"
    Entonces la capacidad disponible del viaje aumenta automáticamente a 38 TEUs

  Escenario: Confirmación desde lista de espera al liberarse cupo por cancelación
    Dado que un viaje programado usa un buque con capacidad total de 100 TEUs y su capacidad disponible es de 0 TEUs
    Y existe una reserva "Confirmada" de 8 TEUs cuyo zarpe se encuentra dentro del plazo permitido de anulación
    Y existe una reserva "En lista de espera" de 3 TEUs en la posición 1 de la lista de espera del viaje
    Cuando la reserva "Confirmada" de 8 TEUs cambia su estado a "Cancelada"
    Entonces la reserva de 3 TEUs cambia su estado a "Confirmada" conservando su código de reserva (Booking)
    Y la capacidad disponible del viaje queda en 5 TEUs
    Y se asigna automáticamente un agente operativo a la reserva confirmada
    Y la reserva deja de figurar en la lista de espera y de contar para el tope de sobrecupo del viaje

  Escenario: Reserva en lista de espera se mantiene si el cupo liberado no alcanza
    Dado que un viaje programado usa un buque con capacidad total de 100 TEUs y su capacidad disponible es de 0 TEUs
    Y existe una reserva "Confirmada" de 2 TEUs cuyo zarpe se encuentra dentro del plazo permitido de anulación
    Y existe una reserva "En lista de espera" de 3 TEUs en la posición 1 de la lista de espera del viaje
    Cuando la reserva "Confirmada" de 2 TEUs cambia su estado a "Cancelada"
    Entonces la capacidad disponible del viaje aumenta automáticamente a 2 TEUs
    Y la reserva de 3 TEUs se mantiene en estado "En lista de espera" en la posición 1
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

  Escenario: Solicitud dentro del tope de sobrecupo queda en lista de espera
    Dado que un viaje programado usa un buque con capacidad total de 100 TEUs
    Y la capacidad disponible del viaje es de 0 TEUs
    Y no existen reservas "En lista de espera" para ese viaje
    Cuando el exportador registra una solicitud de reserva por 3 TEUs para ese viaje
    Entonces la reserva se registra en estado "En lista de espera" con un código único de reserva (Booking)
    Y la reserva queda en la posición 1 de la lista de espera del viaje
    Y la capacidad disponible del viaje se mantiene en 0 TEUs
    Y se informa al exportador el estado "En lista de espera" y su posición

  Escenario: Solicitud sobre el tope de sobrecupo se rechaza automáticamente
    Dado que un viaje programado usa un buque con capacidad total de 100 TEUs
    Y la capacidad disponible del viaje es de 0 TEUs
    Y no existen reservas "En lista de espera" para ese viaje
    Cuando el exportador registra una solicitud de reserva por 4 TEUs para ese viaje
    Entonces la solicitud de reserva cambia a estado "Rechazada"
    Y se informa al exportador que la solicitud supera el tope de sobrecupo del viaje
    Y la capacidad disponible del viaje se mantiene en 0 TEUs sin descontar cupos

  Escenario: Solicitud rechazada por tope de sobrecupo compartido con la lista de espera
    Dado que un viaje programado usa un buque con capacidad total de 100 TEUs
    Y la capacidad disponible del viaje es de 0 TEUs
    Y existe una reserva "En lista de espera" de 3 TEUs para ese viaje
    Cuando otro exportador registra una solicitud de reserva por 1 TEU para ese viaje
    Entonces la solicitud de reserva cambia a estado "Rechazada" porque el sobrecupo acumulado de 4 TEUs supera el tope de sobrecupo de 3 TEUs
    Y la reserva de 3 TEUs se mantiene "En lista de espera" en la posición 1
    Y la capacidad disponible del viaje se mantiene en 0 TEUs sin descontar cupos

  Escenario: Consulta del estado y la posición de una reserva en lista de espera
    Dado que el exportador tiene una reserva en estado "En lista de espera" en la posición 2 de la lista de espera de un viaje
    Cuando el exportador consulta el estado de su reserva
    Entonces se muestra el estado "En lista de espera"
    Y se muestra la posición 2 en la lista de espera del viaje

  Escenario: Reserva en lista de espera vence al llegar la fecha de zarpe
    Dado que el exportador tiene una reserva "En lista de espera" de 3 TEUs en un viaje con capacidad disponible de 0 TEUs
    Cuando llega la fecha de zarpe del viaje sin que se haya liberado cupo suficiente para la reserva
    Entonces la reserva cambia a estado "Vencida"
    Y la reserva deja de figurar en la lista de espera del viaje
    Y se notifica al exportador que su reserva quedó "Vencida" por el zarpe del viaje
```
