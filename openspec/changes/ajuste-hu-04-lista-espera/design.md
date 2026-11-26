# Design — ajuste-hu-04-lista-espera

## Context

Ver `proposal.md` (Why) y los deltas en `specs/`. Estado actual del código:

- `src/servicios/booking.ts` (`registrarBooking`) valida datos, llama a `faltaCapacidad` y, si falta cupo, devuelve `sin_cupo` **sin registrar nada**; si el exportador está bloqueado registra `Rechazada`; si todo está bien crea `Reserva temporal` y llama a `confirmarReserva`.
- `src/servicios/inventario.ts`: `confirmarReserva` exige `Reserva temporal` y, si no alcanza la capacidad, deja `Rechazada`; `cancelarReserva` exige `Confirmada` y el plazo, y restituye TEU y cupos. La `Reserva temporal` no descuenta nada (el bloqueo es lógico, dentro de la misma transacción); «liberar el espacio temporal» no requiere escritura.
- `src/servicios/asignacion.ts` (`asignarAgenteAReserva`) asigna agente por zona del puerto de destino a reservas `Confirmada` (HU-03).
- `src/integraciones/sistemaFlota.ts` (ERP simulado): `consultarCapacidad` devuelve `capacidadDisponibleTEU` y los cupos.
- `buque.capacidad_total_teu` **ya existe** desde `001_crear_tablas.sql` (`Buque.capacidadTotalTEU`).
- Las tablas `notificacion` e `integraciones_log` ya existen.

Restricciones: Express + EJS + `better-sqlite3`, migraciones numeradas sin reescribir las anteriores, rol de demostración, sistemas externos simulados, sin requisitos no funcionales.

## Goals / Non-Goals

**Goals:**
- Una sola función de regla de sobrecupo, usada por la verificación preliminar, la revalidación y la confirmación desde `/reservas`.
- Una sola función por transición nueva de EST-01 (`detectarSobrecupo`, confirmar desde la lista, cancelar en lista, `cerrarListaPorZarpe`), con mensaje claro si el estado de origen no es válido.
- Reutilizar el descuento/restitución de inventario de HU-02 y la asignación de agente de HU-03 sin duplicar lógica.
- Una prueba por escenario Gherkin nuevo o modificado.

**Non-Goals:**
- Tarea programada (cron) ni temporizador para el zarpe.
- Columna de estado por fila de `cupo_contenedor` (se mantiene la decisión C7 de HU-02).
- Evaluación comercial al confirmar desde la lista de espera (el flujo de la ficha no la pide; ver Riesgos).

## Decisions

### 1. Regla de sobrecupo con `D_efectiva` — **supuesto explícito (decisión confirmada 1)**

```
q            = suma de cantidadSolicitada de los detalles (1 TEU por contenedor)
D_efectiva   = min(Viaje.capacidadDisponibleTEU,
                   Σ CupoContenedor.cantidadDisponible de los tipos solicitados)   // tipo sin fila de cupo = 0
cabe         = q ≤ D_efectiva  y  cantidad_t ≤ cantidadDisponible_t para cada tipo t solicitado
E            = Σ cantidadTEU de las reservas del viaje en "En lista de espera"
exceso       = q − D_efectiva
tope         = floor(Buque.capacidadTotalTEU × 3 / 100)                             // inclusivo
sobrecupo    = E + exceso

cabe                  → flujo normal (comercial → Reserva temporal → Confirmada)
!cabe, sobrecupo ≤ tope → "En lista de espera" (SobreReserva, exceso guardado)
!cabe, sobrecupo > tope → "Rechazada"
```

