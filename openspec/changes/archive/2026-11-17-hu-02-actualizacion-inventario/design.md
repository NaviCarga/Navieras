# Design

## Context

La aplicación ya implementa HU-01 (consulta de disponibilidad) con TypeScript + Express + EJS, SQLite mediante `better-sqlite3`, migraciones numeradas en `src/db/migrations/` y pruebas con Vitest + supertest. Existen las tablas `buque`, `puerto`, `viaje`, `cupo_contenedor`, `integraciones_log` y `schema_migrations`, un adaptador simulado del ERP y un selector de rol de demostración.

HU-02 necesita reservas que todavía no están modeladas en la base y una pantalla para ejecutar la confirmación y la cancelación. La ficha confirmada está en `.cin324/historias/HU-02.md`; el modelo en `08-modelo-dominio.md` y `diagramas/modelo-dominio.puml`; los estados en `diagramas/est-01.puml` y `diagramas/est-02.puml`. No hay DSS de CU-03 ni CU-04: el flujo se reconstruye desde el Gherkin. Ver `proposal.md` para la motivación y `specs/gestion-inventario-espacio/spec.md` para los requisitos.

## Goals / Non-Goals

**Goals:**
- Crear las tablas de `EmpresaExportadora`, `Reserva` y `DetalleReserva` derivadas del modelo de dominio.
- Implementar la confirmación y la cancelación de reservas como operaciones transaccionales sobre el inventario del viaje y de los cupos por tipo.
- Exponer una pantalla de reservas y las rutas POST derivadas del flujo reconstruido.
- Extender el adaptador simulado del ERP para consultar capacidad y registrar asignaciones/liberaciones.
- Cubrir los tres escenarios Gherkin y la variante de cancelación fuera de plazo con pruebas.

**Non-Goals:**
- No se implementa el formulario de booking de HU-04 ni sus validaciones comerciales.
- No se implementa el bloqueo temporal de cupos ni el vencimiento de la reserva temporal (RP-07); una reserva en `Reserva temporal` no descuenta capacidad hasta confirmarse, tal como exige el escenario 1.
- No se implementa un estado por fila de `cupo_contenedor`; se usan cantidades, según la decisión confirmada.
- No se implementa autenticación ni autorización real; el rol es de demostración.
- No se implementan los requisitos no funcionales RP-20, RP-21 ni RP-25.

## Decisions

### 1. Tablas derivadas del modelo de dominio (migración `002`)

| Tabla | Columnas | Origen en el modelo |
|-------|----------|---------------------|
| `empresa_exportadora` | `id`, `rut` (único), `razon_social`, `correo_contacto`, `estado_comercial` | Clase `EmpresaExportadora` |
| `reserva` | `id`, `codigo_booking` (único), `empresa_exportadora_id` (FK), `viaje_id` (FK), `fecha_solicitud`, `cantidad_teu`, `tipo_mercancia`, `plazo_maximo_cancelacion`, `estado_reserva` | Clase `Reserva` y asociaciones `solicita`, `concentra` |
| `detalle_reserva` | `id`, `reserva_id` (FK, `ON DELETE CASCADE`), `tipo_contenedor`, `cantidad_solicitada`, `peso_estimado_ton` | Clase `DetalleReserva` y composición `contiene` |

- `empresa_exportadora_id` y `viaje_id` son `NOT NULL` (multiplicidades mínimas 1).
- `detalle_reserva.reserva_id` usa `ON DELETE CASCADE` por la composición `Reserva *-- DetalleReserva`.
- La asociación `AgenteOperativo – Reserva` queda para HU-03; no se agrega una columna de agente ahora.
- `cantidad_teu` y `cantidad_solicitada` tienen `CHECK >= 0`.
- `estado_reserva` se almacena como texto; HU-02 usa `Reserva temporal`, `Confirmada`, `Rechazada` y `Cancelada`.

