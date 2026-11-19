# Design

## Context

La aplicación ya atiende HU-01 (consulta de disponibilidad) y HU-02 (confirmación/cancelación con actualización de inventario). `reserva` existe con los estados del EST-01, pero no tiene agente ni tabla de agentes. El rol de demostración ya incluye `agente` y `administrador` (`src/app.ts`), aunque ambos redirigen hoy a `/disponibilidad`. Ver `proposal.md` para la motivación y `specs/asignacion-agente-operativo/spec.md` para los requisitos.

Restricciones: monólito Express + EJS, SQLite con `better-sqlite3`, migraciones numeradas, sin autenticación real, sin requisitos no funcionales. HU-03 no tiene DSS: el flujo se reconstruyó desde el Gherkin y CU-05/CU-06 (ficha `.cin324/historias/HU-03.md`).

## Goals / Non-Goals

**Goals:**
- Derivar del modelo de dominio la tabla `agente_operativo` y la asociación `gestiona` (0..1 reserva → agente).
- Implementar la regla de asignación en un único servicio reutilizable por la confirmación y por el reintento.
- Mostrar el responsable en la reserva, el panel del agente y la alerta del administrador.
- Cubrir cada escenario Gherkin con una prueba de integración.

**Non-Goals:**
- Crear o confirmar reservas (HU-04).
- Asignación manual a un agente elegido por el administrador (solo reintento con la misma regla).
- Autenticación, permisos reales, correo real y requisitos no funcionales.
- Cambiar los requisitos de `gestion-inventario-espacio`.

## Decisions

### 1. Tablas derivadas del modelo de dominio (migración `003_crear_agente_operativo.sql`)

| Clase / asociación del dominio | Representación |
|------------------------------|----------------|
| `AgenteOperativo` (`identificadorEmpleado`, `nombreCompleto`, `correoCorporativo`, `zonaGeograficaAsignada`, `limiteMaximoReservas`) | Tabla `agente_operativo` con `identificador_empleado UNIQUE`, `nombre_completo`, `correo_corporativo`, `zona_geografica_asignada`, `limite_maximo_reservas` |
| `/reservasActivasActuales` (derivado) | **No se almacena**: se calcula con `COUNT` de `reserva` en estado `Confirmada` con ese `agente_operativo_id` |
| `gestiona` 0..1 → 0..* | Columna nullable `reserva.agente_operativo_id REFERENCES agente_operativo(id) ON DELETE SET NULL` (la reserva puede no tener agente) |
| Notificación (no es clase del modelo, decisión D3) | Tabla `notificacion`: `reserva_id`, `agente_operativo_id` (nullable), `destinatario_tipo` (`agente`/`exportador`), `destinatario_correo`, `tipo`, `mensaje`, `fecha` |

- La alerta de asignación manual **no se almacena como estado aparte**: es una vista derivada de `reserva` en estado `Confirmada` con `agente_operativo_id IS NULL`. Al asignarse el agente la consulta deja de devolverla, lo que cumple «la alerta deja de estar pendiente» sin duplicar el estado de la reserva (D4 de la ficha: no se agrega un estado a EST-01).
- Alternativa descartada: crear una tabla `alerta` con ciclo de vida propio; añadía estado redundante y riesgo de desincronización con la reserva.

### 2. Regla de asignación en un solo servicio (`src/servicios/asignacion.ts`)

`asignarAgenteA reserva(db, reservaId)`:
1. Carga la reserva; si no está `Confirmada` o ya tiene agente, no hace nada (idempotente) y devuelve `ya_asignada`/`estado_invalido`.
2. Obtiene `puerto_destino.zona_geografica` del viaje.
3. Consulta agentes con `zona_geografica_asignada = zona` y `reservasActivasActuales < limite_maximo_reservas`, ordenados por `reservasActivasActuales ASC, identificador_empleado ASC`.
4. Si hay candidato: guarda `reserva.agente_operativo_id` y registra dos notificaciones (agente y exportador) con `codigoBooking`, empresa, viaje, ruta y responsable.
5. Si no hay candidato: no modifica la reserva y devuelve `sin_agente` (la alerta surge de la vista derivada).

- Alternativa descartada: asignar dentro de `confirmarReserva` (HU-02). Se mantiene HU-02 sin cambios y la asignación se invoca desde la ruta tras una confirmación exitosa; si la asignación fallara, la reserva queda `Confirmada` sin agente y aparece en la alerta, por lo que el reintento la recupera. El costo es una ventana mínima entre confirmación y asignación, aceptable en un monoproceso SQLite.

### 3. Integración con la confirmación existente (`src/rutas/reservas.ts`)

Tras `confirmarReserva(...).tipo === 'confirmada'`, se llama al servicio y el mensaje de éxito se amplía:
- con agente: «Reserva BK-… confirmada. Capacidad disponible del viaje: N TEUs. Agente asignado: Ana Torres (A-001).»
- sin agente: «… confirmada. Capacidad disponible … N TEUs. Sin agente asignado: no hay agentes con cupo de atención en la zona "Europa". Se emitió una alerta al administrador.»

