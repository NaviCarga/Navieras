# Naviera Guerrero · Disponibilidad, inventario, asignación y booking

Aplicación web de las historias **HU-01: consulta de itinerarios y disponibilidad de cupos**, **HU-02: actualización automática del inventario de espacio por reservas**, **HU-03: asignación automática de un agente operativo a cada reserva confirmada** y **HU-04: solicitud y confirmación de reserva (booking)** (CIN 324).

- **Disponibilidad:** filtra viajes por puerto de origen, puerto de destino y tipo de contenedor, y muestra los cupos agrupados por fecha de zarpe.
- **Reservas:** lista las reservas y permite confirmarlas o cancelarlas; la capacidad del viaje y de los cupos por tipo se descuenta o restituye automáticamente.
- **Panel del agente:** muestra al agente operativo sus reservas asignadas y sus notificaciones.
- **Alertas:** muestra al administrador las reservas confirmadas sin agente y permite reintentar la asignación.
- **Booking:** el exportador solicita una reserva indicando empresa, viaje, contenedores, mercancía, peso y contrato; el sistema valida, revalida el cupo, asigna agente y emite un comprobante con código `BK-<año>-<secuencia>`.

## Requisitos

- Node.js 20 o superior
- npm

## Instalación

```bash
npm install
```

## Datos de ejemplo

```bash
npm run db:seed
```

El comando crea la base SQLite en `data/app.db`, aplica las migraciones pendientes (incluida `003_crear_agente_operativo.sql`, que agrega agentes, la asignación en `reserva` y la tabla `notificacion`, y `004_agregar_contrato_reserva.sql`, que agrega `numero_contrato` a `reserva`) y carga los datos de ejemplo. Es idempotente: se puede ejecutar varias veces sin duplicar filas, pero **no reinicia** los estados ni las capacidades que ya hayan cambiado. Para volver a los datos iniciales y repetir el recorrido:

```bash
npm run db:reset
```

`db:reset` borra las filas de ejemplo y vuelve a cargarlas, sin eliminar el archivo ni las migraciones. Se puede usar con el servidor detenido o en ejecución.

Datos de **HU-01**:

- San Antonio → Shanghái, buque **Buque Andino**, zarpe `2026-11-20`, arribo estimado `2026-12-18`, 25 cupos `40HQ`.
- Valparaíso → Rotterdam, buque **Buque Pacífico**, zarpe `2026-12-01`, arribo estimado `2027-01-05`, 0 cupos `40RF`.

Datos de **HU-02**:

- `BK-HU02-001`: 10 TEUs `40HQ` en un viaje con 50 TEUs disponibles, en estado **Reserva temporal**.
- `BK-HU02-002`: 6 TEUs `20GP` en un viaje con solo 4 TEUs disponibles, en estado **Reserva temporal** (sirve para ver el rechazo por capacidad insuficiente).
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
- <http://localhost:3000/booking/:id/comprobante>: comprobante de la reserva con código Booking, viaje, contenedores, contrato, plazo de cancelación y agente asignado.

Al confirmar una reserva con cupo suficiente, la capacidad del viaje y del tipo de contenedor disminuye y la reserva pasa a **Confirmada**. Si no hay cupo, se rechaza y la capacidad no cambia. Al cancelar dentro del plazo máximo, el cupo se restituye; fuera del plazo, la cancelación se rechaza.

En **Booking**, el formulario exige empresa, viaje, al menos un contenedor, tipo de mercancía y número de contrato. Si los datos son inválidos o no hay cupo, se muestran los errores sin crear la reserva. Si la empresa está bloqueada, la reserva queda **Rechazada** con el motivo y sin descontar cupos. Si todo es válido, se crea una **Reserva temporal**, se revalida la disponibilidad, se confirma con código `BK-<año>-<secuencia>`, se descuentan TEUs y cupos, se asigna agente según HU-03 y se registra la notificación al exportador. El plazo máximo de cancelación es 7 días antes del zarpe.

Al quedar **Confirmada**, el sistema busca agentes de la zona del puerto de destino con cupo de atención y asigna el de menor cantidad de reservas activas. Si no hay ninguno, la reserva queda confirmada sin agente y aparece en `/alertas`; el botón **Reintentar asignación** vuelve a aplicar la misma regla.

## Probar

```bash
npm test
```

Ejecuta las pruebas de base de datos, seed, dominio, integración, inventario, pantallas y los escenarios Gherkin de HU-01, HU-02, HU-03 y HU-04 (incluido el rechazo de cancelación fuera de plazo, la asignación por zona y carga, el escalamiento al administrador, el reintento, la confirmación de booking por 5 contenedores `20GP` con comprobante y el rechazo por bloqueo comercial sin descontar cupos). También se puede verificar el tipado con:

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

La integración con el Sistema Central de Flota está simulada con `SistemaFlotaSimulado` (variable `ERP_SIMULADO`). No requiere un servicio externo: consulta la capacidad de la base local, registra las asignaciones y liberaciones, y deja cada llamada en la tabla `integraciones_log`.

La evaluación comercial y aduanera de HU-04 también está simulada (`EvaluacionComercialSimulada`): aprueba a las empresas en estado `Activa`, bloquea cualquier otro estado y registra cada consulta en `integraciones_log` con el resultado.

## Notificaciones internas (simuladas)

HU-03 no usa un sistema externo de notificaciones: al asignar un agente se registran dos avisos en la tabla `notificacion` (uno para el agente y otro para el exportador) y se muestran en el panel del agente. No se envía correo real.

## Alcance de estas historias

Incluye la consulta de disponibilidad, la actualización del inventario al confirmar o cancelar reservas, la asignación automática de un agente operativo con alerta y reintento, y el formulario de booking con validación, revalidación, comprobante y rechazo por bloqueo. No incluye el vencimiento automático de la reserva temporal, la asignación manual de un agente a elección del administrador, la tarifa referencial, el conocimiento de embarque (BL), la cancelación o reprogramación desde el comprobante, notificaciones reales por correo ni autenticación.