### 2. Inventario basado en cantidades

- `Viaje.capacidad_disponible_teu` y `CupoContenedor.cantidad_disponible` son las únicas fuentes del inventario.
- No se agrega una columna de estado a `cupo_contenedor`: una fila puede tener parte comprometida y parte disponible al mismo tiempo. Las transiciones de EST-02 se representan con los cambios de `cantidad_disponible`.
- Al confirmar se descuenta; al cancelar se restituye. Los TEUs a mover se calculan como la suma de `cantidad_solicitada` de los detalles, agrupada por `tipo_contenedor`.
- Alternativa considerada: almacenar un estado por cupo. Se descarta porque no representa disponibilidad parcial y rompería las multiplicidades del modelo.

### 3. Servicio de inventario transaccional

Se crea `src/servicios/inventario.ts` con dos operaciones sincrónicas dentro de `db.transaction()` de `better-sqlite3`:

- `confirmarReserva(db, reservaId, sistemaFlota, hoy)`:
  1. Carga la reserva con sus detalles y su viaje.
  2. Exige estado `Reserva temporal`; si no, devuelve un error de estado inválido.
  3. Agrupa los TEUs por tipo y consulta la capacidad en el ERP simulado.
  4. Verifica `viaje.capacidad_disponible_teu >= total` y cada cupo por tipo.
  5. Si no alcanza: actualiza `estado_reserva = 'Rechazada'`, registra el rechazo en el log y no toca cantidades.
  6. Si alcanza: descuenta el viaje y cada cupo con `UPDATE ... WHERE cantidad >= ?`, exige `changes === 1`, actualiza `estado_reserva = 'Confirmada'` y registra la asignación en el ERP simulado.
- `cancelarReserva(db, reservaId, sistemaFlota, hoy)`:
  1. Exige estado `Confirmada`.
  2. Si `hoy > plazo_maximo_cancelacion`: no modifica nada y devuelve un resultado `fuera_de_plazo`.
  3. Si está dentro: restituye las cantidades al viaje y a los cupos, actualiza `estado_reserva = 'Cancelada'` y registra la liberación en el log.

Decisiones:
- Las actualizaciones condicionales y `changes === 1` evitan sobreventa dentro de la transacción; SQLite serializa las escrituras.
- `hoy` es un parámetro con valor por defecto, para que las pruebas usen una fecha fija y no dependan del reloj.
- Se usa `Reserva temporal` como estado inicial porque EST-01 lo define antes de la confirmación; `Rechazada` es el destino de la capacidad insuficiente, según EST-01 (prevalece sobre el texto «mantener sin confirmar» de DSS-02).
- Alternativa considerada: leer y luego actualizar sin condición. Se descarta porque permite sobreventa si dos operaciones se intercalan.

### 4. Rutas derivadas del flujo reconstruido

No hay DSS de CU-03/CU-04; el flujo confirmado en la ficha se traduce a:

| Ruta | Acción | Resultado |
|------|--------|-----------|
| `GET /reservas` | Lista reservas con empresa, viaje, TEUs, detalles, estado y plazo | Pantalla de reservas |
| `POST /reservas/:id/confirmar` | Confirma una reserva en `Reserva temporal` | Redirige a `/reservas?mensaje=...` |
| `POST /reservas/:id/cancelar` | Cancela una reserva `Confirmada` dentro del plazo | Redirige a `/reservas?mensaje=...` |

- Patrón POST/Redirect/GET para evitar reenvíos.
- Los mensajes se generan en el servidor y se muestran escapados en la vista: confirmación con la nueva capacidad, «capacidad insuficiente», «cancelada» o «fuera del plazo permitido».
- Si la reserva no existe o su estado no permite la operación, se redirige con un mensaje informativo; no se expone un error 500.
- `GET /` seguirá redirigiendo a `/disponibilidad`; se agrega un enlace «Reservas» en el encabezado.
- Se agrega el rol `naviera` a los roles de demostración (`ROLES` en `src/app.ts` y selector de `encabezado.ejs`). No se restringe el acceso: el control por rol es no funcional y está fuera de alcance.

