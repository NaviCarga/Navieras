import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app';
import { crearConexion, type BaseDatos } from '../src/db/conexion';
import { sembrar } from '../src/db/seed';

function appConDatos() {
  const db = crearConexion(':memory:');
  sembrar(db);
  return { app: crearApp(db), db };
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

function mensajeDe(location: string | undefined): string {
  if (!location) {
    return '';
  }
  return new URL(location, 'http://localhost').searchParams.get('mensaje') ?? '';
}

describe('HU-02', () => {
  it('HU-02 Â· Descuento automÃ¡tico de cupo al confirmar una reserva', async () => {
    const { app, db } = appConDatos();
    const reservaId = idReserva(db, 'BK-HU02-001');

    const respuesta = await request(app).post(`/reservas/${reservaId}/confirmar`);

    expect(respuesta.status).toBe(302);
    expect(respuesta.headers.location).toContain('/reservas');
    expect(capacidadViaje(db, 'VIA-003')).toBe(40);
    expect(cupoDisponible(db, 'VIA-003', '40HQ')).toBe(40);
    expect(estadoReserva(db, reservaId)).toBe('Confirmada');

    const ubicacion = mensajeDe(respuesta.headers.location);
    expect(ubicacion).toContain('Reserva BK-HU02-001 confirmada');
    expect(ubicacion).toContain('40 TEUs');

    db.close();
  });

  it('HU-02 Â· Rechazo de confirmaciÃ³n de reserva por capacidad insuficiente (prevenciÃ³n de sobreventa)', async () => {
    const { app, db } = appConDatos();
    const reservaId = idReserva(db, 'BK-HU02-002');

    const respuesta = await request(app).post(`/reservas/${reservaId}/confirmar`);

    expect(respuesta.status).toBe(302);
    expect(capacidadViaje(db, 'VIA-004')).toBe(4);
    expect(cupoDisponible(db, 'VIA-004', '20GP')).toBe(4);
    expect(estadoReserva(db, reservaId)).toBe('Rechazada');

    const ubicacion = mensajeDe(respuesta.headers.location);
    expect(ubicacion).toContain('capacidad insuficiente');

    db.close();
  });

  it('HU-02 Â· RestituciÃ³n automÃ¡tica de cupo por cancelaciÃ³n dentro del plazo permitido', async () => {
    const { app, db } = appConDatos();
    const reservaId = idReserva(db, 'BK-HU02-003');

    const respuesta = await request(app).post(`/reservas/${reservaId}/cancelar`);

    expect(respuesta.status).toBe(302);
    expect(capacidadViaje(db, 'VIA-005')).toBe(38);
    expect(cupoDisponible(db, 'VIA-005', '40HQ')).toBe(38);
    expect(estadoReserva(db, reservaId)).toBe('Cancelada');

    const ubicacion = mensajeDe(respuesta.headers.location);
    expect(ubicacion).toContain('Reserva BK-HU02-003 cancelada');
    expect(ubicacion).toContain('38 TEUs');

    db.close();
  });

  it('HU-02 Â· Rechazo de cancelaciÃ³n de una reserva fuera del plazo permitido', async () => {
    const { app, db } = appConDatos();
    const reservaId = idReserva(db, 'BK-HU02-003');
    db.prepare('UPDATE reserva SET plazo_maximo_cancelacion = ? WHERE id = ?').run(
      '2020-01-01',
      reservaId,
    );

    const respuesta = await request(app).post(`/reservas/${reservaId}/cancelar`);

    expect(respuesta.status).toBe(302);
    expect(estadoReserva(db, reservaId)).toBe('Confirmada');
    expect(capacidadViaje(db, 'VIA-005')).toBe(30);
    expect(cupoDisponible(db, 'VIA-005', '40HQ')).toBe(30);

    const ubicacion = mensajeDe(respuesta.headers.location);
    expect(ubicacion).toContain('fuera del plazo permitido');

    db.close();
  });
});

