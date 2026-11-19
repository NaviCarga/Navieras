# Proposal

## Why

La validación de HU-02 detectó que el selector de rol de demostración siempre vuelve a `/disponibilidad`, aunque la ficha confirmada de la historia define que el rol «Naviera» debe abrir el listado de reservas (`/reservas`). Sin esa navegación, la Naviera no llega a la pantalla donde ejecuta confirmar o cancelar una reserva.

## What Changes

- Ajustar `GET /rol` para redirigir a `/reservas` cuando el rol seleccionado sea `naviera`; los demás roles (`exportador`, `agente`, `administrador`) mantienen `/disponibilidad`.
- Mantener el selector de rol de demostración, sin autenticación real.
- Agregar pruebas de la redirección para «Naviera» y para un rol distinto.
- No se modifican la base de datos, el inventario, las rutas de reservas ni los escenarios Gherkin de HU-02.

## Capabilities

### New Capabilities

Ninguna. El ajuste implementa una decisión de navegación ya registrada en `.cin324/historias/HU-02.md`; no introduce una capacidad de negocio nueva.

### Modified Capabilities

Ninguna. Los requisitos de inventario de HU-02 no cambian. La navegación del selector es parte del andamiaje de demostración, por eso este cambio usa `skip_specs: true`.

## Impact

- **Código:** `src/app.ts` (ruta `GET /rol`).
- **Pruebas:** `tests/reservas.test.ts` o una prueba de integración de la ruta; se agrega cobertura para el destino según el rol.
- **Sin cambios:** base de datos, migraciones, datos de ejemplo, repositorios, servicio de inventario ni vistas de reservas. `README.md` solo agrega una frase sobre el destino del selector; los comandos no cambian.
- **Historia de origen:** HU-02 — actualización automática del inventario de espacio por reservas.
- **Actividad del TO-BE:** «Revalida disponibilidad al confirmar» + «Asigna buques, contenedores y BL; registra automáticamente» (la navegación es el acceso de demostración a la pantalla que ejecuta esas actividades).
- **Casos de uso:** CU-03 (cancelar reserva dentro del plazo) y CU-04 (actualizar capacidad disponible y cupos del viaje).
- **Fuera de alcance:** autenticación real, control de acceso por rol, cambios en el inventario, en los estados de la reserva o en los escenarios Gherkin.
