# Proposal

## Why

Hoy el exportador solo puede consultar disponibilidad: el registro de una reserva depende de datos de ejemplo o de confirmar una reserva ya existente (HU-02), no de una solicitud propia. La historia **HU-04** pide un formulario único de booking que valide los datos y el contrato, verifique el cupo, evalúe al exportador y confirme la reserva con un código único y su comprobante, sin intercambio por correo.

## What Changes

- Se agrega el **formulario de solicitud de booking** para el rol Exportador: empresa exportadora (selector de demostración), viaje, tipo y cantidad de contenedores con su detalle, tipo de mercancía, peso estimado y número de contrato obligatorio.
- Se valida que los datos obligatorios y el contrato estén informados; si hay inconsistencias, se muestran los errores y no se registra la solicitud.
- Se consulta la **disponibilidad preliminar** al Sistema Central de Flota (simulado); si no hay cupo, se informa el rechazo sin descontar inventario.
- Se consulta el **Sistema de Evaluación Comercial y Aduana** (simulado) según `EmpresaExportadora.estadoComercial`; si el exportador está bloqueado, la reserva queda `Rechazada` con su motivo y sin descontar cupos.
- Si todo es válido, la reserva se registra en estado `Reserva temporal` (bloqueo de espacio), se calcula la asignación y se **revalida** la disponibilidad antes de confirmar.
- Al confirmar, la reserva pasa a `Confirmada` con un **código único de booking**, se descuentan los TEUs y cupos (servicio de inventario de HU-02), se asigna el agente operativo (servicio de HU-03), se registra la notificación interna y se muestra el **comprobante**.
- Se agrega el atributo `numeroContrato` a `Reserva` en el modelo de dominio (decisión D2 de la ficha) y su columna en la base de datos.
- Se agrega al seed una empresa con `estadoComercial = 'Bloqueada'` y se habilita el selector de empresa en el formulario para poder probar ambos escenarios.

**Fuera de alcance:**
- Tarifa referencial, tarifa por defecto y evaluación de tarifa (RP-01, RP-08, RP-09, RP-11): no existe la entidad `Tarifa` en el modelo de dominio.
- BL (RP-13): no existe la entidad `BL`; solo se registra la asignación de viaje/cupos.
- Cancelación de reservas y vencimiento automático de la reserva temporal (HU-02, RP-07 derivado).
- Alternativas (próxima salida, otro puerto, lista de espera) y su evaluación (RP-16, RP-17).
- Revisión manual de solicitudes inconsistentes y sus alertas (RP-04, RP-05).
- Asignación manual de un agente a elección del administrador (solo la automática de HU-03).
- Autenticación real y control de acceso por rol (RP-24, no funcional).
- Requisitos no funcionales RP-19, RP-20, RP-21 y RP-22: se leen como contexto, no se implementan.

## Capabilities

### New Capabilities
- `solicitud-booking`: registro, validación, verificación de disponibilidad y confirmación de una solicitud de reserva de espacio, con bloqueo temporal, revalidación y comprobante, incluyendo el rechazo por falta de cupo o por bloqueo comercial/aduanero del exportador.

### Modified Capabilities
- (ninguna: `gestion-inventario-espacio` y `asignacion-agente-operativo` se reutilizan tal como están; HU-04 se apoya en las transiciones a `Reserva temporal` y `Confirmada` que ya existen)

## Impact

- **Historia y trazabilidad:** HU-04 (`04-historias-usuario.md`), actividad TO-BE «Registro unificado y automatizado de la solicitud de booking» implementada como «Envía solicitud de booking (formulario estandarizado)» más las tareas de servicio de validación, verificación preliminar, reserva temporal, revalidación y asignación (`02-rediseno-to-be.md`); caso de uso **CU-02** con `include` a **CU-04** y **CU-05** (`09-casos-de-uso.md`); DSS-02 (`10-diagramas-secuencia.md`, `diagramas/dss-02.puml`); EST-01 y EST-02 (`11-diagramas-estado.md`); requisitos RP-02, RP-03, RP-06, RP-07, RP-12, RP-13 y RP-18; ficha `.cin324/historias/HU-04.md`.
- **Documentos:** `08-modelo-dominio.md` y `diagramas/modelo-dominio.puml` incorporan `Reserva.numeroContrato` (autorizado en la ficha, D2).
- **Datos:** nueva migración numerada `004_...sql` que agrega `reserva.numero_contrato`; el seed agrega una empresa bloqueada. No se reescriben migraciones previas.
- **Código:** `src/dominio/tipos.ts`, `src/dominio/repositorios.ts`, nuevo `src/servicios/booking.ts`, nueva integración simulada `src/integraciones/evaluacionComercial.ts`, rutas de booking en `src/rutas/reservas.ts` (o `src/rutas/booking.ts`), vista `src/vistas/booking.ejs` y comprobante, encabezado con la entrada de navegación, `src/db/seed.ts` y `src/app.ts`.
- **Pruebas:** una prueba de integración por cada escenario Gherkin de HU-04, más pruebas de validación de datos, falta de cupo, revalidación y rechazo por bloqueo sin descuento de inventario.
- **Documentación:** `README.md` con el recorrido de HU-04 y los datos de ejemplo.
