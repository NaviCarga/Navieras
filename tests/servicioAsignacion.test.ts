import { describe, expect, it } from 'vitest';
import { crearConexion } from '../src/db/conexion';
import { sembrar } from '../src/db/seed';
import { crearReserva, listarAgentes, listarNotificacionesDeAgente } from '../src/dominio/repositorios';
import { asignarAgenteAReserva } from '../src/servicios/asignacion';

function baseConDatos() {
  const db = crearConexion(':memory:');
  sembrar(db);
  return db;
}

let contador = 0;

function reservaConfirmada(
  db: ReturnType<typeof baseConDatos>,
  viajeId: number,
  codigo = `BK-SERV-${++contador}`,
): number {
  const reserva = crearReserva(db, {
    codigoBooking: codigo,
    empresaExportadoraId: 1,
    viajeId,
    fechaSolicitud: '2026-11-15',
    cantidadTEU: 2,
    tipoMercancia: 'Carga general',
    plazoMaximoCancelacion: '2027-01-01',
    estadoReserva: 'Confirmada',
    detalles: [{ tipoContenedor: '40HQ', cantidadSolicitada: 2, pesoEstimadoTon: 4 }],
  });
  return reserva.id;
}

function idViaje(db: ReturnType<typeof baseConDatos>, codigo: string): number {
  return (db.prepare('SELECT id FROM viaje WHERE codigo_viaje = ?').get(codigo) as { id: number })
    .id;
}

describe('Servicio de asignación de agente (HU-03)', () => {
  it('asigna el agente de la zona con menor carga y notifica a agente y exportador', () => {
    const db = baseConDatos();
    const reservaId = reservaConfirmada(db, idViaje(db, 'VIA-001'));

    const resultado = asignarAgenteAReserva(db, reservaId);

    expect(resultado.tipo).toBe('asignada');
    if (resultado.tipo !== 'asignada') {
      return;
    }
    expect(resultado.zona).toBe('Asia-Pacífico');
    expect(resultado.agente.identificadorEmpleado).toBe('A-001');
    expect(resultado.reserva.agente?.identificadorEmpleado).toBe('A-001');

    const notificaciones = listarNotificacionesDeAgente(db, resultado.agente.id);
    expect(notificaciones).toHaveLength(1);
    expect(notificaciones[0].destinatarioTipo).toBe('agente');

    const alExportador = db
      .prepare("SELECT COUNT(*) AS total FROM notificacion WHERE destinatario_tipo = 'exportador'")
      .get() as { total: number };
    expect(alExportador.total).toBe(1);

    db.close();
  });

  it('prefiere al agente con menor cantidad de reservas activas', () => {
    const db = baseConDatos();
    const viajeId = idViaje(db, 'VIA-001');

    const primera = asignarAgenteAReserva(db, reservaConfirmada(db, viajeId));
    expect(primera.tipo).toBe('asignada');
    if (primera.tipo !== 'asignada') {
      return;
    }
    expect(primera.agente.identificadorEmpleado).toBe('A-001');

    const segunda = asignarAgenteAReserva(db, reservaConfirmada(db, viajeId));
    expect(segunda.tipo).toBe('asignada');
    if (segunda.tipo !== 'asignada') {
      return;
    }
    expect(segunda.agente.identificadorEmpleado).toBe('A-002');

    db.close();
  });

  it('no asigna cuando todos los agentes de la zona alcanzaron su límite', () => {
    const db = baseConDatos();
    const reservaId = reservaConfirmada(db, idViaje(db, 'VIA-006'));

    const resultado = asignarAgenteAReserva(db, reservaId);
    expect(resultado.tipo).toBe('sin_agente');
    if (resultado.tipo !== 'sin_agente') {
      return;
    }
    expect(resultado.zona).toBe('Europa');
    expect(resultado.reserva.agente).toBeNull();

    db.close();
  });

  it('no asigna cuando la zona del destino no tiene agentes', () => {
    const db = baseConDatos();
    db.prepare(
      "INSERT INTO puerto (codigo_unlocode, nombre, pais, zona_geografica) VALUES ('ZAF', 'Ciudad del Cabo', 'Sudáfrica', 'África')",
    ).run();
    const puertoId = (
      db.prepare("SELECT id FROM puerto WHERE codigo_unlocode = 'ZAF'").get() as { id: number }
    ).id;
    db.prepare(
      `INSERT INTO viaje (codigo_viaje, buque_id, puerto_origen_id, puerto_destino_id, fecha_zarpe, fecha_arribo_estimada, capacidad_disponible_teu, estado_viaje)
       VALUES ('VIA-AFRICA', 1, 1, ?, '2027-06-01', '2027-07-01', 10, 'Programado')`,
    ).run(puertoId);
    const viajeId = idViaje(db, 'VIA-AFRICA');

    const resultado = asignarAgenteAReserva(db, reservaConfirmada(db, viajeId));
    expect(resultado.tipo).toBe('sin_agente');
    if (resultado.tipo !== 'sin_agente') {
      return;
    }
    expect(resultado.zona).toBe('África');

    db.close();
  });

  it('es idempotente: una reserva ya asignada no cambia de agente ni duplica notificaciones', () => {
    const db = baseConDatos();
    const reservaId = reservaConfirmada(db, idViaje(db, 'VIA-001'));

    const primera = asignarAgenteAReserva(db, reservaId);
    expect(primera.tipo).toBe('asignada');

    const segunda = asignarAgenteAReserva(db, reservaId);
    expect(segunda.tipo).toBe('ya_asignada');
    if (segunda.tipo !== 'ya_asignada') {
      return;
    }
    expect(segunda.agente.identificadorEmpleado).toBe('A-001');

    const total = db.prepare('SELECT COUNT(*) AS total FROM notificacion').get() as {
      total: number;
    };
    expect(total.total).toBe(2);
    expect(
      listarAgentes(db).find((a) => a.identificadorEmpleado === 'A-001')
        ?.reservasActivasActuales,
    ).toBe(1);

    db.close();
  });
});
