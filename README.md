# Naviera Guerrero · Disponibilidad, inventario, asignación y booking

Aplicación web de las historias **HU-01: consulta de itinerarios y disponibilidad de cupos**, **HU-02: actualización automática del inventario de espacio por reservas**, **HU-03: asignación automática de un agente operativo a cada reserva confirmada** y **HU-04: solicitud y confirmación de reserva (booking)** (CIN 324).

- **Disponibilidad:** filtra viajes por puerto de origen, puerto de destino y tipo de contenedor, y muestra los cupos agrupados por fecha de zarpe.
- **Reservas:** lista las reservas y permite confirmarlas o cancelarlas; la capacidad del viaje y de los cupos por tipo se descuenta o restituye automáticamente.
- **Panel del agente:** muestra al agente operativo sus reservas asignadas y sus notificaciones.
- **Alertas:** muestra al administrador las reservas confirmadas sin agente y permite reintentar la asignación.
- **Booking:** el exportador solicita una reserva indicando empresa, viaje, contenedores, mercancía, peso y contrato; el sistema valida, revalida el cupo, asigna agente y emite un comprobante con código `BK-<año>-<secuencia>`.
- **Lista de espera por sobrecupo** (cambio `ajuste-hu-04-lista-espera`): si la carga no cabe en el viaje, la solicitud queda **En lista de espera** cuando el sobrecupo acumulado no supera el **tope de sobrecupo (3 % de la capacidad total del buque)**, o **Rechazada** si lo supera. Al liberarse cupo, la primera reserva de la lista que cabe completa se confirma sola; si el buque zarpa sin cupo, queda **Vencida**.

## Requisitos

- Node.js 20 o superior
- npm

> `better-sqlite3` está fijado en `^12.11.1` porque trae binarios precompilados para Windows y Node 24 (la 13.x exige compilar con Python y Visual Studio Build Tools).

## Instalación

```bash
npm install
```

## Datos de ejemplo

```bash
npm run db:seed
```

El comando crea la base SQLite en `data/app.db`, aplica las migraciones pendientes (incluida `003_crear_agente_operativo.sql`, que agrega agentes, la asignación en `reserva` y la tabla `notificacion`, `004_agregar_contrato_reserva.sql`, que agrega `numero_contrato` a `reserva`, y `005_crear_sobre_reserva.sql`, que crea la tabla `sobre_reserva` de la lista de espera) y carga los datos de ejemplo. Es idempotente: se puede ejecutar varias veces sin duplicar filas, pero **no reinicia** los estados ni las capacidades que ya hayan cambiado. Para volver a los datos iniciales y repetir el recorrido:

```bash
npm run db:reset
```

`db:reset` borra las filas de ejemplo y vuelve a cargarlas, sin eliminar el archivo ni las migraciones. Se puede usar con el servidor detenido o en ejecución.

Datos de **HU-01**:

- San Antonio → Shanghái, buque **Buque Andino**, zarpe `2026-11-20`, arribo estimado `2026-12-18`, 25 cupos `40HQ`.
- Valparaíso → Rotterdam, buque **Buque Pacífico**, zarpe `2026-12-01`, arribo estimado `2027-01-05`, 0 cupos `40RF`.

Datos de **HU-02**:

- `BK-HU02-001`: 10 TEUs `40HQ` en un viaje con 50 TEUs disponibles, en estado **Reserva temporal**.
- `BK-HU02-002`: 10 TEUs `20GP` en el viaje `VIA-004` (Buque Austral, 100 TEUs) con solo 4 TEUs disponibles, en estado **Reserva temporal**. Al confirmarla se rechaza porque el sobrecupo acumulado de 6 TEUs supera el tope de 3 TEUs.
- `BK-HU02-003`: 8 TEUs `40HQ`, reserva **Confirmada** en un viaje con 30 TEUs disponibles (al cancelarla quedan 38), asignada a Diego Rojas (`A-004`, Sudamérica).

