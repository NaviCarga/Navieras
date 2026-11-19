import { describe, expect, it } from 'vitest';
import { crearConexion } from '../src/db/conexion';
import { sembrar } from '../src/db/seed';
import {
  asignarAgenteAReserva,
  crearReserva,
  listarAgentes,
  listarNotificacionesDeAgente,
  listarReservasConfirmadasSinAgente,
  listarReservasDeAgente,
  obtenerAgente,
  registrarNotificacion,
} from '../src/dominio/repositorios';

function baseConDatos() {
  const db = crearConexion(':memory:');
  sembrar(db);
  return db;
}

function crearReservaConfirmadaSinAgente(db: ReturnType<typeof baseConDatos>): number {
  const reserva = crearReserva(db, {
    codigoBooking: 'BK-REPO-HU03',
    empresaExportadoraId: 1,
    viajeId: 1,
    fechaSolicitud: '2026-11-15',
    cantidadTEU: 2,
    tipoMercancia: 'Carga general',
    plazoMaximoCancelacion: '2027-01-01',
    estadoReserva: 'Confirmada',
    detalles: [{ tipoContenedor: '40HQ', cantidadSolicitada: 2, pesoEstimadoTon: 4 }],
  });
  return reserva.id;
}

describe('Repositorio de agentes operativos', () => {
  it('lista agentes con sus reservas activas calculadas', () => {
    const db = baseConDatos();

    const agentes = listarAgentes(db);
    expect(agentes).toHaveLength(4);

    const carla = agentes.find((agente) => agente.identificadorEmpleado === 'A-003');
    expect(carla).toBeDefined();
    expect(carla?.zonaGeograficaAsignada).toBe('Europa');
    expect(carla?.limiteMaximoReservas).toBe(1);
    expect(carla?.reservasActivasActuales).toBe(1);

    const diego = obtenerAgente(db, agentes.find((a) => a.identificadorEmpleado === 'A-004')!.id);
    expect(diego?.reservasActivasActuales).toBe(1);

    db.close();
  });

  it('encuentra reservas confirmadas sin agente y las asigna', () => {
    const db = baseConDatos();
    const reservaId = crearReservaConfirmadaSinAgente(db);

    expect(listarReservasConfirmadasSinAgente(db).map((r) => r.id)).toContain(reservaId);

    const agente = listarAgentes(db).find((a) => a.identificadorEmpleado === 'A-001');
    expect(agente).toBeDefined();
    expect(asignarAgenteAReserva(db, reservaId, agente!.id)).toBe(true);
    expect(asignarAgenteAReserva(db, reservaId, agente!.id)).toBe(true);
    expect(listarReservasConfirmadasSinAgente(db).map((r) => r.id)).not.toContain(reservaId);
    expect(listarReservasDeAgente(db, agente!.id).map((r) => r.codigoBooking)).toContain(
      'BK-REPO-HU03',
    );

    db.close();
  });

  it('registra notificaciones y las recupera por agente', () => {
    const db = baseConDatos();
    const agente = listarAgentes(db).find((a) => a.identificadorEmpleado === 'A-001')!;
    const reserva = crearReserva(db, {
      codigoBooking: 'BK-NOTIF',
      empresaExportadoraId: 1,
      viajeId: 1,
      fechaSolicitud: '2026-11-15',
      cantidadTEU: 1,
      tipoMercancia: 'Carga general',
      plazoMaximoCancelacion: '2027-01-01',
      estadoReserva: 'Confirmada',
      detalles: [{ tipoContenedor: '40HQ', cantidadSolicitada: 1, pesoEstimadoTon: 2 }],
    });

    registrarNotificacion(db, {
      reservaId: reserva.id,
      agenteOperativoId: agente.id,
      destinatarioTipo: 'agente',
      destinatarioCorreo: agente.correoCorporativo,
      tipo: 'asignacion',
      mensaje: 'Nueva reserva asignada.',
    });

    const notificaciones = listarNotificacionesDeAgente(db, agente.id);
    expect(notificaciones).toHaveLength(1);
    expect(notificaciones[0].mensaje).toBe('Nueva reserva asignada.');

    db.close();
  });
});
