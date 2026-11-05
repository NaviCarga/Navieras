# Modelo de dominio
 
## Diagrama
![Modelo de dominio](./diagramas/modelo-dominio.png)
 
Archivo fuente: [`./diagramas/modelo-dominio.puml`](./diagramas/modelo-dominio.puml)
 
## Descripción de las clases
| Clase | Qué representa en el negocio | Atributos |
|-------|------------------------------|-----------|
| **Buque** | Embarcación mercante operada por una naviera para realizar viajes marítimos. | `codigoIMO`, `nombre`, `capacidadTotalTEU`, `navieraOperadora` |
| **Viaje** | Trayecto marítimo programado que realiza un buque entre puertos específicos. | `codigoViaje`, `fechaZarpe`, `fechaArriboEstimada`, `capacidadDisponibleTEU`, `estadoViaje` |
| **Puerto** | Terminal o instalación portuaria de origen o destino en una zona geográfica. | `codigoUNLOCODE`, `nombre`, `pais`, `zonaGeografica` |
| **CupoContenedor** | Disponibilidad de espacio segmentada por tipo de contenedor en un viaje. | `tipoContenedor`, `cantidadTotal`, `cantidadDisponible` |
| **EmpresaExportadora** | Entidad comercial cliente que solicita reservas de espacio para su carga. | `rut`, `razonSocial`, `correoContacto`, `estadoComercial` |
| **AgenteOperativo** | Empleado encargo de supervisar o gestionar las reservas de su zona asignada. | `identificadorEmpleado`, `nombreCompleto`, `correoCorporativo`, `zonaGeograficaAsignada`, `/reservasActivasActuales`, `limiteMaximoReservas` |
| **Reserva** | Solicitud de booking confirmada que compromete espacio de carga en un viaje. | `codigoBooking`, `fechaSolicitud`, `cantidadTEU`, `tipoMercancia`, `plazoMaximoCancelacion`, `estadoReserva` |
| **DetalleReserva** | Especificación del tipo y cantidad de contenedores solicitados en una reserva. | `tipoContenedor`, `cantidadSolicitada`, `pesoEstimadoTon` |
 
## Asociaciones
| Asociación | Clases | Multiplicidades | Justificación |
|------------|--------|-----------------|----------------|
| realiza | Buque – Viaje | `1` a `0..*` | Un buque ejecuta múltiples viajes programados en su itinerario operativo. |
| origen | Viaje – Puerto | `0..*` a `1` | Cada viaje parte obligatoriamente desde un único puerto de origen. |
| destino | Viaje – Puerto | `0..*` a `1` | Cada viaje finaliza obligatoriamente en un único puerto de destino. |
| dispone de | Viaje – CupoContenedor | `1` a `1..*` | Un viaje desglosa su capacidad total en uno o varios cupos según el tipo de contenedor. |
| concentra | Viaje – Reserva | `1` a `0..*` | Un viaje agrupa múltiples solicitudes de reserva confirmadas hasta agotar su capacidad. |
| solicita | EmpresaExportadora – Reserva | `1` a `0..*` | Una empresa exportadora puede realizar múltiples reservas de espacio de carga. |
| gestiona | AgenteOperativo – Reserva | `0..1` a `0..*` | Un agente operativo puede supervisar varias reservas dentro de su zona o ninguna si es automatizada. |
| contiene | Reserva – DetalleReserva | `1` a `1..*` | Toda reserva está compuesta por uno o más ítems de detalle según los tipos de contenedores requeridos. |
 
## Decisiones de modelado
- **Roles y entidades de usuario:** La clase `AgenteOperativo` se modeló únicamente con atributos representativos de la gestión del negocio (como `zonaGeograficaAsignada` y `limiteMaximoReservas`), evitando atributos de sistema o credenciales de acceso informático.
- **Relación de composición:** Se aplicó composición estricta entre `Viaje` y `CupoContenedor` (relación `1` a `1..*`), así como entre `Reserva` y `DetalleReserva` (relación `1` a `1..*`), debido a que los cupos por tipo de contenedor y los detalles de reserva no tienen existencia independiente fuera de su viaje o reserva contenedora.
- **Atributo derivado:** El atributo `/reservasActivasActuales` en `AgenteOperativo` se marcó con barra diagonal (`/`) al ser un atributo calculado dinámicamente a partir del total de reservas asignadas en estado activo.
- **Sin visibilidad ni métodos:** En estricto cumplimiento del nivel de análisis conceptual (dominio UML 2.0), las clases contienen solo atributos del negocio sin declaradores de visibilidad (`+`/`-`) ni métodos de implementación orientados a objetos.
