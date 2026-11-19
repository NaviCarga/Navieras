# Informe de validación — HU-02 · Actualización automática del inventario de espacio por reservas

**Fecha:** 2026-11-17  
**Cambio de OpenSpec validado:** `hu-02-actualizacion-inventario`; ajuste `ajuste-hu-02-navegacion-rol`  
**Estado:** OBS-1 y OBS-2 verificadas; HU-02 validada sin observaciones pendientes (2026-11-17)

## Resumen

| Obs. | Lo que observaste | Tipo | Artefacto principal a modificar | También revisar |
|------|-------------------|------|----------------------------------|------------------|
| OBS-1 | Las fechas de ejemplo del plazo de cancelación deberían ser más realistas (una semana antes del zarpe); el modelo actual es correcto | **F** (datos de ejemplo; ya ajustado) | Ninguno; aplicado en `src/db/seed.ts` (código) | `README.md`, solo si menciona las fechas |
| OBS-2 | Al cambiar de rol, el sistema redirige a `/disponibilidad`; quieres que el rol Naviera abra `/reservas` | **B** (brecha de especificación) | `.cin324/historias/HU-02.md`, flujo y decisión C3 | `ajuste-hu-02-navegacion-rol`; `04` y `07` no cambian |

**Lo que sí funcionó:** los tres escenarios base quedaron verificados. `BK-HU02-002` rechaza por capacidad insuficiente; `BK-HU02-001` confirma y baja la capacidad del viaje a 40 TEUs, quedando **Confirmada**; `BK-HU02-003` cancela y sube la capacidad a 38 TEUs, quedando **Cancelada**.

## Detalle por observación

### OBS-1 — Fechas de ejemplo del plazo de cancelación

- **Lo que dijiste:** el modelo real indica que la fecha de cancelación depende del contrato, del cual no hay información para el ejemplo. Por lo tanto, el modelo actual es correcto; solo deben ajustarse las fechas de ejemplo.
- **Qué dicen hoy los artefactos:**
  - `04-historias-usuario.md`, HU-02 CA2: la cancelación ocurre «dentro del plazo permitido», sin fijar una regla de días.
  - `07-criterios-aceptacion.md`, escenario de cancelación: usa el plazo permitido, sin fijar una regla de días.
  - `08-modelo-dominio.md`: `Reserva` tiene `plazoMaximoCancelacion` como atributo propio, coherente con un valor dependiente del contrato.
  - `11-diagramas-estado.md` y `diagramas/est-01.puml`: la guarda es «Dentro del plazo», coherente con el atributo.
  - `.cin324/historias/HU-02.md`: el plazo se evalúa con `hoy ≤ plazoMaximoCancelacion`.
- **Diagnóstico:** **tipo F**. No hay cambio de requisito ni inconsistencia entre artefactos. El sistema hace lo que dice el modelo (`src/servicios/inventario.ts:170`). Los datos de ejemplo usaban `2099-12-31` en las tres reservas (`src/db/seed.ts`), lo que no representaba un plazo realista.
- **Qué se ajustó:** las tres fechas se cambiaron manualmente en `src/db/seed.ts` el 2026-11-17: `BK-HU02-001` → `2027-01-03`, `BK-HU02-002` → `2027-01-25` y `BK-HU02-003` → `2027-02-22`. No se modificaron artefactos de especificación.
- **Verificación:** `npm test` pasa con **34/34 pruebas**; `npm run db:reset` recargó los datos y la pantalla `/reservas` mostró `2027-01-03`, `2027-01-25` y `2027-02-22` (verificado el 2026-11-17).
- **Para mantener la consistencia, revisa:**
  - `src/db/seed.ts`: las tres reservas de ejemplo.
  - `tests/seed.test.ts` y `tests/hu02.test.ts`: no fijan las fechas de ejemplo, pero conviene ejecutar la suite.
  - `README.md`: solo si se agregan fechas concretas a la descripción de los datos.

### OBS-2 — Cambio de rol redirige a disponibilidad (tipo B)

