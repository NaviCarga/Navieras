# Design

## Context

La ruta `GET /rol` de `src/app.ts` valida el rol recibido, guarda la cookie `rol` y siempre redirige a `/disponibilidad`. El selector del encabezado (`src/vistas/parciales/encabezado.ejs`) envía el rol a esa ruta. La ficha confirmada de HU-02 define que al elegir «Naviera» se debe abrir `/reservas`, porque allí están las acciones de confirmar y cancelar que ejecuta esa historia. Los demás roles no tienen una pantalla operativa propia en esta historia.

## Goals / Non-Goals

**Goals:**

- Redirigir a `/reservas` cuando el rol válido sea `naviera`.
- Mantener `/disponibilidad` como destino para `exportador`, `agente` y `administrador`.
- Cubrir la redirección con pruebas de integración de la ruta.

**Non-Goals:**

- Implementar autenticación real, autorización o restricciones de acceso por rol.
- Cambiar las rutas, vistas, datos o el servicio de inventario de HU-02.
- Agregar una pantalla de inicio por rol ni recordar la última pantalla visitada.

## Decisions

1. **Resolver el destino con un mapa explícito por rol.**
   - Se define un mapa `Record<Rol, string>`: `naviera` → `/reservas`; el resto → `/disponibilidad`.
   - Se aplica después de `rolValido`, por lo que un valor inválido sigue cayendo en `exportador` y termina en `/disponibilidad`.
   - Alternativa considerada: un `if` con `rol === 'naviera'`. Se prefiere el mapa porque deja visible el destino de cada rol y facilita agregar una pantalla por rol en el futuro.
   - Alternativa descartada: redirigir siempre a la pantalla anterior. Requeriría guardar estado de navegación y no está respaldado por la ficha.

2. **Mantener la cookie y el selector sin cambios.**
   - La ruta sigue guardando `rol` con `Set-Cookie` para que el encabezado y las pantallas muestren el rol activo.
   - No se modifica el formulario del encabezado ni se agrega lógica de autorización.

3. **Probar la ruta, no solo el HTML.**
   - Se amplía `tests/reservas.test.ts` para comprobar que `GET /rol?rol=naviera` responde `302` con `Location: /reservas` y cookie `rol=naviera`.
   - Se agrega un caso con `exportador` que espera `Location: /disponibilidad`.
   - Se conserva la comprobación existente de que el encabezado refleja el rol seleccionado.

## Risks / Trade-offs

- **Destino fijo por rol** → si más adelante otro rol necesita otra pantalla, se agrega una entrada al mapa; no se pierde la regla actual.
- **Dependencia de la cookie para el encabezado** → se mantiene el comportamiento actual; la prueba verifica que el cambio de rol no rompa la selección visible.
- **Cambio mínimo sin impacto en datos** → no requiere migración ni volver a cargar el seed.

## Migration Plan

No aplica: no hay cambios de esquema ni de datos. Basta con desplegar el código y ejecutar las pruebas.
