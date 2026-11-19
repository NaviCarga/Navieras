import { describe, expect, it } from 'vitest';
import { crearConexion, type BaseDatos } from '../src/db/conexion';
import { sembrar } from '../src/db/seed';
import { cancelarReserva, confirmarReserva } from '../src/servicios/inventario';

function baseConDatos(): BaseDatos {
  const db = crearConexion(':memory:');
  sembrar(db);
  return db;
}

function idReserva(db: BaseDatos, codigoBooking: string): number {
  return (
    db.prepare('SELECT id FROM reserva WHERE codigo_booking = ?').get(codigoBooking) as {
      id: number;
    }
  ).id;
}

function capacidadViaje(db: BaseDatos, codigoViaje: string): number {
  return (
    db
      .prepare('SELECT capacidad_disponible_teu FROM viaje WHERE codigo_viaje = ?')
      .get(codigoViaje) as { capacidad_disponible_teu: number }
  ).capacidad_disponible_teu;
}

function cupoDisponible(db: BaseDatos, codigoViaje: string, tipo: string): number {
  return (
    db
      .prepare(
        `SELECT cc.cantidad_disponible
         FROM cupo_contenedor cc
         JOIN viaje v ON v.id = cc.viaje_id
         WHERE v.codigo_viaje = ? AND cc.tipo_contenedor = ?`,
      )
      .get(codigoViaje, tipo) as { cantidad_disponible: number }
  ).cantidad_disponible;
}

function estadoReserva(db: BaseDatos, reservaId: number): string {
  return (
    db.prepare('SELECT estado_reserva FROM reserva WHERE id = ?').get(reservaId) as {
      estado_reserva: string;
    }
  ).estado_reserva;
}

describe('Inventario: confirmar reserva', () => {
  it('descuenta viaje y cupo y deja la reserva Confirmada', () => {
    const db = baseConDatos();
    const reservaId = idReserva(db, 'BK-HU02-001');

    const resultado = confirmarReserva(db, reservaId);

    expect(resultado.tipo).toBe('confirmada');
    expect(capacidadViaje(db, 'VIA-003')).toBe(40);
    expect(cupoDisponible(db, 'VIA-003', '40HQ')).toBe(40);
    expect(estadoReserva(db, reservaId)).toBe('Confirmada');

    const logs = db
      .prepare('SELECT mensaje FROM integraciones_log ORDER BY id')
      .all() as Array<{ mensaje: string }>;
    expect(logs.map((log) => log.mensaje)).toEqual([
      'Consultar disponibilidad preliminar',
      'Registrar asignación de recursos',
    ]);

    db.close();
  });

  it('rechaza por capacidad insuficiente sin alterar cantidades', () => {
    const db = baseConDatos();
    const reservaId = idReserva(db, 'BK-HU02-002');

    const resultado = confirmarReserva(db, reservaId);

    expect(resultado.tipo).toBe('rechazada');
    expect(capacidadViaje(db, 'VIA-004')).toBe(4);
    expect(cupoDisponible(db, 'VIA-004', '20GP')).toBe(4);
    expect(estadoReserva(db, reservaId)).toBe('Rechazada');

    db.close();
  });

  it('no deja cambios parciales cuando una de las líneas no tiene cupo suficiente', () => {
    const db = baseConDatos();
    const reservaId = idReserva(db, 'BK-HU02-001');
    db.prepare(
      `INSERT INTO detalle_reserva (reserva_id, tipo_contenedor, cantidad_solicitada, peso_estimado_ton)
       VALUES (?, ?, ?, ?)`,
    ).run(reservaId, '20GP', 100, 1);

    const resultado = confirmarReserva(db, reservaId);

    expect(resultado.tipo).toBe('rechazada');
    expect(capacidadViaje(db, 'VIA-003')).toBe(50);
    expect(cupoDisponible(db, 'VIA-003', '40HQ')).toBe(50);
    expect(estadoReserva(db, reservaId)).toBe('Rechazada');

    db.close();
  });

  it('devuelve no_encontrada y estado_invalido sin lanzar errores', () => {
    const db = baseConDatos();
    const confirmada = idReserva(db, 'BK-HU02-003');

    expect(confirmarReserva(db, 9999).tipo).toBe('no_encontrada');
    expect(confirmarReserva(db, confirmada).tipo).toBe('estado_invalido');
    expect(capacidadViaje(db, 'VIA-005')).toBe(30);

    db.close();
  });
});

describe('Inventario: cancelar reserva', () => {
  it('restituye viaje y cupo dentro del plazo', () => {
    const db = baseConDatos();
    const reservaId = idReserva(db, 'BK-HU02-003');

    const resultado = cancelarReserva(db, reservaId, undefined, '2026-11-12');

    expect(resultado.tipo).toBe('cancelada');
    expect(capacidadViaje(db, 'VIA-005')).toBe(38);
    expect(cupoDisponible(db, 'VIA-005', '40HQ')).toBe(38);
    expect(estadoReserva(db, reservaId)).toBe('Cancelada');

    db.close();
  });

  it('rechaza fuera del plazo sin alterar cantidades', () => {
    const db = baseConDatos();
    const reservaId = idReserva(db, 'BK-HU02-003');

    const resultado = cancelarReserva(db, reservaId, undefined, '2100-01-01');

    expect(resultado.tipo).toBe('fuera_de_plazo');
    expect(capacidadViaje(db, 'VIA-005')).toBe(30);
    expect(cupoDisponible(db, 'VIA-005', '40HQ')).toBe(30);
    expect(estadoReserva(db, reservaId)).toBe('Confirmada');

    db.close();
  });

  it('devuelve estado_invalido para una reserva no confirmada', () => {
    const db = baseConDatos();
    const reservaId = idReserva(db, 'BK-HU02-001');

    const resultado = cancelarReserva(db, reservaId, undefined, '2026-11-12');

    expect(resultado.tipo).toBe('estado_invalido');
    expect(capacidadViaje(db, 'VIA-003')).toBe(50);

    db.close();
  });
});