- Se usa `D_efectiva` en lugar de `D = Viaje.capacidadDisponibleTEU` porque el inventario tiene dos niveles (TEU del viaje y cupos por tipo) y una solicitud puede no caber por falta de cupo del tipo aunque el viaje tenga TEU. Con los escenarios Gherkin (un solo tipo, cupos coherentes con D) `D_efectiva = D`.
- `tope` con `floor` (propuesta D11 de HU-04 / D1 de HU-02): 100 TEU → 3; 4000 → 120; 5000 → 150.
- **Caso borde a revisar (S-1):** con varias líneas de distinto tipo puede ocurrir `q ≤ D_efectiva` pero un tipo sin cupo suficiente (por ejemplo, 2×20GP con 0 disponibles y 1×40HQ con 5 disponibles). Ahí `exceso = q − D_efectiva ≤ 0`. Supuesto propuesto: en ese caso `exceso = Σ max(0, cantidad_t − cantidadDisponible_t)` (lo que falta por tipo), y se aplica la misma comparación con el tope. Si prefieres otra regla, dímelo en la revisión.
- Se implementa en `src/servicios/listaEspera.ts` como función pura `evaluarSobrecupo({ q, capacidadViaje, cupos, solicitados, E, capacidadTotalTEU })` → `{ cabe, exceso, sobrecupo, tope }`, más un envoltorio que lee los datos con el ERP simulado. Alternativa descartada: repetir el cálculo en `booking.ts` e `inventario.ts`; divergirían.

### 2. Modelo de datos y migración `005_crear_sobre_reserva.sql`

| Clase / atributo del dominio | Representación |
|------------------------------|----------------|
| `Buque.capacidadTotalTEU` | **Ya existe** en `buque.capacidad_total_teu` (migración 001). No se vuelve a crear: un `ALTER TABLE ... ADD COLUMN` duplicado haría fallar la migración. La 005 solo lo documenta en un comentario. |
| `SobreReserva` (subclase de `Reserva`) | Tabla `sobre_reserva` con `reserva_id INTEGER PRIMARY KEY REFERENCES reserva(id) ON DELETE CASCADE` (tabla por subclase, elegida por el estudiante en lugar de la columna `tipo`) |
| `SobreReserva.posicionListaEspera` | `posicion_lista_espera INTEGER NULL CHECK (posicion_lista_espera >= 1)`; `NULL` cuando la reserva sale de la lista (confirmada, cancelada o vencida), así se conserva el historial |
| `SobreReserva.excesoSolicitadoTEU` | `exceso_solicitado_teu INTEGER NOT NULL CHECK (exceso_solicitado_teu >= 0)` |
| `Reserva.estadoReserva` | Se agregan los valores `En lista de espera` y `Vencida` (texto, sin CHECK para no reescribir la tabla) |

- El tope y el sobrecupo no se guardan: se calculan (08-modelo-dominio).
- Tipos: `Reserva` (y `ReservaConDetalles`) ganan `posicionListaEspera: number | null` y `excesoSolicitadoTEU: number | null` leídos con `LEFT JOIN sobre_reserva`. `CapacidadViaje` del ERP gana `capacidadTotalTEU`.

### 3. Posición en la lista

- Al entrar a la lista: `posicion = MAX(posicion del viaje) + 1` (última posición, orden de llegada a la lista).
- Al salir alguien: se renumeran 1..n las restantes del viaje **conservando su orden relativo** (`ORDER BY posicion_lista_espera`).
- Alternativa descartada: ordenar por `fechaSolicitud, id`; una `Reserva temporal` antigua que pasa a la lista desde `/reservas` quedaría delante de otras que llegaron antes a la lista, contra «en la última posición» del flujo de HU-02.

### 4. Transiciones (una función por evento, en una transacción)

