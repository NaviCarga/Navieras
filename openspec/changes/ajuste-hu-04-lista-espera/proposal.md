# Propuesta — ajuste-hu-04-lista-espera

## Why

El profesor pidió un cambio sobre lo ya generado: cuando un viaje no tiene capacidad suficiente, la solicitud ya no se rechaza siempre, sino que puede quedar **«En lista de espera»** si el sobrecupo acumulado del viaje no supera el **tope de sobrecupo (3 % de `Buque.capacidadTotalTEU`)**; al liberarse cupo la reserva en espera se confirma automáticamente, el exportador ve su estado y posición, y si el buque zarpa sin cupo la reserva queda **«Vencida»**. Los artefactos del curso (04, 07, 08, 09, 10, 11 y `diagramas/*.puml`) y las fichas `.cin324/historias/HU-01.md`, `HU-02.md` y `HU-04.md` ya fueron actualizados y confirmados por el estudiante; la aplicación todavía rechaza toda solicitud sin cupo y debe alinearse.

Origen:
- **HU-04** — Solicitud y confirmación de reserva (Booking). Caso de uso **CU-02** (`include` CU-04, CU-05 y CU-08) y **CU-07** (consultar estado). Actividades del TO-BE: «Verifica disponibilidad preliminar», «Revalida disponibilidad al confirmar», **«Ofrece alternativas (próxima salida, otro puerto, lista de espera)»** y «Publica estado y notifica al solicitante». DSS-02.
- **HU-02** — Actualización automática del inventario. Casos de uso **CU-03**, **CU-04** y **CU-08** (confirmar reservas en lista de espera al liberarse cupo). Actividades del TO-BE: «Revalida disponibilidad al confirmar», «Asigna buques, contenedores y BL; registra automáticamente» (sin BL) y «Ofrece alternativas».
- **HU-01** — Consulta de disponibilidad. Caso de uso **CU-01**. Actividad del TO-BE: «Consulta disponibilidad y tarifa referencial en el portal» (solo disponibilidad) y el aviso de «Ofrece alternativas».
- Diagramas de estado **EST-01** (`Reserva`/`SobreReserva`) y **EST-02** (`CupoContenedor`).
- Requisitos: RP-12, RP-14, RP-16 y RP-26.

## What Changes

- **Regla de sobrecupo (HU-04 CA2, HU-02):** al verificar la disponibilidad preliminar, al revalidar y al confirmar una `Reserva temporal`, el sistema calcula `q` (TEU solicitados), `D_efectiva`, `E` (TEU de las reservas del viaje «En lista de espera») y el `tope` (3 % de `Buque.capacidadTotalTEU`, inclusivo). Si la carga cabe → flujo normal; si no cabe y `E + (q − D_efectiva) ≤ tope` → **«En lista de espera»**; si lo supera → **«Rechazada»**. Nunca se descuentan cupos fuera del flujo normal.
- **Lista de espera (`SobreReserva`):** la reserva en espera recibe código Booking, posición 1..n por orden de llegada y el exceso solicitado; no descuenta capacidad pero cuenta para el tope.
- **Rechazos persistidos:** toda solicitud rechazada (sobrecupo, bloqueo comercial o disponibilidad agotada al revalidar) se registra como `Reserva` en estado «Rechazada», consultable por su código. **BREAKING** respecto del comportamiento actual: hoy una solicitud sin cupo no se registra.
- **Confirmación automática desde la lista (CU-08):** al cancelar una reserva «Confirmada» dentro del plazo, el sistema confirma la primera reserva de la lista que quepa completa (saltando las que no caben), conserva su código Booking, descuenta capacidad y cupos, asigna agente (HU-03), notifica y recalcula posiciones.
- **Cancelación de una reserva en lista de espera:** sin aplicar el plazo máximo; sale de la lista y se recalculan posiciones.
- **Consulta de estado y posición (HU-04 CA3, CU-07):** nueva pantalla `/booking/estado` por código Booking; el comprobante y `/reservas` muestran también la posición.
- **Vencimiento por zarpe (HU-04 CA4, HU-02):** las reservas «En lista de espera» de viajes cuya fecha de zarpe llegó pasan a «Vencida», salen de la lista y se notifica al exportador. Se procesa de forma perezosa al cargar las pantallas y con un botón explícito para la Naviera (sin tarea programada).
- **HU-01:** el aviso de «sin cupo» deja de decir que el viaje no se habilita para nuevas solicitudes; indica que no hay confirmación inmediata y que la solicitud puede quedar «En lista de espera». El enlace «Solicitar» se mantiene.
- **Datos de ejemplo:** se agrega un buque de 100 TEU con viajes de capacidad disponible 0 (y el viaje del escenario de 4 TEU pasa a ese buque) para ejecutar los escenarios tal como están escritos.
- **Base de datos:** migración `005` con la tabla `sobre_reserva`.

