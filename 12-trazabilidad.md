# Trazabilidad

## Matriz de trazabilidad de requisitos de producto

| Requisito | Historia de usuario | Caso de uso | Secuencia | Estado | Clases del dominio | Cobertura |
|---|---|---|---|---|---|---|
| RP-01 | HU-01 | CU-01 | DSS-01 | EST-02 | Buque, Viaje, Puerto, CupoContenedor | Completa |
| RP-02 | HU-04 | CU-02 | DSS-02 | EST-01 | EmpresaExportadora, Reserva, DetalleReserva | Parcial |
| RP-03 | HU-04 | CU-02 | DSS-02 | EST-01 | EmpresaExportadora, Reserva | Parcial |
| RP-06 | HU-04 | CU-02 | DSS-02 | EST-01 | Viaje, CupoContenedor | Completa |
| RP-07 | HU-04 | CU-02 | DSS-02 | EST-01, EST-02 | Reserva, CupoContenedor | Parcial |
| RP-08 | — | — | DSS-02 | EST-01 | Reserva | Parcial |
| RP-10 | — | — | DSS-02 | — | Viaje, CupoContenedor, DetalleReserva | Parcial |
| RP-11 | HU-04 | CU-02 | DSS-02 | EST-01 | Reserva | Parcial |
| RP-12 | HU-04 | CU-02 | DSS-02 | EST-01 | Viaje, CupoContenedor, Reserva | Completa |
| RP-13 | HU-04 | CU-02 | DSS-02 | EST-01 | Buque, Viaje, CupoContenedor, Reserva | Parcial |
| RP-18 | HU-04 | CU-02 | DSS-02 | EST-01 | EmpresaExportadora, Reserva | Parcial |
| RP-19 | HU-01 | CU-01 | DSS-01 | EST-02 | Viaje, CupoContenedor | Parcial |
| RP-20 | HU-02 | CU-03, CU-04 | DSS-02 | EST-02 | Viaje, CupoContenedor, Reserva | Parcial |
| RP-22 | HU-01, HU-04 | CU-01, CU-02 | DSS-01, DSS-02 | — | EmpresaExportadora, Reserva | Parcial |
| RP-24 | HU-01, HU-04 | CU-01, CU-02 | DSS-01, DSS-02 | — | EmpresaExportadora, AgenteOperativo | Parcial |

## Requisitos de proyecto

Los requisitos RY-01 a RY-07 se mantienen separados de la matriz de requisitos de producto, ya que corresponden a actividades y condiciones necesarias para desarrollar el proyecto.

## Observaciones

- **RP-02:** HU-04 contempla el formulario de solicitud, pero no especifica todos los campos obligatorios.
- **RP-03:** DSS-02 representa la validación de datos y contrato, pero no detalla todas las reglas de validación.
- **RP-06:** DSS-02 representa la consulta preliminar de disponibilidad.
- **RP-07:** EST-01 y EST-02 representan la reserva temporal y su vencimiento, aunque DSS-02 todavía no muestra explícitamente la operación de bloqueo temporal.
- **RP-08:** DSS-02 menciona la aplicación de tarifa por defecto, pero no especifica explícitamente la condición de 10 o menos contenedores.
- **RP-10:** DSS-02 representa el cálculo de asignación, pero no detalla las reglas de prioridad y flexibilidad.
- **RP-11:** DSS-02 y EST-01 representan el procesamiento paralelo de tarifa y asignación.
- **RP-13:** DSS-02 representa la asignación de recursos y BL, pero BL no está modelado como clase del dominio.
- **RP-18:** DSS-02 representa la entrega de confirmación en el portal, pero no desarrolla el mecanismo de notificación adicional.
- **RP-19:** DSS-01 representa la consulta de disponibilidad, pero no establece métricas cuantificables de actualización o tiempo de respuesta.
- **RP-20:** Se representa la revalidación de disponibilidad, pero falta especificar el control de concurrencia para impedir asignaciones simultáneas del mismo recurso.
- **RP-22:** HU-01 y HU-04 permiten consulta y solicitud autónomas, pero no representan el seguimiento completo de cada Booking.
- **RP-24:** Se identifican los actores, pero no se especifican completamente las restricciones de acceso y autorización por rol.