Datos de **HU-03**:

- Agentes: `A-001` Ana Torres (Asia-Pacífico, límite 2), `A-002` Bruno Silva (Asia-Pacífico, límite 2), `A-003` Carla Núñez (Europa, límite 1) y `A-004` Diego Rojas (Sudamérica, límite 3).
- `BK-HU03-001`: 5 TEUs `40HQ` en estado **Reserva temporal** hacia Asia-Pacífico; al confirmarla se asigna Ana Torres (menor carga, desempate por identificador).
- `BK-HU03-002`: 5 TEUs `40HQ` **Confirmada** hacia Europa y asignada a Carla Núñez, que queda en su límite (1 de 1). Por eso, al confirmar `BK-HU02-001` (Europa) no hay agente disponible y se emite la alerta.
- Viaje `VIA-006` (San Antonio → Rotterdam, Buque Pacífico) con 20 TEUs `40HQ`, de los cuales 5 están comprometidos por `BK-HU03-002`.

Datos de **HU-04**:

- Empresas activas: `76.111.111-1` Exportadora Andina SpA, `77.222.222-2` Comercial del Sur Ltda. y `78.333.333-3` Frutícola Central SpA.
- Empresa bloqueada de ejemplo: `79.999.999-9` **Carga Rápida SpA**, en estado **Bloqueada**; sirve para ver el rechazo de una solicitud sin descontar cupos.
- Cada reserva sembrada tiene un contrato de ejemplo (`CT-2026-001` a `CT-2026-005`).
- Viaje `VIA-003` (San Antonio → Rotterdam, Buque Andino, zarpe `2027-01-10`) con 50 cupos `40HQ` y 15 cupos `20GP`; permite confirmar el escenario de 5 contenedores `20GP`.

Datos de la **lista de espera** (cambio `ajuste-hu-04-lista-espera`). Todos los viajes son San Antonio → Callao, del **Buque Austral** (`IMO-9000003`, 100 TEUs, tope de sobrecupo 3 TEUs), con capacidad disponible **0 TEUs** y contenedores `20GP`:

| Viaje | Zarpe | Situación inicial | Escenario |
|-------|-------|-------------------|-----------|
| `VIA-007` | 2027-05-10 | Lista vacía | HU-04: 3 TEUs → En lista de espera (posición 1); 4 TEUs → Rechazada |
| `VIA-008` | 2027-05-15 | `BK-LE-001` 3 TEUs en espera (pos. 1) | HU-04: otra solicitud de 1 TEU → Rechazada (sobrecupo 4 > 3) |
| `VIA-009` | 2027-05-20 | `BK-LE-002` 2 TEUs (pos. 1, plazo vencido) y `BK-LE-003` 1 TEU (pos. 2) | HU-04: consulta de `BK-LE-003` en posición 2; HU-02: cancelar `BK-LE-002` sin plazo |
| `VIA-010` | 2027-05-25 | `BK-LE-004` 8 TEUs Confirmada y `BK-LE-005` 3 TEUs en espera | HU-02: cancelar `BK-LE-004` → `BK-LE-005` se confirma y quedan 5 TEUs |
| `VIA-011` | 2027-05-30 | `BK-LE-006` 2 TEUs Confirmada y `BK-LE-007` 3 TEUs en espera | HU-02: cancelar `BK-LE-006` → quedan 2 TEUs y `BK-LE-007` sigue en espera |
| `VIA-012` | 2026-11-25 (ya pasó) | `BK-LE-008` 3 TEUs en espera | HU-04: al abrir cualquier pantalla queda **Vencida** y se notifica |

Las reservas confirmadas `BK-LE-004` y `BK-LE-006` están asignadas a Diego Rojas (`A-004`), que queda en su límite (3 de 3) hasta que se cancela alguna.

