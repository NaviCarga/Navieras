# Diagramas de secuencia de sistema
 
## DSS-01 — Consulta de Disponibilidad y Reserva de Espacio
- **Caso de uso asociado:** [CU-01 — Consultar disponibilidad y reservar espacio](./09-casos-de-uso.md)
- **Historia de origen:** [HU-01 y HU-03](./04-historias-usuario.md#hu-01)
- **Sistemas externos que participan:** Ninguno (Interacción directa entre el actor humano *Forwarder* y el sistema).

![DSS-01](./diagramas/dss-01.png)
 
Archivo fuente: [`./diagramas/dss-01.puml`](./diagramas/dss-01.puml)
 
Variantes representadas:
- **Bloque `alt` (Capacidad suficiente vs. Capacidad insuficiente):**
- **Camino principal (Éxito):** Si el viaje seleccionado para la fecha indicada posee `capacidadDisponibleTEU >= cantidadContenedores`, el sistema descuenta el espacio solicitado y retorna la confirmación de la reserva con su correspondiente `codigoBooking`.
- **Camino alternativo (Error por sobrecupo):** Si la cantidad solicitada supera el cupo disponible en el viaje, el sistema detiene la reserva y responde notificando el motivo del rechazo junto con la capacidad real restante.
 
##DSS-02 — Procesamiento de Booking y Notificación de Confirmación
- **Caso de uso asociado:** [CU-04 — Emitir y notificar confirmación de booking](./09-casos-de-uso.md)
- **Historia de origen:** [HU-04](./04-historias-usuario.md#hu-04)
- **Sistemas externos que participan:** `:ServicioCorreo` (Sistema externo de notificaciones por email).

![DSS-02](./diagramas/dss-02.png)

Archivo fuente: [`./diagramas/dss-02.puml`](./diagramas/dss-02.puml)

### Variantes representadas
- **Bloque `alt` (Notificación exitosa vs. Fallo en servicio de correo):**
- **Camino principal (Éxito):** El sistema genera el comprobante digital y lo envía mediante el `:ServicioCorreo`. Tras recibir la respuesta `200 OK`, le notifica al *Forwarder* que la confirmación fue despachada exitosamente a su correo corporativo.
- **Camino alternativo (Fallo de servicio externo):** Si el `:ServicioCorreo` no responde o reporta error (`500 Service Unavailable`), el sistema no revierte el booking; en su lugar, programa una tarea en cola de reintento y le entrega al *Forwarder* un mensaje de advertencia indicándole que puede descargar el comprobante directamente desde la plataforma web.