- **Lo que reportaste:** al cambiar de rol, el sistema te manda al espacio de disponibilidad; quieres que el rol Naviera abra el apartado de reservas.
- **Evidencia:** el selector del encabezado envía a `GET /rol` (`src/vistas/parciales/encabezado.ejs`) y esa ruta siempre redirigía a `/disponibilidad` (`src/app.ts`). Ningún artefacto definía a qué pantalla debía volver el usuario al cambiar de rol; `03-requisitos.md` RP-24 es no funcional y el control de acceso por rol está fuera del alcance de la historia.
- **Diagnóstico:** **tipo B**. La especificación no definía el destino del selector; el sistema tomó la decisión de volver siempre a disponibilidad.
- **Cambio aplicado (2026-11-17):** en `.cin324/historias/HU-02.md` se registró que al elegir «Naviera» se abre `/reservas` y los demás roles mantienen `/disponibilidad`. Aprobado por el estudiante.
- **Implementación:** se creó el cambio de OpenSpec `ajuste-hu-02-navegacion-rol` (sin delta de especificación, `skip_specs`) y se ajustaron `src/app.ts`, `tests/reservas.test.ts` y `README.md`. La suite pasa con **34/34 pruebas** y `npm run typecheck` no reporta errores.
- **Verificación:** `GET /rol?rol=naviera` responde `302` con `Location: /reservas` y cookie `rol=naviera`; `GET /rol?rol=exportador` responde `302` con `Location: /disponibilidad`.
- **Verificación final (2026-11-17):** el estudiante confirmó en pantalla que al elegir «Naviera» se abre `/reservas` y al cambiar a «Exportador» vuelve a `/disponibilidad`. OBS-2 queda resuelta. No se modificaron `04`, `07`, `08`, `09`, `11`, `12`.

## Valores aplicados

| Reserva | Viaje | Zarpe | `plazoMaximoCancelacion` aplicado |
|---------|-------|-------|-----------------------------------|
| `BK-HU02-001` | `VIA-003` | 2027-01-10 | `2027-01-03` |
| `BK-HU02-002` | `VIA-004` | 2027-02-01 | `2027-01-25` |
| `BK-HU02-003` | `VIA-005` | 2027-03-01 | `2027-02-22` |

## Orden sugerido

1. ~~Ajustar las tres fechas en `src/db/seed.ts`~~ (hecho el 2026-11-17).
2. ~~Ejecutar `npm run db:reset` y verificar el plazo en `/reservas`~~ (hecho el 2026-11-17).
3. ~~Generar el ajuste de OBS-2 con `/cin324-generar-app`~~ (hecho: `ajuste-hu-02-navegacion-rol`).
4. ~~Verificar que el rol Naviera abre `/reservas` y que los demás roles mantienen `/disponibilidad`~~ (verificado por HTTP el 2026-11-17).
5. ~~Validar la redirección en pantalla con `/cin324-validar-sistema`~~ (hecho el 2026-11-17).
6. Archivar `ajuste-hu-02-navegacion-rol` y `hu-02-actualizacion-inventario`; luego continuar con la siguiente historia.

## Cómo sabrás que terminaste

- [x] OBS-1 clasificada como tipo F, sin cambios de artefactos.
- [x] Los tres escenarios base verificados en pantalla (rechazo, confirmación y cancelación).
- [x] OBS-2 clasificada como tipo B y documentada en la ficha de HU-02.
- [x] Fechas de ejemplo ajustadas manualmente en `src/db/seed.ts`.
- [x] `npm test` pasa (34/34).
- [x] `npm run db:reset` y plazo verificado en `/reservas`.
- [x] Ajuste de OBS-2 generado como `ajuste-hu-02-navegacion-rol`.
- [x] Redirección del rol verificada por HTTP.
- [x] Validación final del estudiante en pantalla.
- [x] HU-02 validada sin observaciones pendientes.

## Resultado

HU-02 queda validada. OBS-1 (fechas de ejemplo) y OBS-2 (navegación por rol) están resueltas y no quedan observaciones pendientes.

## Siguiente paso

1. Archivar `ajuste-hu-02-navegacion-rol` y `hu-02-actualizacion-inventario` con `/opsx-archive`.
2. Continuar con la siguiente historia (HU-01 pendiente de validación o HU-03).
