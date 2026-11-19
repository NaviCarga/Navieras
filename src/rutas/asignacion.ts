import { Router, type Response } from 'express';
import type { BaseDatos } from '../db/conexion';
import {
  listarAgentes,
  listarNotificacionesDeAgente,
  listarReservasConfirmadasSinAgente,
  listarReservasDeAgente,
} from '../dominio/repositorios';
import { asignarAgenteAReserva } from '../servicios/asignacion';

function idValido(valor: string): number | undefined {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function redirigirConMensaje(res: Response, mensaje: string, error = false): void {
  const parametros = new URLSearchParams({ mensaje });
  if (error) {
    parametros.set('error', '1');
  }
  res.redirect(`/alertas?${parametros.toString()}`);
}

// HU-03, CU-05/CU-06: panel del agente y alertas de asignación del administrador.
export function crearRutaAsignacion(db: BaseDatos): Router {
  const router = Router();

  router.get('/agente', (req, res, next) => {
    try {
      const agentes = listarAgentes(db);
      const solicitado =
        typeof req.query.agente === 'string' ? req.query.agente : undefined;
      const agente =
        agentes.find((candidato) => candidato.identificadorEmpleado === solicitado) ?? agentes[0];

      res.render('agente', {
        agentes,
        agente,
        reservas: agente ? listarReservasDeAgente(db, agente.id) : [],
        notificaciones: agente ? listarNotificacionesDeAgente(db, agente.id) : [],
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/alertas', (req, res, next) => {
    try {
      res.render('alertas', {
        reservasSinAgente: listarReservasConfirmadasSinAgente(db),
        agentes: listarAgentes(db),
        mensaje: typeof req.query.mensaje === 'string' ? req.query.mensaje : undefined,
        error: req.query.error === '1',
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/alertas/:id/reintentar', (req, res, next) => {
    try {
      const reservaId = idValido(req.params.id);
      if (reservaId === undefined) {
        redirigirConMensaje(res, 'Reserva no encontrada.', true);
        return;
      }

      const resultado = asignarAgenteAReserva(db, reservaId);
      switch (resultado.tipo) {
        case 'no_encontrada':
          redirigirConMensaje(res, 'Reserva no encontrada.', true);
          return;
        case 'estado_invalido':
          redirigirConMensaje(
            res,
            `La reserva ${resultado.reserva.codigoBooking} no está en estado "Confirmada"; su estado actual es "${resultado.reserva.estadoReserva}".`,
            true,
          );
          return;
        case 'ya_asignada':
          redirigirConMensaje(
            res,
            `La reserva ${resultado.reserva.codigoBooking} ya tiene agente asignado: ${resultado.agente.nombreCompleto} (${resultado.agente.identificadorEmpleado}).`,
          );
          return;
        case 'sin_agente':
          redirigirConMensaje(
            res,
            `No se pudo asignar la reserva ${resultado.reserva.codigoBooking}: todos los agentes de la zona "${resultado.zona}" alcanzaron su límite de reservas activas.`,
            true,
          );
          return;
        case 'asignada':
          redirigirConMensaje(
            res,
            `Agente asignado a la reserva ${resultado.reserva.codigoBooking}: ${resultado.agente.nombreCompleto} (${resultado.agente.identificadorEmpleado}).`,
          );
          return;
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
}
