# Historias de usuario

## HU-01

Como exportador, al ingresar a la pagina quiero acceso a un calendario que me muestre las disponibilidades en el buque, para consultar en tiempo real los espacios y fechas de zarpe disponibles sin necesidad de realizar llamadas o correos manuales.

**Actividad TO-BE asociada:** Consulta automatizada y en línea de itinerarios y disponibilidad de espacios (Allocation) en el portal web de la naviera.

**Criterios de aceptación:**

* CA1: El calendario muestra las fechas de zarpe, rutas, buques y capacidad de contenedores disponible actualizada.
* CA2: El usuario puede filtrar la disponibilidad por tipo de contenedor (ej. 20GP, 40HQ), puerto de origen y puerto de destino.

## HU-02

Como naviera, quiero que se actualicen automaticamente las disponibilidades de espacio en buques en el calendario, para reflejar de forma inmediata las nuevas reservas confirmadas y evitar sobreventas o errores de inventario de espacio.

**Actividad TO-BE asociada:** Sincronización automática del inventario de espacios (Allocation Management) con cada reserva procesada por el sistema.

**Criterios de aceptación:**

* CA1: Al aprobarse o confirmarse una reserva, el sistema descuenta automáticamente la cantidad de TEUs o espacios reservados del cupo total del buque.
* CA2: Si una reserva es cancelada dentro del plazo permitido, el espacio liberado se reincorpora automáticamente al calendario web de disponibilidad.

## HU-03

Como administrador de la naviera quiero que el sistema asigne automáticamente un agente a cargo de cada reserva confirmada para agilizar la gestión operativa interna y asegurar un punto de contacto directo con el cliente exportador.

**Actividad TO-BE asociada:** Asignación automatizada de ejecutivos de operaciones o atención al cliente según reglas de carga, ruta o capacidad de carga.

**Criterios de aceptación:**

* CA1: El sistema asigna un agente responsable basándose en criterios preconfigurados (como zona geográfica, tipo de naviera o carga asignada).
* CA2: El agente asignado recibe una notificación automática en su panel con los detalles de la reserva y el cliente asignado para su seguimiento.

