# Atributos de calidad (ISO 25010)
 
## Priorización de los 9 atributos de primer nivel
1. Adecuación funcional.
2. Eficiencia de desempeño.
3. Compatibilidad.
4.  Capacidad de interacción.
5.  Fiabilidad.
6.  Seguridad.
7.  Mantenibilidad.
8.  Flexibilidad
9.  Seguridad física / Safety
 
## Métricas de los 3 atributos más importantes
### Adecuación funcional.
- Métrica: Tasa de reservas correctamente validadas.
- Descripcion: Evalúa la capacidad del sistema para calcular correctamente el espacio disponible y evitar reservas que superen la capacidad del buque.
- Como se mide: Se realizan 100 solicitudes de reserva en distintos buques y fechas. El sistema debe aceptar las reservas cuando existe capacidad suficiente y rechazarlas cuando la capacidad disponible sea insuficiente.
### Eficiencia de desempeño.
- Métrica: Tiempo de respuesta del calendario y disponibilidad.
- Descripción: Mide el tiempo que tarda el sistema en mostrar el calendario y actualizar la disponibilidad de espacio después de una consulta o cambio de fecha.
- Cómo se mide: Se registra el tiempo transcurrido desde que el usuario realiza una consulta hasta que el sistema muestra la disponibilidad actualizada.
### Compatibilidad.
- Métrica: Tasa de compatibilidad entre navegadores.
- Descripción: Evalúa que el sistema funcione correctamente en los principales navegadores web utilizados por los usuarios.
- Cómo se mide: Se realizan las mismas operaciones de consulta de disponibilidad, selección de fechas y reserva en Chrome, Firefox y Edge, verificando que los resultados sean equivalentes.

