# Design

## Context

La aplicación ya cubre HU-01 (consulta de disponibilidad), HU-02 (confirmación/cancelación con inventario) y HU-03 (asignación de agente al confirmar). La tabla `reserva` existe con los estados de EST-01 y la asociación `gestiona`, pero se llena solo desde el seed o confirmando reservas existentes, y no guarda contrato. Los servicios `src/servicios/inventario.ts` (`confirmarReserva`, que exige estado `Reserva temporal`) y `src/servicios/asignacion.ts` (`asignarAgenteAReserva`) ya resuelven la transición a `Confirmada` y la asignación; el ERP está simulado en `src/integraciones/sistemaFlota.ts`. Ver `proposal.md` para la motivación y `specs/solicitud-booking/spec.md` para los requisitos.

Restricciones: Express + EJS + `better-sqlite3`, migraciones numeradas, rol de demostración por cookie, sin autenticación real, sin requisitos no funcionales. El bloqueo y la confirmación ocurren en una sola petición.

## Goals / Non-Goals

**Goals:**
- Derivar del modelo de dominio la columna de contrato y mantener alineadas las transiciones de EST-01/EST-02 con los servicios existentes.
- Implementar el flujo de booking en un servicio transaccional que reutilice la confirmación de HU-02 y la asignación de HU-03.
- Emular la evaluación comercial y aduanera como adaptador con log en `integraciones_log`.
- Cubrir cada escenario Gherkin con una prueba de integración.

**Non-Goals:**
- Tarifa, BL, alternativas, revisión manual, cancelación y vencimiento de la reserva temporal.
- Control de concurrencia o reserva real de cupos antes de confirmar (RP-20, no funcional): el bloqueo es lógico y vive dentro de una única transacción.
- Autenticación real y permisos por rol.

## Decisions

### 1. Modelo de datos y migración `004_agregar_contrato_reserva.sql`

| Clase / atributo del dominio | Representación |
|------------------------------|----------------|
| `Reserva` (existente) | Tabla `reserva`, sin cambios salvo el contrato |
| `Reserva.numeroContrato` (nuevo, D2 de la ficha) | Columna `numero_contrato TEXT` (nullable en la base por las reservas ya sembradas; obligatoria a nivel de aplicación para las nuevas) |
| `DetalleReserva` (existente) | Tabla `detalle_reserva`; una fila por línea del formulario |
| `EmpresaExportadora.estadoComercial` | Ya existe; `Activa` = vigente, cualquier otro valor = bloqueo |

- No se agregan tablas nuevas: estados intermedios de EST-01 no se persisten (D4) y el bloqueo temporal de EST-02 se representa con la reserva en `Reserva temporal`, no con una columna de estado en `cupo_contenedor`.
- Alternativa descartada: columna `numero_contrato NOT NULL` con valor por defecto para filas existentes; un dato ficticio en reservas antiguas confunde más de lo que aporta.

### 2. Servicio de booking transaccional (`src/servicios/booking.ts`)

`registrarBooking(db, datos, sistemaFlota, evaluacionComercial, hoy)` dentro de `db.transaction`:

1. **Validar**: empresa y viaje existentes; al menos una línea con cantidad > 0; tipos de contenedor con cupo en el viaje; mercancía y número de contrato informados (formato: 4–30 caracteres alfanuméricos con guiones). Si falla, devuelve `datos_invalidos` con la lista de errores y no escribe nada.
2. **Disponibilidad preliminar**: `sistemaFlota.consultarCapacidad(viajeId)`; si no alcanza la capacidad TEU o algún cupo, devuelve `sin_cupo` sin escribir.
3. **Evaluación comercial**: `evaluacionComercial.validarExportador(empresa)`; si está bloqueado, inserta la reserva con estado `Rechazada`, su detalle y el motivo (sin descontar cupos) y devuelve `rechazada_exportador`.
4. **Reserva temporal**: inserta la reserva en estado `Reserva temporal` con `fechaSolicitud = hoy`, `cantidadTEU = suma de cantidades`, `plazoMaximoCancelacion = fechaZarpe − 7 días` y el contrato; inserta los detalles.
5. **Revalidar y confirmar**: llama a `confirmarReserva` (HU-02), que revalida capacidad y, si alcanza, descuenta TEU/cupos, registra la asignación y deja `Confirmada`. Si responde `rechazada`, la reserva queda `Rechazada` y no hay descuento que liberar. La revalidación es la que ya hace `confirmarReserva`, por lo que no se duplica lógica.
6. **Agente y notificación**: si quedó `Confirmada`, llama a `asignarAgenteAReserva` (HU-03), que asigna y registra las notificaciones internas.
7. Devuelve la reserva confirmada/rechazada y el motivo para la pantalla.

- Alternativa descartada: reimplementar el descuento en `booking.ts`; duplicaría las reglas de inventario y rompería la spec de HU-02.
- Alternativa descartada: confirmar sin pasar por `Reserva temporal`; el diagrama EST-01 y `confirmarReserva` exigen ese estado de origen.