> Este cambio modificó datos existentes (`VIA-004` pasa al Buque Austral y `BK-HU02-002` sube a 10 TEUs). Si ya tenías `data/app.db`, ejecuta `npm run db:reset` para recargar los datos de ejemplo.

> El bloqueo temporal de cupos (RP-07) está fuera del alcance de HU-02: una reserva en estado `Reserva temporal` no descuenta capacidad hasta que se confirma.

## Ejecutar

```bash
npm run dev
```

Abrir <http://localhost:3000>.

- <http://localhost:3000/disponibilidad>: consulta de itinerarios y cupos.
- <http://localhost:3000/reservas>: listado de reservas con las acciones **Confirmar** y **Cancelar**, el agente responsable y la etiqueta **Sin agente asignado**.
- <http://localhost:3000/agente>: panel del agente operativo (reservas asignadas y notificaciones). El agente se elige con `?agente=A-001`.
- <http://localhost:3000/alertas>: alertas del administrador (reservas confirmadas sin agente) y carga de atención de cada agente.
- <http://localhost:3000/booking>: formulario de solicitud de reserva (exportador); también se abre desde el enlace **Solicitar** de cada viaje en la disponibilidad.
- <http://localhost:3000/booking/:id/comprobante>: comprobante de la reserva con código Booking, viaje, contenedores, contrato, plazo de cancelación, agente asignado y, si corresponde, la posición en la lista de espera.
- <http://localhost:3000/booking/estado>: consulta del estado de una reserva por código Booking (enlace **Consultar estado de mi reserva** del rol Exportador). Si está **En lista de espera**, muestra la posición y el botón **Cancelar reserva en lista de espera**.

### Lista de espera y tope de sobrecupo

- `q` = TEUs solicitados (1 TEU por contenedor); `D_efectiva` = el menor valor entre la capacidad disponible del viaje y la suma de los cupos disponibles de los tipos solicitados; `E` = TEUs del viaje que ya están **En lista de espera**; `tope` = 3 % de la capacidad total del buque, redondeado hacia abajo (100 TEUs → 3).
- Si la carga cabe, sigue el flujo normal. Si no cabe y `E + (q − D_efectiva) ≤ tope`, queda **En lista de espera** al final de la lista, con código Booking y sin descontar capacidad. Si lo supera, queda **Rechazada** (registrada, consultable por su código) sin descontar capacidad.
- La misma regla se aplica al revalidar el booking y al confirmar una **Reserva temporal** desde `/reservas`.
- Al cancelar una reserva **Confirmada** dentro del plazo, se confirma la **primera reserva de la lista que cabe completa** (las que no caben se saltan): conserva su código, descuenta capacidad, recibe agente y se notifica. Las posiciones se renumeran.
- Una reserva **En lista de espera** se puede cancelar sin plazo (desde `/booking/estado` o desde `/reservas`).
- **Vencimiento por zarpe (sin tarea programada):** al abrir `/disponibilidad`, `/reservas`, `/booking`, `/booking/estado` o un comprobante, toda reserva en espera de un viaje cuya fecha de zarpe ya llegó pasa a **Vencida** y se notifica al exportador. En `/reservas` la Naviera tiene además el botón **Cerrar listas de espera vencidas**. Si nadie abre esas pantallas, el estado no cambia hasta la siguiente carga.

Al confirmar una reserva con cupo suficiente, la capacidad del viaje y del tipo de contenedor disminuye y la reserva pasa a **Confirmada**. Si no hay cupo, queda **En lista de espera** o **Rechazada** según el tope de sobrecupo, y la capacidad no cambia. Al cancelar dentro del plazo máximo, el cupo se restituye; fuera del plazo, la cancelación se rechaza.

