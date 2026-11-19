import { Router, type Response } from 'express';
import type { BaseDatos } from '../db/conexion';
import { listarReservas } from '../dominio/repositorios';
import { crearSistemaFlota } from '../integraciones/sistemaFlota';
import { asignarAgenteAReserva } from '../servicios/asignacion';
import { cancelarReserva, confirmarReserva } from '../servicios/inventario';

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
            `No se pudo confirmar la reserva ${resultado.reserva.codigoBooking}: capacidad insuficiente en el viaje.`,
            true,
          );
          return;
        case 'confirmada': {
          const asignacion = asignarAgenteAReserva(db, reservaId);
          let avisoAsignacion = '';
          if (asignacion.tipo === 'asignada') {
            avisoAsignacion = ` Agente asignado: ${asignacion.agente.nombreCompleto} (${asignacion.agente.identificadorEmpleado}).`;
          } else if (asignacion.tipo === 'sin_agente') {
            avisoAsignacion = ` Sin agente asignado: no hay agentes con cupo de atención en la zona "${asignacion.zona}". Se emitió una alerta al administrador.`;
          } else {
            avisoAsignacion =
              ' No se pudo asignar un agente; la reserva queda en la lista de alertas del administrador.';
          }
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
            `La reserva ${resultado.reserva.codigoBooking} no se encuentra en estado "Confirmada"; su estado actual es "${resultado.reserva.estadoReserva}".`,
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
        case 'cancelada':
          redirigirConMensaje(
            res,
            `Reserva ${resultado.reserva.codigoBooking} cancelada. Capacidad disponible del viaje: ${resultado.capacidadDisponibleTEU} TEUs.`,
          );
          return;
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
}