## Capabilities

### New Capabilities
- `lista-espera`: lista de espera por sobrecupo de un viaje — posición, consulta de estado y posición, confirmación automática al liberarse cupo, cancelación dentro de la lista y vencimiento por zarpe.

### Modified Capabilities
- `solicitud-booking`: la verificación preliminar y la revalidación aplican la regla de sobrecupo (lista de espera o rechazo según el tope) y los rechazos se registran como reserva «Rechazada».
- `gestion-inventario-espacio`: el rechazo de la confirmación por capacidad insuficiente pasa a depender del tope de sobrecupo, y la cancelación dentro del plazo revisa la lista de espera.
- `consulta-disponibilidad`: el aviso de viaje sin cupo ya no impide solicitar; informa que no hay confirmación inmediata y que la solicitud puede quedar en lista de espera.

## Impact

- **Base de datos:** nueva migración `src/db/migrations/005_crear_sobre_reserva.sql`. `buque.capacidad_total_teu` ya existe desde la migración `001` (ver `design.md`).
- **Código:** `src/servicios/inventario.ts` (confirmar, cancelar, regla de sobrecupo), `src/servicios/booking.ts` (verificación preliminar, revalidación), nuevo `src/servicios/listaEspera.ts`, `src/dominio/repositorios.ts` y `src/dominio/tipos.ts`, `src/integraciones/sistemaFlota.ts` (devolver `capacidadTotalTEU`), rutas `booking`, `reservas` y `disponibilidad`, vistas `booking`, `comprobante`, `reservas`, `disponibilidad` y nueva vista `estado-reserva`.
- **Datos de ejemplo:** `src/db/seed.ts` (buque de 100 TEU y viajes con D = 0).
- **Pruebas:** nuevas pruebas por escenario Gherkin en `tests/hu02.test.ts` y `tests/hu04.test.ts`; se actualizan las que suponían «sin cupo = no se registra» y la de HU-01 sobre el aviso.
- **Documentación:** `README.md`.
- **Sistemas externos:** siguen simulados (ERP Naviero y Evaluación Comercial y Aduana); el ERP simulado informa además la capacidad total del buque.

## Fuera de alcance

- Vencimiento automático de la `Reserva temporal` (RP-07, transición `Reserva temporal → Vencida`).
- Alternativas «próxima salida» y «otro puerto» (RP-16/RP-17): solo se implementa la lista de espera.
- Tarifa referencial y evaluación de tarifa (RP-01, RP-08, RP-09, RP-11) y BL (RP-13).
- Tarea programada (cron) para el vencimiento por zarpe; correo real para las notificaciones.
- Revisión manual de solicitudes inconsistentes (RP-04, RP-05) y asignación manual de agente.
- Autenticación real y control de acceso por rol; requisitos no funcionales (RP-19 a RP-22, RP-24, RP-25).
- Cambios en los documentos del curso: ya están corregidos en `main` y no se modifican.
