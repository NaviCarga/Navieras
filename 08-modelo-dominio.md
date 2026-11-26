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
| **Reserva** | Solicitud de booking que compromete, o espera comprometer, espacio de carga en un viaje. | `codigoBooking`, `fechaSolicitud`, `cantidadTEU`, `tipoMercancia`, `numeroContrato`, `plazoMaximoCancelacion`, `estadoReserva` (valores según EST-01: Recibida, Validando, Revisión manual, Verificando disponibilidad, Reserva temporal, Procesando, Revalidando, Confirmada, En lista de espera, Rechazada, Vencida, Cancelada) |
| **SobreReserva** | Subclase de `Reserva` (herencia): reserva cuya cantidad solicitada supera la capacidad disponible del viaje, pero cuyo sobrecupo acumulado no supera el tope de sobrecupo (3% de `Buque.capacidadTotalTEU`). Queda en estado "En lista de espera", no descuenta `capacidadDisponibleTEU` ni cupos, pero cuenta para el tope de sobrecupo. Hereda todos los atributos de `Reserva`. | `posicionListaEspera` (posición en la lista de espera del viaje, por orden de llegada según `fechaSolicitud`), `excesoSolicitadoTEU` (TEU solicitados por sobre la capacidad disponible al registrarse, q − D) |
| **DetalleReserva** | Especificación del tipo y cantidad de contenedores solicitados en una reserva. | `tipoContenedor`, `cantidadSolicitada`, `pesoEstimadoTon` |
 
## Asociaciones
| Asociación | Clases | Multiplicidades | Justificación |
|------------|--------|-----------------|----------------|
| realiza | Buque – Viaje | 1 a 0..* | Un buque realiza múltiples viajes a lo largo del tiempo, pero cada viaje programado es ejecutado por un único buque asignado. |
| origen | Viaje – Puerto | 0..* a 1 | Todo viaje programado tiene un único puerto de origen desde donde zarpa, mientras que desde un mismo puerto se inician múltiples viajes. |
| destino | Viaje – Puerto | 0..* a 1 | Todo viaje tiene un único puerto de destino comercial definido, y un puerto recibe múltiples viajes a lo largo del calendario. |
| dispone de | Viaje – CupoContenedor | 1 a 1..* | Un viaje oferta su inventario compuesto por uno o varios cupos según tipo de contenedor; cada registro de cupo pertenece exclusivamente a ese viaje. |
| concentra | Viaje – Reserva | 1 a 0..* | Un viaje puede concentrar desde cero hasta múltiples reservas de espacio, pero cada reserva aplica a un único viaje programado. |
| contiene | Reserva – DetalleReserva | 1 a 1..* | Una reserva contiene obligatoriamente al menos una línea de detalle con el tipo y cantidad de contenedores solicitados. |
| solicita | EmpresaExportadora – Reserva | 1 a 0..* | Una empresa exportadora puede solicitar muchas reservas en el tiempo, y cada reserva pertenece a una única empresa exportadora titular. |
| gestiona | AgenteOperativo – Reserva | 0..1 a 0..* | Una reserva puede no tener agente asignado inicialmente o tener 1 agente responsable; un agente gestiona desde cero hasta múltiples reservas. |
| (generalización) | SobreReserva –▷ Reserva | — | Una SobreReserva *es una* Reserva: hereda sus atributos y asociaciones (viaje, empresa exportadora, detalle y agente) y solo agrega los datos de la lista de espera. |
 
## Decisiones de modelado
- **Roles modelados como relaciones y no como clases duplicadas:** Los conceptos de "Puerto de Origen" y "Puerto de Destino" se modelaron como dos relaciones navegables (`origen` y `destino`) desde `Viaje` hacia una única clase `Puerto`, ya que la entidad física y sus atributos (`codigoUNLOCODE`, `nombre`, `pais`, `zonaGeografica`) son los mismos.
- **Atributo derivado (`/reservasActivasActuales`):** En `AgenteOperativo`, el atributo `/reservasActivasActuales` se modeló como derivado (prefijo `/`) porque se calcula dinámicamente a partir de la cantidad de instancias de `Reserva` en estado activo asociadas a dicho agente mediante la relación `gestiona`.
- **Uso de composición (`*--`):** Se utilizó composición en `Viaje *-- CupoContenedor` (`dispone de`) y en `Reserva *-- DetalleReserva` (`contiene`), dado que los cupos de contenedor y el desglose de una reserva no tienen existencia independiente fuera del viaje o de la reserva que los compone.
- **Herencia `SobreReserva --|> Reserva` (no composición):** En la especificación del martes `SobreReserva` aparecía como parte compuesta de `Reserva` (`Reserva "1" *-- "1..*" SobreReserva`) y repetía sus atributos. Se corrigió a una generalización porque una reserva en lista de espera es una reserva más (tiene código Booking, viaje, exportador y estado propios), no una parte de otra reserva. Por la herencia se eliminaron los atributos duplicados y `SobreReserva` agrega solo `posicionListaEspera` y `excesoSolicitadoTEU`.
- **Tope de sobrecupo y lista de espera:** El tope de sobrecupo (3% de `Buque.capacidadTotalTEU`) y el sobrecupo acumulado (E + (q − D)) se calculan a partir de las reservas del viaje y no se guardan como atributos. E es la suma de `cantidadTEU` de las reservas del viaje en estado "En lista de espera". Cuando una `SobreReserva` pasa a "Confirmada" conserva su `codigoBooking`, deja de tener posición en la lista y deja de contar para el tope.