| Evento (EST-01) | Función | Origen → destino |
|-----------------|---------|------------------|
| `detectarSobrecupo` (solicitud) | `registrarBooking` usa `evaluarSobrecupo` antes de la evaluación comercial | Inicial → `En lista de espera` / `Rechazada` |
| `confirmarReserva` / `detectarSobrecupo` (revalidar) | `confirmarReserva` (inventario.ts) | `Reserva temporal` → `Confirmada` / `En lista de espera` / `Rechazada` |
| Cancelar reserva confirmada | `cancelarReserva` → restituye → `revisarListaEspera(viajeId)` | `Confirmada` → `Cancelada` |
| Liberar cupo por cancelación | `revisarListaEspera`: recorre por posición y confirma **la primera que quepa completa** (decisión confirmada 2), saltando las que no caben; solo una por liberación | `En lista de espera` → `Confirmada` |
| Cancelar reserva en lista de espera | `cancelarReserva` acepta también `En lista de espera` sin aplicar plazo | `En lista de espera` → `Cancelada` |
| `cerrarListaPorZarpe` | `cerrarListasPorZarpe(db, hoy)` | `En lista de espera` → `Vencida` |

- Confirmar desde la lista reutiliza el descuento de TEU y cupos de `confirmarReserva` (se extrae a `comprometerInventario(db, reserva, sistemaFlota)`), conserva `codigo_booking`, pone `posicion_lista_espera = NULL`, renumera, registra la asignación en el ERP simulado, llama a `asignarAgenteAReserva` (HU-03) y registra una notificación al exportador (`tipo = 'confirmacion_lista_espera'`).
- Entrar a la lista registra una notificación `lista_espera` con la posición; vencer registra `vencimiento_lista_espera`.
- Desde `Reserva temporal`, pasar a la lista o a `Rechazada` no escribe en el inventario (el bloqueo es lógico; ver Contexto).
- Transición no permitida → resultado `estado_invalido` con mensaje claro (patrón existente).

### 5. Rechazos persistidos (decisión confirmada 4)

- Sobrecupo sobre el tope, bloqueo comercial y disponibilidad agotada al revalidar → fila en `reserva` con estado `Rechazada`, su detalle y código Booking, sin fila en `sobre_reserva` y sin descontar.
- **No** se registran las solicitudes con datos inválidos (campos faltantes o contrato inválido): el flujo de la ficha (paso 3) y la spec vigente dicen «no registra la solicitud», y sin datos completos no se puede crear la `Reserva`. El resultado `sin_cupo` desaparece.

### 6. Vencimiento por zarpe perezoso — **supuesto explícito (decisión confirmada 3)**

- `cerrarListasPorZarpe(db, hoy = fechaHoy())`: toda reserva `En lista de espera` cuyo viaje tenga `fecha_zarpe ≤ hoy` pasa a `Vencida`, `posicion = NULL`, notificación al exportador y renumeración. Idempotente: una segunda llamada no encuentra filas.
- Se invoca al inicio de `GET /disponibilidad`, `GET /reservas`, `GET /booking` (incluye `GET /booking/estado`, que vive bajo `/booking`) y `GET /booking/:id/comprobante`, y con el botón **«Cerrar listas de espera vencidas»** de `/reservas` (`POST /reservas/cerrar-listas`, rol Naviera), que informa cuántas reservas vencieron.
- Alternativa descartada: cron o `setInterval`; agrega infraestructura y vuelve no determinista la prueba. Limitación aceptada: si nadie abre esas pantallas, el estado en la base sigue «En lista de espera» hasta la siguiente carga.

### 7. Rutas y pantallas (DSS-02, CU-07, CU-08)

| Mensaje / acción | Ruta | Resultado visible |
|------------------|------|-------------------|
| Enviar solicitud | `POST /booking` | Confirmada o En lista de espera → redirige al comprobante; Rechazada (bloqueo, sobrecupo) → formulario con el código y el motivo («supera el tope de sobrecupo del viaje: sobrecupo acumulado X TEUs, tope Y TEUs») |
| Comprobante | `GET /booking/:id/comprobante` | Muestra estado; si está en espera, la posición y que no hay cupo comprometido |
| Consultar estado (CU-07) | `GET /booking/estado?codigo=BK-…` | Estado, viaje y posición; si está en espera, botón «Cancelar reserva en lista de espera» |
| Cancelar en lista (exportador) | `POST /booking/:id/cancelar` | Redirige a `/booking/estado?codigo=…` con mensaje |
| Confirmar / cancelar (Naviera) | `POST /reservas/:id/confirmar`, `POST /reservas/:id/cancelar` | Mensaje con el nuevo estado; al cancelar, informa si se confirmó una reserva de la lista |
| Cerrar listas | `POST /reservas/cerrar-listas` | Mensaje «N reservas pasaron a Vencida» |
| HU-01 sin cupo | `GET /disponibilidad` | Texto: «Sin confirmación inmediata para este tipo; la solicitud puede quedar "En lista de espera" si no supera el tope de sobrecupo.» Se mantiene «Solicitar». |