En **Booking**, el formulario exige empresa, viaje, al menos un contenedor, tipo de mercancía y número de contrato. Si los datos son inválidos, se muestran los errores sin crear la reserva. Si no hay cupo, se aplica la regla de lista de espera (ver arriba). Si la empresa está bloqueada, la reserva queda **Rechazada** con el motivo y sin descontar cupos. Si todo es válido, se crea una **Reserva temporal**, se revalida la disponibilidad, se confirma con código `BK-<año>-<secuencia>`, se descuentan TEUs y cupos, se asigna agente según HU-03 y se registra la notificación al exportador. El plazo máximo de cancelación es 7 días antes del zarpe.

Al quedar **Confirmada**, el sistema busca agentes de la zona del puerto de destino con cupo de atención y asigna el de menor cantidad de reservas activas. Si no hay ninguno, la reserva queda confirmada sin agente y aparece en `/alertas`; el botón **Reintentar asignación** vuelve a aplicar la misma regla.

## Probar

```bash
npm test
```

Ejecuta las pruebas de base de datos, seed, dominio, integración, inventario, pantallas y los escenarios Gherkin de HU-01, HU-02, HU-03 y HU-04 (incluido el rechazo de cancelación fuera de plazo, la asignación por zona y carga, el escalamiento al administrador, el reintento, la confirmación de booking por 5 contenedores `20GP` con comprobante y el rechazo por bloqueo comercial sin descontar cupos), más los escenarios de lista de espera: dentro y sobre el tope, tope compartido, consulta de la posición, vencimiento por zarpe, confirmación desde la lista, cupo liberado insuficiente y cancelación en lista (`tests/hu02.test.ts`, `tests/hu04.test.ts`, `tests/listaEspera.test.ts` y `tests/listaEsperaRutas.test.ts`). También se puede verificar el tipado con:

```bash
npm run typecheck
```

## Rol de demostración

El rol se elige en el selector del encabezado o con la ruta:

```text
GET /rol?rol=exportador
GET /rol?rol=naviera
GET /rol?rol=agente
GET /rol?rol=administrador
```

El rol se guarda en la cookie `rol`. Es solo de demostración: no hay autenticación real ni restricciones de acceso.

Al elegir un rol se abre su pantalla principal: «Exportador» → `/disponibilidad`, «Naviera» → `/reservas`, «Agente Operativo» → `/agente` y «Administrador de Naviera» → `/alertas`.

## ERP Naviero simulado

La integración con el Sistema Central de Flota está simulada con `SistemaFlotaSimulado` (variable `ERP_SIMULADO`). No requiere un servicio externo: consulta la capacidad de la base local (incluida la capacidad total del buque, base del tope de sobrecupo), registra las asignaciones y liberaciones, y deja cada llamada en la tabla `integraciones_log`.

La evaluación comercial y aduanera de HU-04 también está simulada (`EvaluacionComercialSimulada`): aprueba a las empresas en estado `Activa`, bloquea cualquier otro estado y registra cada consulta en `integraciones_log` con el resultado.

## Notificaciones internas (simuladas)

HU-03 no usa un sistema externo de notificaciones: al asignar un agente se registran dos avisos en la tabla `notificacion` (uno para el agente y otro para el exportador) y se muestran en el panel del agente. La lista de espera registra también avisos al exportador al entrar a la lista (`lista_espera`), al confirmarse desde ella (`confirmacion_lista_espera`) y al vencer por zarpe (`vencimiento_lista_espera`). No se envía correo real.

## Alcance de estas historias

Incluye la consulta de disponibilidad, la actualización del inventario al confirmar o cancelar reservas, la asignación automática de un agente operativo con alerta y reintento, el formulario de booking con validación, revalidación, comprobante y rechazo por bloqueo, y la lista de espera por sobrecupo (con su consulta, confirmación automática, cancelación y vencimiento por zarpe). No incluye las alternativas «próxima salida» y «otro puerto», una tarea programada para el vencimiento, el vencimiento automático de la reserva temporal, la asignación manual de un agente a elección del administrador, la tarifa referencial, el conocimiento de embarque (BL), la cancelación o reprogramación desde el comprobante, notificaciones reales por correo ni autenticación.
