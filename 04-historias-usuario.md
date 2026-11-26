# Historias de usuario

## HU-01

Como exportador, al ingresar a la pagina quiero acceso a un calendario que me muestre las disponibilidades en el buque, para consultar en tiempo real los espacios y fechas de zarpe disponibles sin necesidad de realizar llamadas o correos manuales.

**Actividad TO-BE asociada:** Consulta automatizada y en línea de itinerarios y disponibilidad de espacios (Allocation) en el portal web de la naviera.

**Criterios de aceptación:**

* CA1: El calendario muestra las fechas de zarpe, rutas, buques y capacidad de contenedores disponible actualizada.
* CA2: El usuario puede filtrar la disponibilidad por tipo de contenedor (ej. 20GP, 40HQ), puerto de origen y puerto de destino.

## HU-02

Como naviera, quiero que se actualicen automáticamente las disponibilidades de espacio en buques en el calendario, para reflejar de forma inmediata las nuevas reservas confirmadas y evitar errores de inventario de espacio.

**Actividad TO-BE asociada:** Sincronización automática del inventario de espacios (Allocation Management) con cada reserva procesada por el sistema.

**Criterios de aceptación:**

* CA1: Al aprobarse o confirmarse una reserva, el sistema descuenta automáticamente la cantidad de TEUs o espacios reservados del cupo total del buque.
* CA2: Si una reserva es cancelada dentro del plazo permitido, el espacio liberado se reincorpora automáticamente al calendario web de disponibilidad.
* CA3: Cuando una cancelación libera cupo, el sistema revisa la lista de espera del viaje en orden de llegada (`fechaSolicitud` / `posicionListaEspera`). La primera reserva "En lista de espera" cuyo total de TEU quepa completo en la capacidad disponible pasa a "Confirmada": descuenta capacidad, conserva su código Booking, se le asigna un agente operativo (HU-03), deja de contar para el tope de sobrecupo y se actualizan las posiciones de las reservas que siguen en la lista. Si el cupo liberado no alcanza para la reserva completa, esta sigue "En lista de espera".
* CA4: El exportador puede cancelar una reserva "En lista de espera" (evento "Cancelar reserva en lista de espera"). La reserva pasa a "Cancelada" sin aplicar el plazo máximo de cancelación, se quita de la lista de espera, se actualizan las posiciones de las reservas que siguen en la lista y deja de contar para el tope de sobrecupo. Como no tenía capacidad ni cupos descontados, la capacidad disponible del viaje no cambia.

## HU-03

Como administrador de la naviera quiero que el sistema asigne automáticamente un agente a cargo de cada reserva confirmada para agilizar la gestión operativa interna y asegurar un punto de contacto directo con el cliente exportador.

**Actividad TO-BE asociada:** Asignación automatizada de ejecutivos de operaciones o atención al cliente según reglas de carga, ruta o capacidad de carga.

**Criterios de aceptación:**

* CA1: El sistema asigna un agente responsable basándose en criterios preconfigurados (como zona geográfica, tipo de naviera o carga asignada).
* CA2: El agente asignado recibe una notificación automática en su panel con los detalles de la reserva y el cliente asignado para su seguimiento.

## HU-04

Como Exportador, quiero solicitar una reserva de espacio para mi carga en un viaje disponible, para asegurar el cupo de mis contenedores y obtener la confirmación formal de embarque.

**Actividad TO-BE asociada:** Registro unificado y automatizado de la solicitud de booking

**Criterios de aceptación:**
- CA1: El usuario puede seleccionar la fecha del viaje en el calendario, ingresar la cantidad de contenedores (TEUs) y asociar su número de contrato vigente.
- CA2: El sistema valida la cantidad solicitada en TEU (q) contra la capacidad disponible del viaje (D = `Viaje.capacidadDisponibleTEU`). Si q ≤ D, la reserva sigue el flujo normal y se confirma. Si q > D, el sistema calcula el sobrecupo acumulado = E + (q − D), donde E es el total de TEU de las reservas que ya están "En lista de espera" en ese viaje, y lo compara con el tope de sobrecupo (3% de la capacidad total, `Buque.capacidadTotalTEU`; el límite es inclusivo, es decir, el total comprometido máximo es el 103% de la capacidad total). Si el sobrecupo acumulado ≤ tope de sobrecupo, la reserva queda en estado "En lista de espera", sin descontar capacidad ni cupos. Si el sobrecupo acumulado > tope de sobrecupo, la solicitud se rechaza automáticamente (estado "Rechazada"), sin descontar cupos. La regla se aplica en la verificación preliminar de disponibilidad y en la revalidación previa a la confirmación. Ejemplo: con capacidad total de 100 TEU y el viaje lleno (D = 0), una solicitud de 3 TEU queda "En lista de espera" y una de 4 TEU se rechaza; si ya hay 3 TEU en lista de espera, una solicitud de 1 TEU más se rechaza.
- CA3: El exportador puede consultar el estado de su reserva. Si está "En lista de espera", el sistema muestra ese estado y la posición de la reserva en la lista de espera del viaje.
- CA4: Si llega la fecha de zarpe del viaje (`Viaje.fechaZarpe`) y la reserva sigue "En lista de espera" porque no se liberó cupo suficiente, la reserva pasa a estado "Vencida", sale de la lista de espera y se notifica al exportador.
