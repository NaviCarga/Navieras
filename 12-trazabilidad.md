# Trazabilidad

## Matriz de trazabilidad de requisitos de producto

| Requisito | Historia de usuario | Caso de uso | Secuencia | Estado | Clases del dominio | Cobertura |
|---|---|---|---|---|---|---|
| RP-01 | HU-01 | CU-01 | DSS-01 | EST-02 | Buque, Viaje, Puerto, CupoContenedor | Completa |
| RP-02 | HU-04 | CU-02 | DSS-02 | EST-01 | EmpresaExportadora, Reserva, SobreReserva, DetalleReserva | Parcial |
| RP-03 | HU-04 | CU-02 | DSS-02 | EST-01 | EmpresaExportadora, Reserva | Parcial |
| RP-06 | HU-04 | CU-02 | DSS-02 | EST-01 | Buque, Viaje, CupoContenedor, SobreReserva | Completa |
| RP-07 | HU-04 | CU-02 | DSS-02 | EST-01, EST-02 | Reserva, CupoContenedor | Parcial |
| RP-08 | — | — | DSS-02 | EST-01 | Reserva | Parcial |
| RP-10 | — | — | DSS-02 | — | Viaje, CupoContenedor, DetalleReserva | Parcial |
| RP-11 | HU-04 | CU-02 | DSS-02 | EST-01 | Reserva | Parcial |
| RP-12 | HU-04 | CU-02 | DSS-02 | EST-01 | Buque, Viaje, CupoContenedor, Reserva, SobreReserva | Parcial |
| RP-13 | HU-04 | CU-02 | DSS-02 | EST-01 | Buque, Viaje, CupoContenedor, Reserva | Parcial |
| RP-14 | HU-04 | CU-07 | DSS-02 | EST-01 | EmpresaExportadora, Reserva, SobreReserva | Parcial |
| RP-16 | HU-01, HU-02, HU-04 | CU-02, CU-03, CU-08 | DSS-02 | EST-01, EST-02 | Buque, Viaje, CupoContenedor, Reserva, SobreReserva | Parcial |
| RP-18 | HU-04 | CU-02 | DSS-02 | EST-01 | EmpresaExportadora, Reserva | Parcial |
| RP-19 | HU-01 | CU-01 | DSS-01 | EST-02 | Viaje, CupoContenedor | Parcial |
| RP-20 | HU-02, HU-04 | CU-02, CU-03, CU-04, CU-08 | DSS-02 | EST-01, EST-02 | Buque, Viaje, CupoContenedor, Reserva, SobreReserva | Parcial |
| RP-22 | HU-01, HU-04 | CU-01, CU-02, CU-07 | DSS-01, DSS-02 | — | EmpresaExportadora, Reserva | Parcial |
| RP-24 | HU-01, HU-04 | CU-01, CU-02, CU-07 | DSS-01, DSS-02 | — | EmpresaExportadora, AgenteOperativo | Parcial |
| RP-26 | HU-02, HU-03 | CU-05, CU-06, CU-08 | — | EST-01 | AgenteOperativo, Reserva, SobreReserva | Parcial |

## Requisitos de proyecto

Los requisitos RY-01 a RY-07 se mantienen separados de la matriz de requisitos de producto, ya que corresponden a actividades y condiciones necesarias para desarrollar el proyecto.

## Observaciones

