# Elicitación de requisitos

## Técnica 1: Entrevista

- **Participante(s):** Jadecilla Guerrero, encargada de operaciones de una empresa naviera (stakeholder).
- **Fecha y modalidad:** 27-09-2026 / En línea, mediante entrevista asistida por IA (Claude).
- **Evidencia de la sesión:** [Conversación de entrevista realizada con Claude](https://claude.ai/share/88a08e4e-f739-49b3-88fe-3403685072a8)
- **Acta generada:** [Acta de reunión de elicitación de requisitos](./Acta_Elicitacion_Requisitos_Naviera.docx)

### Hallazgos principales

- Se identificó una falta de coordinación entre la disponibilidad real de espacio en los buques y la información disponible durante el proceso de booking.
- El proceso actual depende del forwarder como intermediario entre el cliente y la naviera.
- La solicitud de tarifas y parte de la confirmación del servicio se realizan mediante correo electrónico.
- La naviera verifica manualmente la disponibilidad de contenedores y de espacio en los buques utilizando dos sistemas internos que no están integrados con el sistema de booking.
- La revisión manual de disponibilidad aumenta el tiempo necesario para confirmar un booking.
- Se identificó la necesidad de automatizar la consulta de disponibilidad de contenedores y de espacio en los buques.
- El objetivo principal del software es reducir el tiempo total del proceso de booking y entregar información de disponibilidad más confiable y actualizada.
- Se identificaron como participantes del proceso: cliente, forwarder, naviera, personal encargado de contenedores, personal de planificación y operación de buques, depósito de contenedores, transportista y puerto.

## Técnica 2: Revisión documental

- **Participante(s):** Equipo de desarrollo.
- **Fecha y modalidad:** 27-09-2026 / En línea, mediante revisión documental asistida por IA (Claude).
- **Documento revisado:** Acta de reunión de elicitación de requisitos del proyecto de software para la gestión de bookings de una naviera.
- **Evidencia de la sesión:** [Revisión documental realizada con Claude](https://claude.ai/share/55bb1853-a6cf-4939-a355-8d5728caa4d4)
- **Registro de revisión:** [Revisión documental del acta de la naviera](./Revision_Documental_Acta_Naviera.docx)

### Hallazgos principales

- El proceso actual de booking combina correo electrónico para la solicitud de tarifas y confirmaciones, una plataforma web para solicitar el booking y sistemas internos para verificar la disponibilidad.
- La disponibilidad de contenedores y de espacio en los buques se verifica manualmente mediante dos sistemas internos que no se encuentran integrados con el sistema de booking.
- Se identificó una descoordinación entre la disponibilidad real y la información disponible para el usuario, lo que puede generar solicitudes sobre espacios que realmente no se encuentran disponibles.
- Para confirmar un booking se deben verificar dos condiciones principales: la disponibilidad de los contenedores solicitados y la capacidad disponible en el buque correspondiente.
- El forwarder necesita disponer de información de disponibilidad confiable y actualizada antes de solicitar un booking y obtener una respuesta en un menor tiempo.
- El personal de la naviera necesita reducir las comprobaciones manuales necesarias para validar la disponibilidad.
- Se identificó como posible mejora la integración del sistema de booking con los sistemas internos de gestión de contenedores y planificación de buques.
- Se detectaron aspectos que todavía requieren validación, como los tiempos actuales del proceso, el procedimiento cuando no existe capacidad en un buque y algunos roles internos de la naviera.

## Acta de acuerdo

A partir de la entrevista y de la posterior revisión documental, se identificaron y documentaron los siguientes acuerdos y necesidades del proyecto:

- El problema principal a abordar es la descoordinación entre la disponibilidad real de contenedores y espacio en los buques y la información utilizada durante el proceso de booking.
- El proceso actual requiere verificaciones manuales de disponibilidad por parte del personal encargado de contenedores y del personal de planificación y operación de buques.
- Se busca reducir el tiempo total necesario para gestionar y confirmar un booking.
- Se requiere disminuir la dependencia de correos electrónicos y de comprobaciones manuales entre el forwarder y la naviera.
- El sistema deberá facilitar la consulta de disponibilidad de contenedores y de capacidad de los buques antes de confirmar un booking.
- La información de disponibilidad debe ser clara, confiable y estar alineada con la situación real de los recursos de la naviera.
- La integración entre el sistema de booking y los sistemas internos de contenedores y planificación de buques se considera un candidato a requisito de sistema/software que deberá ser validado posteriormente.
- Quedan pendientes de validación los tiempos actuales y metas medibles del proceso, el flujo cuando no existe capacidad en el buque y algunos roles internos asociados a la evaluación de tarifas y emisión del BL.

El detalle completo de la entrevista se encuentra en [Acta_Elicitacion_Requisitos_Naviera.docx](./Acta_Elicitacion_Requisitos_Naviera.docx), mientras que el análisis de la segunda técnica se encuentra en [Revision_Documental_Acta_Naviera.docx](./Revision_Documental_Acta_Naviera.docx).

> **Nota:** La revisión documental utilizó como fuente secundaria el acta obtenida previamente mediante la entrevista. Los posibles requisitos derivados durante dicha revisión deben considerarse candidatos pendientes de validación cuando no estén expresados explícitamente en el acta original.
