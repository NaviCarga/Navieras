# Informe de validación — HU-03 · Asignación automática de agente operativo

**Fecha:** 2026-11-18  
**Cambio de OpenSpec validado:** `hu-03-asignacion-agente`  
**Estado:** validada sin observaciones pendientes (2026-11-18)

## Resumen

| Obs. | Lo que observaste | Tipo | Artefacto principal a modificar | También revisar |
|------|-------------------|------|----------------------------------|------------------|
| OBS-1 | Al confirmar `BK-HU02-001` no se asigna un agente | **F** (uso/datos de prueba; el comportamiento es el documentado) | Ninguno | — |

**Lo que sí funcionó:** confirmar `BK-HU03-001` asignó automáticamente a Ana Torres (`A-001`, Asia-Pacífico); confirmar `BK-HU02-001` mostró «Sin agente asignado: no hay agentes con cupo de atención en la zona "Europa". Se emitió una alerta al administrador»; las alertas del administrador funcionan; tras cancelar `BK-HU03-002` y pulsar **Reintentar asignación**, la reserva se asignó a Carla Núñez (`A-003`).

## Detalle por observación

### OBS-1 — Confirmación sin asignación de agente en Europa

- **Lo que dijiste:** «pulsé confirmar en la `BK-HU03-001` y me asigna automáticamente un agente, solo que en la `BK-HU02-001` al apretar aceptar no me asigna el agente». Luego aclaraste que «quedó bien, el sistema era error mío».
- **Qué dicen hoy los artefactos:**
  - `07-criterios-aceptacion.md`, HU-03, escenario «Escalamiento por falta de agentes disponibles con cupo de atención en la zona»: si todos los agentes de la zona alcanzaron su límite, la reserva queda «Confirmada sin agente asignado» y se emite una alerta al administrador.
  - `.cin324/historias/HU-03.md`, flujo de interacción, paso 5: mismo resultado cuando no hay candidatos.
  - `README.md`, recorrido de HU-03: `BK-HU03-002` deja a Carla Núñez en su límite (1/1) en Europa, por lo que `BK-HU02-001` (destino Europa) no tiene agente disponible.
- **Diagnóstico:** **tipo F**. No es un defecto de generación ni una brecha de especificación: el sistema aplicó la regla documentada (no asignar y alertar). La base mostraba además `BK-HU02-001` en estado **Cancelada** porque el estudiante la canceló después; esa acción está fuera de la asignación y explica que no quedara asociada a un agente.
- **Qué debes modificar tú:** nada. No se modificaron artefactos ni código.
- **Para mantener la consistencia, revisa:** nada pendiente.

## Escenarios verificados

| Escenario | Resultado observado |
|-----------|---------------------|
| Asignación exitosa según ruta y carga | ✔ `BK-HU03-001` → Ana Torres (`A-001`), notificación al agente y al exportador |
| Escalamiento sin cupo de atención en la zona | ✔ `BK-HU02-001` → Confirmada sin agente + alerta al administrador |
| Reintento tras liberar cupo | ✔ Cancelar `BK-HU03-002` y **Reintentar asignación** → Carla Núñez (`A-003`) |
| Panel de alertas | ✔ El administrador ve las reservas confirmadas sin agente |

## Pruebas automáticas

`npm test` → **46/46 pruebas** en 13 archivos, incluidas `tests/hu03.test.ts` (4), `tests/servicioAsignacion.test.ts` (5) y `tests/agentesRepositorio.test.ts` (3). `npm run typecheck` sin errores. `npm run db:reset` deja 6 viajes, 6 cupos y 5 reservas.

## Cómo sabrás que terminaste

- [x] La observación quedó clasificada como tipo F, sin cambios de artefactos.
- [x] Los escenarios de asignación, escalamiento y reintento se verificaron en pantalla.
- [x] Las alertas del administrador se verificaron.
- [x] `npm test` pasa (46/46) y el tipado no reporta errores.
- [x] Validación del estudiante confirmada (2026-11-18).

## Resultado

HU-03 queda validada sin observaciones pendientes. No hay cambios de especificación ni ajustes de código derivados de esta validación.

## Siguiente paso

1. Archivar el cambio `hu-03-asignacion-agente` con `/opsx-archive`.
2. Continuar con HU-01 (ajuste de la columna «Zarpe» pendiente de verificar en pantalla) o con HU-04.
