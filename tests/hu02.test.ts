import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app';
import { crearConexion, type BaseDatos } from '../src/db/conexion';
import { sembrar } from '../src/db/seed';
import { obtenerReservaPorCodigo } from '../src/dominio/repositorios';

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

function capacidadTotalBuque(db: BaseDatos, codigoViaje: string): number {
  return (
    db
      .prepare(
        `SELECT b.capacidad_total_teu AS total
         FROM viaje v JOIN buque b ON b.id = v.buque_id
         WHERE v.codigo_viaje = ?`,
      )
      .get(codigoViaje) as { total: number }
  ).total;
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

function reserva(db: BaseDatos, codigoBooking: string) {
  const encontrada = obtenerReservaPorCodigo(db, codigoBooking);
  if (!encontrada) {
    throw new Error(`No existe la reserva ${codigoBooking}`);
  }
  return encontrada;
}

function teuEnLista(db: BaseDatos, codigoViaje: string): number {
  return (
    db
      .prepare(
        `SELECT COALESCE(SUM(r.cantidad_teu), 0) AS total
         FROM reserva r JOIN viaje v ON v.id = r.viaje_id
         WHERE v.codigo_viaje = ? AND r.estado_reserva = 'En lista de espera'`,
      )
      .get(codigoViaje) as { total: number }
  ).total;
}

function mensajeDe(location: string | undefined): string {
  if (!location) {
    return '';
  }
  return new URL(location, 'http://localhost').searchParams.get('mensaje') ?? '';
}

describe('HU-02', () => {
  it('HU-02 · Descuento automático de cupo al confirmar una reserva', async () => {
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

  it('HU-02 · Rechazo de confirmación de reserva por capacidad insuficiente sobre el tope de sobrecupo', async () => {
    const { app, db } = appConDatos();
    // Dado un viaje de un buque de 100 TEUs con 4 TEUs disponibles y sin reservas en lista de espera
    expect(capacidadTotalBuque(db, 'VIA-004')).toBe(100);
    expect(capacidadViaje(db, 'VIA-004')).toBe(4);
    expect(teuEnLista(db, 'VIA-004')).toBe(0);
    const reservaId = idReserva(db, 'BK-HU02-002'); // 10 TEUs

    // Cuando se intenta confirmar la solicitud de 10 TEUs
    const respuesta = await request(app).post(`/reservas/${reservaId}/confirmar`);

    // Entonces se rechaza porque el sobrecupo acumulado de 6 TEUs supera el tope de 3 TEUs
    expect(respuesta.status).toBe(302);
    expect(estadoReserva(db, reservaId)).toBe('Rechazada');
    const ubicacion = mensajeDe(respuesta.headers.location);
    expect(ubicacion).toContain('capacidad insuficiente');
    expect(ubicacion).toContain('sobrecupo acumulado de 6 TEUs');
    expect(ubicacion).toContain('tope de sobrecupo de 3 TEUs');
    // Y la capacidad disponible del viaje se mantiene en 4 TEUs
    expect(capacidadViaje(db, 'VIA-004')).toBe(4);
    expect(cupoDisponible(db, 'VIA-004', '20GP')).toBe(4);

    db.close();
  });

  it('HU-02 · Restitución automática de cupo por cancelación dentro del plazo permitido', async () => {
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

  it('HU-02 · Rechazo de cancelación de una reserva fuera del plazo permitido', async () => {
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

  it('HU-02 · Confirmación desde lista de espera al liberarse cupo por cancelación', async () => {
    const { app, db } = appConDatos();
    // Dado un viaje de 100 TEUs con capacidad disponible 0, una confirmada de 8 TEUs dentro del plazo
    // y una reserva "En lista de espera" de 3 TEUs en la posición 1
    expect(capacidadTotalBuque(db, 'VIA-010')).toBe(100);
    expect(capacidadViaje(db, 'VIA-010')).toBe(0);
    const confirmada = reserva(db, 'BK-LE-004');
    expect(confirmada).toMatchObject({ estadoReserva: 'Confirmada', cantidadTEU: 8 });
    const enEspera = reserva(db, 'BK-LE-005');
    expect(enEspera).toMatchObject({ estadoReserva: 'En lista de espera', posicionListaEspera: 1, cantidadTEU: 3 });

    // Cuando la reserva confirmada de 8 TEUs cambia su estado a "Cancelada"
    const respuesta = await request(app).post(`/reservas/${confirmada.id}/cancelar`);
    expect(respuesta.status).toBe(302);
    expect(estadoReserva(db, confirmada.id)).toBe('Cancelada');

    // Entonces la reserva de 3 TEUs cambia a "Confirmada" conservando su código Booking
    const despues = reserva(db, 'BK-LE-005');
    expect(despues.id).toBe(enEspera.id);
    expect(despues.estadoReserva).toBe('Confirmada');
    // Y la capacidad disponible del viaje queda en 5 TEUs
    expect(capacidadViaje(db, 'VIA-010')).toBe(5);
    // Y se asigna automáticamente un agente operativo
    expect(despues.agente?.identificadorEmpleado).toBe('A-004');
    // Y deja de figurar en la lista y de contar para el tope de sobrecupo
    expect(despues.posicionListaEspera).toBeNull();
    expect(teuEnLista(db, 'VIA-010')).toBe(0);

    const ubicacion = mensajeDe(respuesta.headers.location);
    expect(ubicacion).toContain('BK-LE-005 pasó de "En lista de espera" a "Confirmada"');

    db.close();
  });

  it('HU-02 · Reserva en lista de espera se mantiene si el cupo liberado no alcanza', async () => {
    const { app, db } = appConDatos();
    // Dado un viaje de 100 TEUs con D = 0, una confirmada de 2 TEUs y una en espera de 3 TEUs (pos. 1)
    expect(capacidadTotalBuque(db, 'VIA-011')).toBe(100);
    expect(capacidadViaje(db, 'VIA-011')).toBe(0);
    const confirmada = reserva(db, 'BK-LE-006');
    expect(confirmada).toMatchObject({ estadoReserva: 'Confirmada', cantidadTEU: 2 });

    // Cuando la confirmada de 2 TEUs cambia a "Cancelada"
    await request(app).post(`/reservas/${confirmada.id}/cancelar`);

    // Entonces la capacidad disponible aumenta a 2 TEUs
    expect(estadoReserva(db, confirmada.id)).toBe('Cancelada');
    expect(capacidadViaje(db, 'VIA-011')).toBe(2);
    // Y la reserva de 3 TEUs se mantiene "En lista de espera" en la posición 1
    expect(reserva(db, 'BK-LE-007')).toMatchObject({
      estadoReserva: 'En lista de espera',
      posicionListaEspera: 1,
    });

    db.close();
  });

  it('HU-02 · Cancelación de una reserva en lista de espera', async () => {
    const { app, db } = appConDatos();
    // Dado un viaje de 100 TEUs con D = 0, una en espera de 2 TEUs (pos. 1) y otra de 1 TEU (pos. 2)
    expect(capacidadTotalBuque(db, 'VIA-009')).toBe(100);
    expect(capacidadViaje(db, 'VIA-009')).toBe(0);
    const deDos = reserva(db, 'BK-LE-002');
    expect(deDos).toMatchObject({ cantidadTEU: 2, posicionListaEspera: 1 });
    expect(reserva(db, 'BK-LE-003')).toMatchObject({ cantidadTEU: 1, posicionListaEspera: 2 });
    // Y la fecha de cancelación es posterior a su plazo máximo de cancelación
    expect(deDos.plazoMaximoCancelacion < new Date().toISOString().slice(0, 10)).toBe(true);

    // Cuando el exportador cancela la reserva de 2 TEUs ("Cancelar reserva en lista de espera")
    const respuesta = await request(app).post(`/booking/${deDos.id}/cancelar`);
    expect(respuesta.status).toBe(302);

    // Entonces la reserva cambia a "Cancelada" sin aplicar el plazo máximo
    const cancelada = reserva(db, 'BK-LE-002');
    expect(cancelada.estadoReserva).toBe('Cancelada');
    // Y deja de figurar en la lista y de contar para el tope
    expect(cancelada.posicionListaEspera).toBeNull();
    expect(teuEnLista(db, 'VIA-009')).toBe(1);
    // Y la reserva de 1 TEU pasa a la posición 1
    expect(reserva(db, 'BK-LE-003').posicionListaEspera).toBe(1);
    // Y la capacidad disponible del viaje se mantiene en 0 TEUs
    expect(capacidadViaje(db, 'VIA-009')).toBe(0);
    expect(mensajeDe(respuesta.headers.location)).toContain('dejó la lista de espera');

    db.close();
  });
});