- **RP-02:** HU-04 contempla el formulario de solicitud, pero no especifica todos los campos obligatorios. Con el cambio, una solicitud enviada puede terminar en "Confirmada", "En lista de espera" o "Rechazada" (HU-04 CA2, DSS-02, EST-01).
- **RP-03:** DSS-02 representa la validación de datos y contrato, pero no detalla todas las reglas de validación.
- **RP-06:** DSS-02 representa la consulta preliminar de disponibilidad y, desde el cambio, también la regla del sobrecupo: dentro del tope de sobrecupo la reserva queda "En lista de espera" y sobre el tope se rechaza. HU-04 CA2 y los escenarios Gherkin de HU-04 (3 TEU, 4 TEU y tope compartido) lo cubren.
- **RP-07:** EST-01 y EST-02 representan la reserva temporal y su vencimiento, aunque DSS-02 todavía no muestra explícitamente la operación de bloqueo temporal. La liberación del espacio temporal sí aparece en las ramas de sobrecupo de la revalidación.
- **RP-08:** DSS-02 menciona la aplicación de tarifa por defecto, pero no especifica explícitamente la condición de 10 o menos contenedores.
- **RP-10:** DSS-02 representa el cálculo de asignación, pero no detalla las reglas de prioridad y flexibilidad.
- **RP-11:** DSS-02 y EST-01 representan el procesamiento paralelo de tarifa y asignación.
- **RP-12:** DSS-02 y EST-01 representan la revalidación, que ahora aplica la misma regla de sobrecupo que la verificación preliminar ("En lista de espera" o "Rechazada"). Pasa de Completa a **Parcial**: ningún escenario Gherkin ejercita la revalidación cuando termina en lista de espera.
- **RP-13:** DSS-02 representa la asignación de recursos y BL, pero BL no está modelado como clase del dominio.
- **RP-14 (nuevo en la matriz):** HU-04 CA3 y CU-07 permiten al exportador ver el estado de su reserva y, si está "En lista de espera", su posición. HU-04 CA4 notifica el paso a "Vencida" por zarpe, y DSS-02 informa el estado al final de la solicitud. **Parcial:** CU-07 no tiene diagrama de secuencia propio y no se especifica la notificación de cada cambio de estado (por ejemplo, el paso de "En lista de espera" a "Confirmada").
- **RP-16 (nuevo en la matriz):** De las alternativas, solo la lista de espera está especificada: HU-04 CA2, HU-02 CA3 y CA4, el escenario de HU-01 sin cupos (que remite a la lista de espera), CU-08, DSS-02, EST-01, EST-02 (transición "Confirmar desde lista de espera") y SobreReserva. **Parcial:** "próxima salida" y "otro puerto" no están especificados, y RP-17 (evaluar y aceptar una alternativa) sigue fuera de la matriz. La lista de espera es automática (no la elige el exportador) y solo aplica dentro del tope de sobrecupo.
- **RP-18:** DSS-02 representa la entrega de confirmación en el portal, pero no desarrolla el mecanismo de notificación adicional.
- **RP-19:** DSS-01 representa la consulta de disponibilidad, pero no establece métricas cuantificables de actualización o tiempo de respuesta.
- **RP-20:** Se representa la revalidación de disponibilidad. Con el cambio, el sistema acepta comprometer hasta el 103% de la capacidad total, pero las reservas "En lista de espera" no descuentan capacidad ni cupos. Una reserva de la lista solo se confirma si su total cabe completo en la capacidad disponible (HU-02 CA3, CU-08, EST-01), así que ningún recurso queda asignado dos veces. EST-02 modela la confirmación desde la lista con la transición "Disponible → Comprometido" ("Confirmar desde lista de espera" [cupos suficientes]), que descuenta cupos una sola vez. Sigue faltando especificar el control de concurrencia (dos cancelaciones o solicitudes simultáneas sobre la misma lista de espera).
- **RP-22:** HU-01 y HU-04 permiten consulta y solicitud autónomas. CU-07 agrega la consulta del estado de una reserva, pero no se representa el seguimiento completo de cada Booking (no hay DSS para CU-07).
- **RP-24:** Se identifican los actores, pero no se especifican completamente las restricciones de acceso y autorización por rol. CU-07 debe mostrar al exportador solo sus propias reservas, pero esa restricción no está escrita en un criterio de aceptación.
- **RP-26:** HU-03 contempla la asignación automática de un agente operativo a cada reserva confirmada, y HU-02 CA3 la extiende a las reservas confirmadas desde la lista de espera. CU-05 y CU-06 representan la asignación y la gestión de reservas sin agente; CU-08 incluye CU-05. EST-01 nombra la asignación de agente en la acción "Confirmar desde lista de espera". Sin embargo, todavía falta un diagrama de secuencia de la asignación.