No cambia el contrato de inventario ni sus pruebas; solo el texto del mensaje (las pruebas de HU-02 siguen encontrando «confirmada» y los TEUs).

### 4. Rutas reconstruidas (no hay DSS) y pantallas

| Paso del flujo | Ruta | Pantalla / resultado |
|----------------|------|----------------------|
| El agente consulta sus reservas y notificaciones | `GET /agente` (selector `?agente=<identificadorEmpleado>`) | `src/vistas/agente.ejs`: datos del agente, reservas asignadas y notificaciones |
| El administrador ve reservas sin agente y agentes con su carga | `GET /alertas` | `src/vistas/alertas.ejs`: alertas pendientes, tabla de agentes con `/reservasActivasActuales` y `limiteMaximoReservas` |
| El administrador reintenta la asignación | `POST /alertas/:reservaId/reintentar` | Redirige a `/alertas` con mensaje de éxito («Agente asignado a la reserva BK-…: …») o error («No se pudo asignar la reserva BK-…: todos los agentes de la zona "Europa" alcanzaron su límite de reservas activas.») |
| La reserva muestra su responsable | `GET /reservas` | Nueva columna «Agente»: nombre o etiqueta «Sin agente asignado» |

- Selector de rol de demostración: se mantiene en el encabezado; se agregan enlaces de navegación condicionados por rol («Panel del agente» para `agente`, «Alertas» para `administrador`) y `DESTINO_POR_ROL` en `src/app.ts` pasa a `/agente` y `/alertas`. El agente concreto se elige con el parámetro `?agente=` en la propia pantalla (no se almacena sesión).
- `GET /reservas` sigue accesible para `naviera` y para verificación del recorrido.

### 5. Datos de ejemplo (seed idempotente)

- Agentes: `A-001` Ana Torres (Asia-Pacífico, límite 2), `A-002` Bruno Silva (Asia-Pacífico, límite 2), `A-003` Carla Núñez (Europa, límite 1), `A-004` Diego Rojas (Sudamérica, límite 3).
- Reservas nuevas: `BK-HU03-001` (`Reserva temporal`, VIA-001 Asia-Pacífico, 5 TEUs, 40HQ) para demostrar la asignación al confirmar; `BK-HU03-002` (`Confirmada`, nuevo viaje `VIA-006` San Antonio→Rotterdam, 5 TEUs, asignada a Carla) para que Europa esté en su límite y demostrar la alerta al confirmar `BK-HU02-001`.
- `BK-HU02-003` (ya `Confirmada`, Sudamérica) se siembra asignada a Diego.
- Viaje nuevo `VIA-006` con cupo 40HQ coherente con la reserva confirmada.
- Se actualiza `tests/seed.test.ts` con los nuevos totales (6 viajes, 6 cupos, 5 reservas) y el detalle de las reservas; el escenario de HU-02 conserva VIA-003 en 50 TEUs para no alterar sus pruebas.

### 6. Integraciones externas

Ninguna: la notificación al agente y al exportador es interna (registro en `notificacion` y paneles). No se usa ni se modifica `integraciones_log`; no hay adaptadores simulados que declarar.

### 7. Pruebas

`tests/hu03.test.ts` con una prueba de integración por escenario Gherkin, nombradas `HU-03 · <escenario>`, más reintento y reglas:
1. Asignación exitosa: reserva confirmada en Asia-Pacífico, dos agentes con 0 activas (desempate A-001), se verifica `agente_operativo_id`, notificaciones al agente y al exportador.
2. Escalamiento: Carla con 1/1 activa y reserva confirmada en Europa, se verifica reserva `Confirmada` sin agente y alerta en `/alertas`.
3. Reintento: se libera cupo (se cancela o desasigna la reserva activa de Carla) y se reintenta, se verifica asignación, notificación y que la alerta desaparece.
4. Pruebas unitarias de la consulta de candidatos (límite alcanzado, menor carga, desempate, zona sin agentes).

## Risks / Trade-offs

- **Ventana entre confirmar y asignar** → la alerta derivada y el reintento recuperan cualquier fallo; la operación es idempotente.
- **Cambian los totales del seed** → se actualizan las pruebas del seed; los datos de HU-01/HU-02 se mantienen intactos.
- **Sin autenticación, cualquiera cambia de rol** → aceptado como demostración; se avisa en la guía de pruebas.
- **Notificaciones sin estado leído/no leído** → se muestran como bitácora; si el estudiante lo pide, se agrega en un cambio posterior.
- **Asignación basada solo en zona y carga** → el Gherkin no define otros criterios; la regla queda aislada en el servicio para evolucionar.

## Migration Plan

1. Nueva migración `003_crear_agente_operativo.sql` aplicada automáticamente al arrancar (registrada en `schema_migrations`), sin reescribir las anteriores.
2. `npm run db:reset` reconstruye `data/app.db` y recarga el seed ampliado; `npm run db:seed` es idempotente.
3. Reversión: restaurar una copia de `data/app.db` o ejecutar `npm run db:reset` con la versión anterior; las columnas nuevas son nullable y no afectan datos previos.
