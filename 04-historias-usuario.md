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

## HU-04

Como Exportador, quiero solicitar una reserva de espacio para mi carga en un viaje disponible, para asegurar el cupo de mis contenedores y obtener la confirmación formal de embarque.

**Actividad TO-BE asociada:** Registro unificado y automatizado de la solicitud de booking

**Criterios de aceptación:**
- CA1: El usuario puede seleccionar la fecha del viaje en el calendario, ingresar la cantidad de contenedores (TEUs) y asociar su número de contrato vigente.
- CA2: El sistema debe validar que la cantidad de contenedores solicitada no supere la capacidad disponible del buque para esa fecha, confirmando la reserva si hay espacio suficiente.

## HU-05 — Revisión manual de solicitudes inconsistentes

Como encargado de espacios de la naviera (case manager), quiero recibir las solicitudes de Booking que presenten inconsistencias en una cola de revisión manual y recibir una notificación cuando sean derivadas, para poder revisarlas y corregirlas antes de continuar con su procesamiento.

**Actividad TO-BE asociada:** Revisa y corrige solicitud inconsistente (case manager).

**Criterios de aceptación:**

- CA1: Cuando la validación automática detecte inconsistencias en una solicitud de Booking, el sistema debe cambiar su estado a "Pendiente de revisión manual" e incorporarla a la cola de solicitudes del encargado.
- CA2: El sistema debe notificar al encargado de espacios cuando una nueva solicitud sea incorporada a la cola de revisión manual.
- CA3: El encargado debe poder consultar los datos de la solicitud y registrar la corrección o decisión correspondiente.
- CA4: Una vez corregida y validada la solicitud, el sistema debe permitir que continúe el procesamiento del Booking.