### 5. Integración externa simulada (Sistema Central de Flota)

Se amplía `SistemaFlota` con:

- `consultarCapacidad(viajeId)`: lee la capacidad del viaje y sus cupos; registra «Consultar disponibilidad preliminar» y «Retornar capacidad disponible».
- `registrarAsignacion(viajeId, reservaId, detalles)`: registra «Registrar asignación de recursos» y «Confirmar asignación».
- `registrarLiberacion(viajeId, reservaId, detalles)`: registra «Liberar cupos» y «Cupos reincorporados» (reconstruido, porque CU-03 no tiene DSS).

Todas las llamadas se guardan en `integraciones_log` con el mismo formato actual. La implementación sigue seleccionándose con `ERP_SIMULADO`.

### 6. Datos de ejemplo y pruebas

- El seed se amplía con empresas y reservas de ejemplo para los tres escenarios, sin alterar los datos de HU-01:
  - viaje de 50 TEUs con reserva en `Reserva temporal` de 10 TEUs `40HQ`;
  - viaje de 4 TEUs con reserva en `Reserva temporal` de 6 TEUs `20GP`;
  - viaje de 30 TEUs disponibles (total 38) con reserva `Confirmada` de 8 TEUs `40HQ` con plazo futuro.
- `ResumenSeed` incorpora el conteo de reservas; se actualizan las pruebas que hoy fijan 2 viajes y 2 cupos para que sigan siendo deterministas.
- Pruebas nuevas:
  - `tests/hu02.test.ts`: una prueba por escenario Gherkin y una para el rechazo fuera de plazo, usando datos creados en memoria y fechas fijas.
  - `tests/inventario.test.ts`: transacción, agrupación por tipo, rechazo por cupo insuficiente y log de integraciones.
  - Se amplía `tests/db.test.ts` con las tablas de la migración `002`.
- Las pruebas Gherkin se nombran `HU-02 · <escenario>`.
- Alternativa considerada: usar solo el seed en las pruebas. Se descarta para que cada escenario controle sus propias cifras y no dependa de otros datos.

## Risks / Trade-offs

- **Cambiar el seed rompe pruebas existentes que fijan 2 viajes y 2 cupos.** → Actualizar `tests/seed.test.ts` y verificar que los datos de HU-01 siguen presentes con los mismos valores.
- **El bloqueo temporal de cupos de EST-01 no se implementa y una reserva en `Reserva temporal` no descuenta capacidad.** → Es coherente con el escenario 1 (50 → 40 al confirmar) y con el alcance acordado; se documenta en el README y en la ficha.
- **Cancelar fuera de plazo no está en el Gherkin.** → Se implementa la variante confirmada por el estudiante y se cubre con una prueba adicional; la reserva permanece `Confirmada`.
- **Fechas relativas al día actual pueden hacer fallar las pruebas.** → El servicio recibe `hoy` y las pruebas usan fechas fijas; los datos de ejemplo usan plazos futuros.
- **El log de integraciones podría crecer sin control.** → Es una tabla de demostración; se documenta que el ERP es simulado y no se implementa limpieza (RP-21 es no funcional).
- **Dos solicitudes simultáneas sobre el mismo cupo.** → Actualizaciones condicionales dentro de una transacción y verificación de `changes`; SQLite serializa las escrituras.

## Migration Plan

1. Aplicar la migración `002_crear_reservas.sql` al arrancar la aplicación; se registra en `schema_migrations`.
2. Ejecutar `npm run db:seed` para agregar empresas, reservas y detalles; es idempotente y conserva los datos de HU-01.
3. Rollback: eliminar `data/app.db` y volver a ejecutar el seed (entorno de taller). No hay datos de producción.
