# Clasificación de requisitos
 
Las actividades TO-BE citadas corresponden a la tabla "Actividades que cambian del AS-IS al TO-BE" del documento de rediseño (02-rediseno-to-be.md).
 
## Requisitos de producto
 
| ID | Requisito | Tipo (funcional/no funcional) | Actividad TO-BE asociada |
|----|-----------|--------------------------------|----------------------------|
| RP-01 | El sistema debe permitir al solicitante consultar en línea la disponibilidad de buques y contenedores y una tarifa referencial | Funcional | Consulta disponibilidad y tarifa referencial en el portal |
| RP-02 | El sistema debe ofrecer un formulario estandarizado y único para solicitar el booking (incluye contrato), con campos obligatorios | Funcional | Envía solicitud de booking (formulario estandarizado) |
| RP-03 | El sistema debe validar automáticamente los datos de la solicitud y del contrato | Funcional | Valida datos de la solicitud y del contrato |
| RP-04 | El sistema debe derivar las solicitudes inconsistentes a una cola de revisión manual del encargado y notificarle | Funcional | Revisa y corrige solicitud inconsistente (case manager) |
| RP-05 | El sistema debe generar una alerta cuando una solicitud en revisión manual no se atienda dentro de un plazo configurable | Funcional | Revisa y corrige solicitud inconsistente (case manager) |
| RP-06 | El sistema debe verificar automáticamente la disponibilidad preliminar antes de gestionar la tarifa | Funcional | Verifica disponibilidad preliminar |
| RP-07 | El sistema debe reservar temporalmente el espacio con un vencimiento una vez verificada la disponibilidad | Funcional | Reserva temporal del espacio |
| RP-08 | El sistema debe aplicar automáticamente la tarifa por defecto a los casos estándar (10 o menos contenedores) | Funcional | Aplica tarifa por defecto |
| RP-09 | El sistema debe enviar los casos excepcionales (más de 10 contenedores) al ejecutivo comercial para evaluar la tarifa dentro de rangos preaprobados | Funcional | Evalúa tarifa (rangos preaprobados) |
| RP-10 | El sistema debe calcular la asignación de buques y contenedores según reglas de prioridad y de flexibilidad | Funcional | Calcula asignación por prioridad y flexibilidad |
| RP-11 | El sistema debe ejecutar en paralelo la definición de la tarifa y el cálculo de la asignación, y continuar solo cuando ambas terminen | Funcional | Aplica tarifa por defecto / Evalúa tarifa (rangos preaprobados) / Calcula asignación por prioridad y flexibilidad |
| RP-12 | El sistema debe revalidar la disponibilidad antes de confirmar la asignación | Funcional | Revalida disponibilidad al confirmar |
| RP-13 | El sistema debe asignar buques, contenedores y BL, y registrar la asignación automáticamente | Funcional | Asigna buques, contenedores y BL; registra automáticamente |
| RP-14 | El sistema debe publicar el estado de cada solicitud y notificar los cambios al solicitante | Funcional | Publica estado y notifica al solicitante |
| RP-15 | El sistema debe registrar y mostrar al solicitante el responsable (case manager) de cada solicitud | Funcional | Publica estado y notifica al solicitante |
| RP-16 | El sistema debe ofrecer alternativas (próxima salida, otro puerto o lista de espera) cuando no haya disponibilidad | Funcional | Ofrece alternativas |
| RP-17 | El sistema debe permitir al solicitante evaluar y aceptar una alternativa y reintentar la solicitud | Funcional | Evalúa alternativas |
| RP-18 | El solicitante debe recibir la confirmación y los detalles del servicio en el portal y por notificación | Funcional | Recibe confirmación y detalles |
| RP-19 | La información de disponibilidad mostrada debe reflejar el estado actual de los recursos, con un tiempo de respuesta aceptable para el solicitante | No funcional | Consulta disponibilidad y tarifa referencial en el portal / Verifica disponibilidad preliminar |
| RP-20 | Un mismo recurso no debe poder asignarse a dos solicitudes distintas (integridad de la asignación) | No funcional | Revalida disponibilidad al confirmar / Asigna buques, contenedores y BL; registra automáticamente |
| RP-21 | El sistema debe dejar trazabilidad de las asignaciones, las decisiones de tarifa y los cambios de estado (quién, qué y cuándo) | No funcional | Asigna buques, contenedores y BL; registra automáticamente / Evalúa tarifa (rangos preaprobados) |
| RP-22 | El solicitante debe poder consultar, solicitar y hacer seguimiento de forma autónoma, sin apoyo del encargado | No funcional | Consulta disponibilidad y tarifa referencial en el portal / Envía solicitud de booking (formulario estandarizado) |
| RP-23 | El servicio debe estar disponible de forma permanente, sin depender del horario o de la revisión del correo por parte del encargado | No funcional | Envía solicitud de booking (formulario estandarizado) / Revisa y corrige solicitud inconsistente (case manager) |
| RP-24 | El acceso debe estar controlado por rol: el solicitante solo ve sus propias solicitudes y contratos, y solo el personal autorizado modifica asignaciones y tarifas | No funcional | Consulta disponibilidad y tarifa referencial en el portal / Publica estado y notifica al solicitante |
| RP-25 | Las reglas de negocio (criterios de prioridad, rangos preaprobados, umbral de caso estándar y plazo de vencimiento de la reserva) deben ser configurables sin modificar el sistema | No funcional | Calcula asignación por prioridad y flexibilidad / Evalúa tarifa (rangos preaprobados) / Reserva temporal del espacio |
 
## Requisitos de proyecto
 
| ID | Requisito |
|----|-----------|
| RY-01 | Definir con el negocio los criterios de priorización de solicitudes simultáneas del mismo recurso (tipo de cliente o contrato, volumen, urgencia) antes de construir el cálculo de asignación |
| RY-02 | Definir con la naviera los rangos de tarifa preaprobados y el umbral que separa un caso estándar de un caso excepcional |
| RY-03 | Definir la política de reservas temporales (plazo de vencimiento y consecuencias del uso indebido) para mitigar reservas sin intención real de uso |
| RY-04 | Validar el TO-BE con representantes del solicitante y del encargado de espacios antes de comenzar la construcción |
| RY-05 | Identificar los sistemas y fuentes de datos actuales de disponibilidad, asignaciones y BL, para definir cómo integrarlos con la nueva plataforma |
| RY-06 | Definir un plan de transición desde el correo hacia el portal, que indique el período de convivencia de ambos canales |
| RY-07 | Capacitar al encargado de espacios y al ejecutivo comercial en el nuevo flujo (cola de revisión, alertas, rangos preaprobados) |
 
## Requisito derivado
 
**Requisito origen:** RP-07. El sistema debe reservar temporalmente el espacio con un vencimiento una vez verificada la disponibilidad.
 
**Requisito derivado:** Al vencer el plazo de la reserva temporal sin confirmación, el sistema debe liberar automáticamente el espacio reservado, notificar al solicitante y dejar el recurso disponible para otras solicitudes.
 
**Justificación:** Si la reserva temporal tiene un vencimiento, el sistema necesita definir qué ocurre al cumplirse ese plazo. Sin la liberación automática, las reservas no confirmadas seguirían bloqueando espacio y crearían el conflicto que la reserva busca evitar. La notificación mantiene informado al solicitante, que es parte del objetivo de solicitar sin fricciones.