`/reservas` agrega la columna «Posición en lista de espera».

### 8. Integraciones simuladas

| Sistema | Cambio |
|---------|--------|
| Sistema Central de Flota (ERP Naviero) | `consultarCapacidad` devuelve también `capacidadTotalTEU` del buque; `registrarAsignacion` se llama al confirmar desde la lista. Todo queda en `integraciones_log`. |
| Sistema de Evaluación Comercial y Aduana | Sin cambios; no se llama cuando la solicitud va a la lista o se rechaza por sobrecupo (ficha HU-04, paso 4). |

### 9. Datos de ejemplo (decisión confirmada 5)

- Buque nuevo `IMO-9000003` «Buque Austral», `capacidadTotalTEU = 100` (tope 3).
- `VIA-004` pasa al Buque Austral (D = 4) y `BK-HU02-002` pasa a 10 contenedores `20GP` (escenario HU-02 «sobre el tope»: sobrecupo 6 > 3).
- Viajes nuevos del Buque Austral con D = 0 (cupos con `cantidadDisponible = 0`), uno por escenario manual: lista vacía (HU-04 dentro/sobre el tope), lista con 3 TEU (tope compartido), lista con 2 + 1 TEU (consulta en posición 2 y cancelación en lista), confirmada 8 + espera 3 y confirmada 2 + espera 3 (HU-02 CU-08), y uno con zarpe ya pasado y una reserva en espera (vencimiento visible al cargar).
- Las reservas en espera del seed crean su fila en `sobre_reserva`. El seed sigue siendo idempotente; como cambian datos existentes, el README indica `npm run db:reset`.
- `tests/hu02.test.ts` se actualiza al nuevo escenario 2 y agrega los tres escenarios de lista de espera; `tests/seed.test.ts` ajusta los conteos.

## Risks / Trade-offs

- [Una reserva en espera se confirma sin evaluación comercial] → Se sigue la ficha (la lista no evalúa comercial). Queda anotado como limitación para la validación del sistema.
- [Vencimiento perezoso: la base puede mostrar «En lista de espera» después del zarpe hasta que alguien cargue una pantalla] → Todas las pantallas que muestran reservas cierran antes de leer, y la Naviera tiene el botón.
- [Las fechas fijas del seed envejecen (un viaje del seed ya zarpó)] → Las pruebas fijan `hoy` o la fecha de zarpe explícitamente; el README explica qué esperar.
- [Cambia el comportamiento de pruebas existentes (`sin_cupo`, HU-02 «capacidad insuficiente», aviso de HU-01)] → Se actualizan en este cambio y se listan en `tasks.md`.
- [Supuesto S-1 (varios tipos con un tipo sin cupo)] → Se implementa como se describe salvo que el estudiante lo corrija en la revisión.
- [Solo se confirma una reserva por cancelación aunque quepan más] → Es la decisión confirmada 2 («la primera que quepa»); la siguiente liberación revisa de nuevo.

## Migration Plan

1. Agregar `005_crear_sobre_reserva.sql`; se aplica sola al arrancar (registrada en `schema_migrations`).
2. Ejecutar `npm run db:reset` para recargar el seed con el buque de 100 TEU.
3. Rollback: borrar la tabla `sobre_reserva` y la fila `005_crear_sobre_reserva.sql` de `schema_migrations`, y volver a `db:reset` con el código anterior.
