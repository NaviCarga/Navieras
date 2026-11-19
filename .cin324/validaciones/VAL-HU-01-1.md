# Informe de validación — HU-01 · Consulta de itinerarios y disponibilidad de espacio

**Fecha:** 2026-11-18  
**Cambios de OpenSpec validados:** `hu-01-consulta-disponibilidad`; ajuste `ajuste-hu-01-columna-zarpe`  
**Estado:** validada sin observaciones pendientes (2026-11-18)

## Resumen

| Obs. | Lo que observaste | Tipo | Artefacto principal a modificar | También revisar |
|------|-------------------|------|----------------------------------|------------------|
| OBS-1 (2026-11-10) | Faltaba la columna/fecha de zarpe por viaje en la consulta | **D** (defecto de generación; ya corregido) | Ninguno; ajuste aplicado en código (`ajuste-hu-01-columna-zarpe`) | — |

**Lo que sí funcionó:** la consulta por origen y destino devuelve los viajes esperados; el escenario exitoso muestra Buque Andino, zarpe `2026-11-20`, arribo estimado `2026-12-18` y 25 cupos `40HQ`; la ruta Valparaíso → Rotterdam con `40RF` aparece sin capacidad disponible; una ruta sin viajes muestra «No se encontraron viajes con capacidad para los criterios ingresados»; la consulta funciona también con el rol Naviera.

## Detalle por observación

### OBS-1 — Falta la columna/fecha de zarpe por viaje

- **Lo que observaste (2026-11-10):** al consultar la disponibilidad no se distinguía la fecha de zarpe de cada viaje.
- **Qué dicen hoy los artefactos:**
  - `07-criterios-aceptacion.md`, HU-01, escenario exitoso: «se informa el itinerario del viaje con sus fechas de zarpe, arribo estimado y nombre del buque».
  - `.cin324/historias/HU-01.md`, flujo de interacción, paso 4: «se muestran en un calendario por fecha de zarpe el nombre del buque, fecha de zarpe, arribo estimado y cupos disponibles».
- **Diagnóstico:** **tipo D**. Los artefactos eran claros y la implementación no mostraba la fecha de zarpe por viaje. No correspondía cambiar especificaciones: se corrigió con el ajuste de generación `ajuste-hu-01-columna-zarpe`.
- **Verificación (2026-11-18):** el estudiante confirmó en pantalla que la columna **Zarpe** aparece con `2026-11-20` y el resto de los datos esperados. OBS-1 queda resuelta.

## Escenarios verificados

| Escenario | Resultado observado |
|-----------|---------------------|
| Consulta exitosa según ruta y contenedor | ✔ San Antonio → Shanghái `40HQ`: Buque Andino, zarpe `2026-11-20`, arribo `2026-12-18`, 25 cupos |
| Ruta o tipo de contenedor sin cupos | ✔ Valparaíso → Rotterdam `40RF`: viaje sin capacidad disponible para el tipo |
| Ruta sin viajes (variante) | ✔ «No se encontraron viajes con capacidad para los criterios ingresados» |
| Consulta con otro rol | ✔ El rol Naviera puede consultar sin errores |

## Pruebas automáticas

`npm test` → **46/46 pruebas** en 13 archivos, incluidas `tests/hu01.test.ts` (2), `tests/consultaDisponibilidad.test.ts` (3) y `tests/pantalla.test.ts` (2). `npm run typecheck` sin errores.

## Cómo sabrás que terminaste

- [x] OBS-1 clasificada como tipo D y corregida mediante un ajuste de generación.
- [x] La columna/fecha de zarpe se verificó en pantalla.
- [x] Los escenarios de HU-01 se verificaron en pantalla.
- [x] La variante sin resultados muestra el mensaje documentado.
- [x] `npm test` pasa (46/46) y el tipado no reporta errores.
- [x] Validación del estudiante confirmada (2026-11-18).

## Resultado

HU-01 queda validada sin observaciones pendientes. No hay cambios de especificación derivados de esta validación.

## Siguiente paso

1. Archivar `ajuste-hu-01-columna-zarpe` y `hu-01-consulta-disponibilidad` con `/opsx-archive`.
2. Continuar con HU-04.
