import type { BaseDatos } from '../db/conexion';
import {
  asignarAgenteAReserva as guardarAgenteDeReserva,
  listarAgentes,
  obtenerPuerto,
  obtenerReserva,
  registrarNotificacion,
} from '../dominio/repositorios';
import type { AgenteOperativo, ReservaConDetalles } from '../dominio/tipos';

export type ResultadoAsignacion =
  | { tipo: 'asignada'; reserva: ReservaConDetalles; agente: AgenteOperativo; zona: string }
  | { tipo: 'sin_agente'; reserva: ReservaConDetalles; zona: string }
  | { tipo: 'ya_asignada'; reserva: ReservaConDetalles; agente: AgenteOperativo }
  | { tipo: 'estado_invalido'; reserva: ReservaConDetalles }
  | { tipo: 'no_encontrada' };

function zonaDeDestino(db: BaseDatos, reserva: ReservaConDetalles): string {
  const puerto = obtenerPuerto(db, reserva.viaje.puertoDestinoId);
  if (!puerto) {
    throw new Error(`No se encontró el puerto de destino del viaje ${reserva.viajeId}.`);
  }
  return puerto.zonaGeografica;
}

function agentesCandidatos(
  db: BaseDatos,
  zona: string,
): AgenteOperativo[] {
  return listarAgentes(db)
    .filter(
      (agente) =>
        agente.zonaGeograficaAsignada === zona &&
        agente.reservasActivasActuales < agente.limiteMaximoReservas,
    )
    .sort(
      (a, b) =>
        a.reservasActivasActuales - b.reservasActivasActuales ||
        a.identificadorEmpleado.localeCompare(b.identificadorEmpleado),
    );
}

function notificarAsignacion(
  db: BaseDatos,
  reserva: ReservaConDetalles,
  agente: AgenteOperativo,
): void {
  const datosReserva = `${reserva.codigoBooking} de ${reserva.empresa.razonSocial} (${reserva.puertoOrigen} → ${reserva.puertoDestino}, zarpe ${reserva.viaje.fechaZarpe}, ${reserva.cantidadTEU} TEUs)`;

  registrarNotificacion(db, {
    reservaId: reserva.id,
    agenteOperativoId: agente.id,
    destinatarioTipo: 'agente',
    destinatarioCorreo: agente.correoCorporativo,
    tipo: 'asignacion',
    mensaje: `Se le asignó la reserva ${datosReserva} para su seguimiento operativo.`,
  });

  registrarNotificacion(db, {
    reservaId: reserva.id,
    agenteOperativoId: agente.id,
    destinatarioTipo: 'exportador',
    destinatarioCorreo: reserva.empresa.correoContacto,
    tipo: 'asignacion',
    mensaje: `Su reserva ${datosReserva} tiene como responsable operativo a ${agente.nombreCompleto} (${agente.identificadorEmpleado}), correo ${agente.correoCorporativo}.`,
  });
}

// HU-03, ACT-TOBE: Asignación automatizada de ejecutivos de operaciones o atención al cliente.
export function asignarAgenteAReserva(
  db: BaseDatos,
  reservaId: number,
): ResultadoAsignacion {
  const operacion = db.transaction((): ResultadoAsignacion => {
    const reserva = obtenerReserva(db, reservaId);
    if (!reserva) {
      return { tipo: 'no_encontrada' };
    }
    if (reserva.estadoReserva !== 'Confirmada') {
      return { tipo: 'estado_invalido', reserva };
    }
    if (reserva.agente) {
      return { tipo: 'ya_asignada', reserva, agente: reserva.agente };
    }

    const zona = zonaDeDestino(db, reserva);
    const candidato = agentesCandidatos(db, zona)[0];
    if (!candidato) {
      return { tipo: 'sin_agente', reserva, zona };
    }

    if (!guardarAgenteDeReserva(db, reserva.id, candidato.id)) {
      throw new Error(`No se pudo asignar el agente a la reserva ${reserva.codigoBooking}.`);
    }

    const asignada = obtenerReserva(db, reservaId);
    if (!asignada) {
      throw new Error('No se pudo recuperar la reserva asignada.');
    }
    notificarAsignacion(db, asignada, candidato);

    return { tipo: 'asignada', reserva: asignada, agente: candidato, zona };
  });

  return operacion();
}
