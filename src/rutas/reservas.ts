import { Router, type Response } from 'express';
import type { BaseDatos } from '../db/conexion';
import { listarReservas } from '../dominio/repositorios';
import { crearSistemaFlota } from '../integraciones/sistemaFlota';
import { asignarAgenteAReserva, type ResultadoAsignacion } from '../servicios/asignacion';
import { cancelarReserva, confirmarReserva, fechaHoy } from '../servicios/inventario';
import { cerrarListasPorZarpe, mensajeSobreTope } from '../servicios/listaEspera';

function avisoDeAsignacion(asignacion: ResultadoAsignacion): string {
  if (asignacion.tipo === 'asignada' || asignacion.tipo === 'ya_asignada') {
    return ` Agente asignado: ${asignacion.agente.nombreCompleto} (${asignacion.agente.identificadorEmpleado}).`;
  }
  if (asignacion.tipo === 'sin_agente') {
    return ` Sin agente asignado: no hay agentes con cupo de atención en la zona "${asignacion.zona}". Se emitió una alerta al administrador.`;
  }
  return ' No se pudo asignar un agente; la reserva queda en la lista de alertas del administrador.';
}

function redirigirConMensaje(res: Response, mensaje: string, error = false): void {
  const parametros = new URLSearchParams({ mensaje });
  if (error) {
    parametros.set('error', '1');
  }
  res.redirect(`/reservas?${parametros.toString()}`);
}

function idValido(valor: string): number | undefined {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export function crearRutaReservas(db: BaseDatos): Router {
  const router = Router();
  const sistemaFlota = crearSistemaFlota(db);

  router.get('/reservas', (req, res, next) => {
    try {
      // HU-04 CA4: vencimiento perezoso de las listas de espera por zarpe
      cerrarListasPorZarpe(db, fechaHoy());
      const reservas = listarReservas(db);
      res.render('reservas', {
        reservas,
        mensaje: typeof req.query.mensaje === 'string' ? req.query.mensaje : undefined,
        error: req.query.error === '1',
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/reservas/:id/confirmar', (req, res, next) => {
    try {
      const reservaId = idValido(req.params.id);
      if (reservaId === undefined) {
        redirigirConMensaje(res, 'Reserva no encontrada.', true);
        return;
      }

      const resultado = confirmarReserva(db, reservaId, sistemaFlota);
      switch (resultado.tipo) {
        case 'no_encontrada':
          redirigirConMensaje(res, 'Reserva no encontrada.', true);
          return;
        case 'estado_invalido':
          redirigirConMensaje(
            res,
            `La reserva ${resultado.reserva.codigoBooking} no se encuentra en estado "Reserva temporal"; su estado actual es "${resultado.reserva.estadoReserva}".`,
            true,
          );
          return;
        case 'rechazada':
          redirigirConMensaje(
            res,
            `No se pudo confirmar la reserva ${resultado.reserva.codigoBooking}: capacidad insuficiente en el viaje. La reserva quedó "Rechazada". ${mensajeSobreTope(resultado.evaluacion)}`,
            true,
          );
          return;
        case 'lista_espera':
          redirigirConMensaje(
            res,
            `Capacidad insuficiente para confirmar la reserva ${resultado.reserva.codigoBooking}: quedó "En lista de espera" en la posición ${resultado.reserva.posicionListaEspera} (sobrecupo acumulado de ${resultado.evaluacion.sobrecupo} TEUs, tope de sobrecupo de ${resultado.evaluacion.tope} TEUs).`,
            true,
          );
          return;
        case 'confirmada': {
          const avisoAsignacion = avisoDeAsignacion(asignarAgenteAReserva(db, reservaId));
          redirigirConMensaje(
            res,
            `Reserva ${resultado.reserva.codigoBooking} confirmada. Capacidad disponible del viaje: ${resultado.capacidadDisponibleTEU} TEUs.${avisoAsignacion}`,
          );
          return;
        }
      }
    } catch (error) {
      next(error);
    }
  });

  router.post('/reservas/:id/cancelar', (req, res, next) => {
    try {
      const reservaId = idValido(req.params.id);
      if (reservaId === undefined) {
        redirigirConMensaje(res, 'Reserva no encontrada.', true);
        return;
      }

      const resultado = cancelarReserva(db, reservaId, sistemaFlota);
      switch (resultado.tipo) {
        case 'no_encontrada':
          redirigirConMensaje(res, 'Reserva no encontrada.', true);
          return;
        case 'estado_invalido':
          redirigirConMensaje(
            res,
            `La reserva ${resultado.reserva.codigoBooking} no se encuentra en estado "Confirmada" ni "En lista de espera"; su estado actual es "${resultado.reserva.estadoReserva}".`,
            true,
          );
          return;
        case 'fuera_de_plazo':
          redirigirConMensaje(
            res,
            `No se pudo cancelar la reserva ${resultado.reserva.codigoBooking}: fuera del plazo permitido.`,
            true,
          );
          return;
        case 'cancelada_lista_espera':
          redirigirConMensaje(
            res,
            `Reserva ${resultado.reserva.codigoBooking} cancelada: dejó la lista de espera. Capacidad disponible del viaje: ${resultado.capacidadDisponibleTEU} TEUs.`,
          );
          return;
        case 'cancelada': {
          const desdeLista = resultado.confirmadaDesdeLista
            ? ` Se liberó cupo: la reserva ${resultado.confirmadaDesdeLista.reserva.codigoBooking} pasó de "En lista de espera" a "Confirmada".${avisoDeAsignacion(resultado.confirmadaDesdeLista.asignacion)}`
            : '';
          redirigirConMensaje(
            res,
            `Reserva ${resultado.reserva.codigoBooking} cancelada. Capacidad disponible del viaje: ${resultado.capacidadDisponibleTEU} TEUs.${desdeLista}`,
          );
          return;
        }
      }
    } catch (error) {
      next(error);
    }
  });

  // HU-04 CA4 / HU-02: botón explícito de la Naviera para cerrar listas de espera por zarpe
  router.post('/reservas/cerrar-listas', (_req, res, next) => {
    try {
      const vencidas = cerrarListasPorZarpe(db, fechaHoy());
      redirigirConMensaje(
        res,
        vencidas === 0
          ? 'No hay reservas en lista de espera de viajes que ya zarparon.'
          : `${vencidas} reserva(s) pasaron a "Vencida" por el zarpe del viaje.`,
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
