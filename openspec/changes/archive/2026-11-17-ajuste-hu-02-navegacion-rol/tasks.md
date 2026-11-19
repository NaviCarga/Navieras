# Tasks

## 1. Ruta de cambio de rol

- [x] 1.1 Ajustar `GET /rol` en `src/app.ts` para resolver el destino con un mapa por rol: `naviera` → `/reservas`; `exportador`, `agente` y `administrador` → `/disponibilidad`. Verificar con una petición HTTP que `GET /rol?rol=naviera` responde `302` con `Location: /reservas` y cookie `rol=naviera`, y que `GET /rol?rol=exportador` responde `302` con `Location: /disponibilidad`.

## 2. Pruebas de la navegación

- [x] 2.1 Ampliar `tests/reservas.test.ts` para afirmar el destino `/reservas` al elegir «Naviera» y agregar un caso para «Exportador» que espere `/disponibilidad`; conservar la comprobación de la cookie y del rol seleccionado en el encabezado. Verificar que `npm test -- tests/reservas.test.ts` pasa.
- [x] 2.2 Ejecutar la suite completa con `npm test` y el chequeo de tipos con `npm run typecheck`; verificar que todas las pruebas y el tipado pasan.

## 3. Documentación

- [x] 3.1 Actualizar la sección «Rol de demostración» de `README.md` para indicar que «Naviera» abre `/reservas` y los demás roles abren `/disponibilidad`; verificar que los comandos documentados siguen funcionando tal como están escritos.

## Workflow follow-up

- Validar el ajuste con el estudiante mediante `/cin324-validar-sistema`.
- Archivar este ajuste después de que la redirección se verifique en pantalla.
- Actualizar `.cin324/proyecto.md` con el cambio `ajuste-hu-02-navegacion-rol`.
