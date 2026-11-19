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

function agenteDeReserva(db: BaseDatos, reservaId: number): string | null {
  const fila = db
    .prepare(
      `SELECT a.identificador_empleado
       FROM reserva r
       LEFT JOIN agente_operativo a ON a.id = r.agente_operativo_id
       WHERE r.id = ?`,
    )
    .get(reservaId) as { identificador_empleado: string | null };
  return fila.identificador_empleado;
}

function notificacionesDe(db: BaseDatos, identificador: string): number {
  return (
    db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM notificacion n
         JOIN agente_operativo a ON a.id = n.agente_operativo_id
         WHERE a.identificador_empleado = ?`,
      )
      .get(identificador) as { total: number }
  ).total;
}

function mensajeDe(location: string | undefined): string {
  if (!location) {
    return '';
  }
  return new URL(location, 'http://localhost').searchParams.get('mensaje') ?? '';
}

describe('HU-03', () => {
  it('HU-03 · Asignación exitosa de agente según reglas de ruta y carga de trabajo', async () => {
    const { app, db } = appConDatos();
    const reservaId = idReserva(db, 'BK-HU03-001');

    const respuesta = await request(app).post(`/reservas/${reservaId}/confirmar`);

    expect(respuesta.status).toBe(302);
    const mensaje = mensajeDe(respuesta.headers.location);
    expect(mensaje).toContain('Reserva BK-HU03-001 confirmada');
    expect(mensaje).toContain('Agente asignado: Ana Torres (A-001)');
    expect(agenteDeReserva(db, reservaId)).toBe('A-001');
    expect(notificacionesDe(db, 'A-001')).toBe(2);

    const panel = await request(app).get('/agente').query({ agente: 'A-001' });
    expect(panel.status).toBe(200);
    expect(panel.text).toContain('BK-HU03-001');
    expect(panel.text).toContain('Se le asignó la reserva BK-HU03-001');

    const segundo = await request(app).post(`/reservas/${reservaId}/confirmar`);
    expect(mensajeDe(segundo.headers.location)).toContain('no se encuentra en estado');
    expect(notificacionesDe(db, 'A-001')).toBe(2);

    db.close();
  });

  it('HU-03 · Escalamiento por falta de agentes disponibles con cupo de atención en la zona', async () => {
    const { app, db } = appConDatos();
    const reservaId = idReserva(db, 'BK-HU02-001');

    const respuesta = await request(app).post(`/reservas/${reservaId}/confirmar`);

    expect(respuesta.status).toBe(302);
    const mensaje = mensajeDe(respuesta.headers.location);
    expect(mensaje).toContain('Sin agente asignado');
    expect(mensaje).toContain('zona "Europa"');
    expect(mensaje).toContain('alerta al administrador');
    expect(agenteDeReserva(db, reservaId)).toBeNull();

    const alertas = await request(app).get('/alertas');
    expect(alertas.status).toBe(200);
    expect(alertas.text).toContain('BK-HU02-001');
    expect(alertas.text).toContain('Reintentar asignación');
    expect(alertas.text).toContain('Carla Núñez');
    expect(alertas.text).toContain('Sin cupo');

    db.close();
  });

  it('HU-03 · Reintento exitoso cuando se libera cupo de atención', async () => {
    const { app, db } = appConDatos();
    const reservaId = idReserva(db, 'BK-HU02-001');

    await request(app).post(`/reservas/${reservaId}/confirmar`);
    expect(agenteDeReserva(db, reservaId)).toBeNull();

    const reservaCarla = idReserva(db, 'BK-HU03-002');
    const cancelacion = await request(app).post(`/reservas/${reservaCarla}/cancelar`);
    expect(cancelacion.status).toBe(302);

    const reintento = await request(app).post(`/alertas/${reservaId}/reintentar`);

    expect(reintento.status).toBe(302);
    expect(mensajeDe(reintento.headers.location)).toContain(
      'Agente asignado a la reserva BK-HU02-001: Carla Núñez (A-003).',
    );
    expect(agenteDeReserva(db, reservaId)).toBe('A-003');
    expect(notificacionesDe(db, 'A-003')).toBe(2);

    const alertas = await request(app).get('/alertas');
    expect(alertas.text).not.toContain('BK-HU02-001');

    db.close();
  });

  it('HU-03 · El rol de demostración lleva al panel y a las alertas', async () => {
    const { app, db } = appConDatos();

    const comoAgente = await request(app).get('/rol').query({ rol: 'agente' });
    expect(comoAgente.status).toBe(302);
    expect(comoAgente.headers.location).toBe('/agente');

    const comoAdministrador = await request(app).get('/rol').query({ rol: 'administrador' });
    expect(comoAdministrador.status).toBe(302);
    expect(comoAdministrador.headers.location).toBe('/alertas');

    const reservas = await request(app).get('/reservas');
    expect(reservas.text).toContain('<th>Agente</th>');
    expect(reservas.text).toContain('Diego Rojas');
    expect(reservas.text).toContain('Sin agente asignado');

    db.close();
  });
});