### 3. Código de booking (`generarCodigoBooking`)

Se genera dentro de la transacción como `BK-<año de hoy>-<secuencia>`; la secuencia es el mayor sufijo numérico existente para ese año más uno. La restricción `UNIQUE(codigo_booking)` protege ante reintentos. Alternativa descartada: UUID; no es legible para el comprobante ni coherente con los datos de ejemplo (`BK-HU02-001`).

### 4. Integración simulada `src/integraciones/evaluacionComercial.ts`

| Mensaje del DSS-02 | Adaptador | Comportamiento |
|--------------------|-----------|----------------|
| `Validar estado comercial y documentación aduanera` | `EvaluacionComercial.validarExportador(empresa)` | Devuelve `{ aprobado: true }` si `estadoComercial = 'Activa'`; si no, `{ aprobado: false, motivo: 'El exportador registra un bloqueo comercial o aduanero vigente.' }`. Registra cada llamada en `integraciones_log` con el sistema «Sistema de Evaluación Comercial y Aduana». |

- `ERP_SIMULADO` se mantiene como en HU-01/HU-02. El adaptador de Aduana no tiene modo real; se documenta que es simulado y se registra su llamada.

### 5. Rutas y pantallas (derivadas de DSS-02)

| Paso del DSS-02 | Ruta | Pantalla / resultado |
|-----------------|------|----------------------|
| Ingresar solicitud de Booking | `GET /booking?viaje=<codigoViaje>` | `booking.ejs`: selección de empresa, viaje, hasta 3 líneas de contenedor (tipo/cantidad/peso), mercancía y contrato |
| Mostrar errores para corregir | `POST /booking` (datos inválidos) | `booking.ejs` con la lista de errores y los valores ingresados |
| Rechazar por falta de cupos / bloqueo | `POST /booking` | `booking.ejs` con el mensaje de rechazo (sin descuento) |
| Mostrar comprobante de reserva | `GET /booking/:id/comprobante` (redirección tras confirmar) | `comprobante.ejs`: código Booking, empresa, viaje y ruta, zarpe, contenedores, mercancía, contrato, plazo de cancelación, agente asignado o etiqueta «sin agente asignado», y aviso de notificación |

- Se agrega el enlace «Solicitar reserva» en `disponibilidad.ejs` y en el encabezado para el rol `exportador`. El formulario acepta el viaje preseleccionado desde el calendario; si no viene, se elige en un desplegable.
- Los roles se mantienen como hoy: el formulario se muestra al rol `exportador`; no se bloquea el acceso desde otros roles (demostración, RP-24 no funcional).

### 6. Datos de ejemplo (`src/db/seed.ts`)

- Se agrega la empresa `79.999.999-9 — Carga Rápida SpA` con `estadoComercial = 'Bloqueada'` (D9).
- Las reservas sembradas reciben un `numeroContrato` ficticio coherente (`CT-2026-001`, etc.) para no dejar la columna vacía en las pantallas existentes.

### 7. Pruebas

- `tests/hu04.test.ts`: una prueba de integración por escenario Gherkin (confirmación exitosa con 5 cupos 20GP; rechazo por bloqueo sin descuento).
- Pruebas de apoyo en `tests/booking.test.ts`: datos obligatorios, contrato inválido, sin cupo preliminar, revalidación sin disponibilidad, código único e idempotencia de la generación.
- Se reutiliza el patrón `crearConexion(':memory:')` + `sembrar(db)` de las pruebas existentes.

## Risks / Trade-offs

- **[Dos responsabilidades en el seed]**: la empresa bloqueada convive con las activas y podría confundir en la lista de reservas → se rotula su estado en el formulario y en el comprobante; el escenario de rechazo es explícito.
- **[Bloqueo no físico]**: entre la verificación y la confirmación otra solicitud podría consumir el cupo → `confirmarReserva` revalida dentro de la misma transacción SQLite; si el cupo ya no alcanza, la reserva queda `Rechazada` (RP-20 completo queda fuera de alcance).
- **[Columna de contrato nullable]**: permite filas antiguas sin contrato → el servicio exige contrato para toda reserva nueva; las vistas muestran «—» si falta.
- **[Código de booking por secuencia]**: dos procesos concurrentes podrían chocar → la transacción y la restricción `UNIQUE` lo impiden; el error se traduce a un mensaje de reintento.

## Migration Plan

1. `npm run db:reset` (o arrancar la app) aplica `001`–`004` en orden; las bases existentes reciben la nueva columna al vuelo.
2. El seed es idempotente (`ON CONFLICT DO NOTHING`) y agrega la empresa bloqueada y los contratos de ejemplo.
3. Reversión: al ser una base local de demostración, basta restaurar `data/app.db` desde una copia o ejecutar `npm run db:reset`.
