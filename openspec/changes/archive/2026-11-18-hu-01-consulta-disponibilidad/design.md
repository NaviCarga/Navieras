# Design

## Context

Este es el primer cambio del proyecto: no existe código de aplicación todavía, solo la documentación de requisitos. La ficha confirmada de la historia está en `.cin324/historias/HU-01.md`; el modelo de dominio en `08-modelo-dominio.md` y `diagramas/modelo-dominio.puml`; el flujo en `diagramas/dss-01.puml`; y el ciclo de vida de `CupoContenedor` en `diagramas/est-02.puml`. Ver `proposal.md` para la motivación.

Restricciones: aplicación web monolítica, SQLite, sin autenticación real (selector de rol de demostración) y sin implementar requisitos no funcionales. El stack es TypeScript + Express + EJS + better-sqlite3 + Vitest.

## Goals / Non-Goals

**Goals:**
- Implementar la consulta de disponibilidad de HU-01 en modo solo lectura, con calendario por fecha de zarpe y filtros por origen, destino y tipo de contenedor.
- Crear las tablas derivadas del modelo de dominio para las entidades que usa la historia, con sus claves foráneas y multiplicidades.
- Implementar la ruta derivada de DSS-01 y el adaptador simulado del ERP Naviero.
- Dejar una prueba de integración por cada escenario Gherkin.

**Non-Goals:**
- No se implementan transiciones de estado: HU-01 solo lee datos y `CupoContenedor` no cambia de estado.
- No se modela la tarifa referencial, las reservas, el inventario por reservas ni los agentes.
- No se implementa autenticación real ni requisitos no funcionales.

## Decisions

### 1. Tablas derivadas del modelo de dominio

Se crean solo las tablas que HU-01 lee. Nombres en español y `snake_case`, con los atributos del modelo como columnas.

| Tabla | Columnas | Origen en el modelo |
|-------|----------|---------------------|
| `buque` | `id`, `codigo_imo` (único), `nombre`, `capacidad_total_teu`, `naviera_operadora` | Clase `Buque` |
| `puerto` | `id`, `codigo_unlocode` (único), `nombre`, `pais`, `zona_geografica` | Clase `Puerto` |
| `viaje` | `id`, `codigo_viaje` (único), `buque_id`, `puerto_origen_id`, `puerto_destino_id`, `fecha_zarpe`, `fecha_arribo_estimada`, `capacidad_disponible_teu`, `estado_viaje` | Clase `Viaje` y asociaciones `realiza`, `origen`, `destino` |
| `cupo_contenedor` | `id`, `viaje_id`, `tipo_contenedor`, `cantidad_total`, `cantidad_disponible` | Clase `CupoContenedor` y composición `dispone de` |

- Las asociaciones `Viaje → Puerto` (`origen` y `destino`) se resuelven con dos claves foráneas `NOT NULL` en `viaje` (multiplicidad mínima 1).
- `Buque 1 — 0..* Viaje` se resuelve con `buque_id NOT NULL`.
- La composición `Viaje *-- CupoContenedor` se resuelve con `viaje_id NOT NULL` y `ON DELETE CASCADE`.
- Se agrega una restricción única `(viaje_id, tipo_contenedor)` para que el filtro por tipo sea determinista; no contradice el modelo y simplifica la consulta.
- «Sin cupo» se representa con `cantidad_disponible = 0`; no se agrega un estado nuevo a EST-02.

### 2. Ruta derivada de DSS-01

- `GET /disponibilidad` recibe `origen`, `destino` y `tipoContenedor` como parámetros opcionales de consulta y devuelve la misma pantalla con el formulario y los resultados. Es idempotente y coincide con los mensajes «Ingresar criterios de búsqueda» y «Mostrar viajes, fechas, buques y cupos disponibles».
- `GET /` redirige a `/disponibilidad`.
- La pantalla agrupa los viajes por `fecha_zarpe` en una vista de calendario simple y, para cada viaje, muestra buque, zarpe, arribo estimado y cupos del tipo solicitado. Si `cantidad_disponible = 0`, muestra el aviso de falta de capacidad para ese tipo.
- No se crean rutas de escritura en esta historia.

### 3. Integración externa simulada (Sistema Central de Flota)

- Interfaz `SistemaFlota` con el método `consultarItinerarios(origen, destino, tipoContenedor)`, que corresponde a los mensajes «Solicitar itinerarios y capacidad» y «Retornar viajes y cupos disponibles» de DSS-01.
- Implementación `SistemaFlotaSimulado` que consulta las tablas SQLite y registra la llamada en una tabla `integraciones_log` (fecha, sistema, mensaje, parámetros y resultado).
- La implementación se elige por configuración (`ERP_SIMULADO=true` por defecto), para poder reemplazarla por una real sin tocar la lógica de negocio.
- Alternativa considerada: consultar SQLite directamente desde la ruta. Se descarta para mantener la trazabilidad con DSS-01 y aislar la futura integración real.

### 4. Rol de demostración

- Middleware que lee la cookie `rol` (por defecto `exportador`) y la expone a las vistas. Un selector en el encabezado permite cambiarla. No hay login ni contraseñas.
- Alternativa considerada: sesiones con `express-session`. Se descarta por ser innecesaria para esta historia.

### 5. Migraciones, datos de ejemplo y pruebas

- Migraciones SQL numeradas en `src/db/migrations/` aplicadas al arrancar y registradas en `schema_migrations`.
- Seed idempotente en `src/db/seed.ts` con los datos de ambos escenarios: San Antonio → Shanghái con 25 cupos «40HQ» y Valparaíso → Rotterdam con 0 cupos «40RF».
- Pruebas con Vitest + supertest sobre una base SQLite temporal o en memoria, una por escenario Gherkin, nombradas `HU-01 · <escenario>`.

## Risks / Trade-offs

- **better-sqlite3 puede requerir compilación nativa en Windows con Node 25.** → Mitigación: probar `npm install` al inicio; si falla, usar el módulo integrado `node:sqlite` detrás de la misma capa de repositorio, sin cambiar migraciones ni SQL. Alternativa de largo plazo: usar Node 22 LTS.
- **El calendario agrupado por fecha puede mostrar demasiados viajes sin filtros.** → Mitigación: mostrar solo viajes con zarpe desde hoy y ordenar por fecha; los filtros reducen el resultado.
- **Datos de ejemplo que no coincidan con el Gherkin romperían las pruebas.** → Mitigación: el seed usa exactamente los valores de los escenarios y las pruebas preparan sus propios datos.
- **La integración simulada puede ocultar errores de integración reales.** → Mitigación: registrar cada llamada en `integraciones_log` y documentar en el README que está simulada.

## Migration Plan

Proyecto nuevo: al arrancar se aplican las migraciones y se ejecuta `npm run db:seed`. Para reiniciar, basta con eliminar `data/app.db` y volver a ejecutar el seed. No hay datos previos que migrar ni rollback necesario en esta historia.
