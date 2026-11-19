import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app';
import { crearConexion } from '../src/db/conexion';
import { sembrar } from '../src/db/seed';

function appConDatos() {
  const db = crearConexion(':memory:');
  sembrar(db);
  return { app: crearApp(db), db };
}

describe('Rol de demostración Naviera', () => {
  it('guarda el rol naviera y lo refleja en el encabezado', async () => {
    const { app, db } = appConDatos();

    const cambio = await request(app).get('/rol').query({ rol: 'naviera' });
    expect(cambio.status).toBe(302);
    expect(cambio.headers.location).toBe('/reservas');
    expect(cambio.headers['set-cookie']?.[0]).toContain('rol=naviera');

    const pagina = await request(app)
      .get('/disponibilidad')
      .set('Cookie', 'rol=naviera');
    expect(pagina.status).toBe(200);
    expect(pagina.text).toContain('<option value="naviera" selected>');
    expect(pagina.text).toContain('href="/reservas"');

    db.close();
  });

  it('redirige a disponibilidad cuando el rol no es naviera', async () => {
    const { app, db } = appConDatos();

    const cambio = await request(app).get('/rol').query({ rol: 'exportador' });
    expect(cambio.status).toBe(302);
    expect(cambio.headers.location).toBe('/disponibilidad');
    expect(cambio.headers['set-cookie']?.[0]).toContain('rol=exportador');

    db.close();
  });
});

describe('Pantalla de reservas', () => {
  it('muestra las reservas de ejemplo con sus datos y acciones', async () => {
    const { app, db } = appConDatos();

    const respuesta = await request(app).get('/reservas');

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('Reservas y actualización del inventario');
    expect(respuesta.text).toContain('BK-HU02-001');
    expect(respuesta.text).toContain('Exportadora Andina SpA');
    expect(respuesta.text).toContain('10 TEUs 40HQ');
    expect(respuesta.text).toContain('Reserva temporal');
    expect(respuesta.text).toContain('50 TEUs');
    expect(respuesta.text).toContain('Confirmar');
    expect(respuesta.text).toContain('BK-HU02-003');
    expect(respuesta.text).toContain('Confirmada');
    expect(respuesta.text).toContain('Cancelar');

    db.close();
  });
});

describe('Errores de operación sobre reservas', () => {
  function idReserva(db: ReturnType<typeof crearConexion>, codigoBooking: string): number {
    return (
      db.prepare('SELECT id FROM reserva WHERE codigo_booking = ?').get(codigoBooking) as {
        id: number;
      }
    ).id;
  }

  function mensajeDe(location: string | undefined): string {
    if (!location) {
      return '';
    }
    return new URL(location, 'http://localhost').searchParams.get('mensaje') ?? '';
  }

  it('redirige con mensaje cuando la reserva no existe', async () => {
    const { app, db } = appConDatos();

    const respuesta = await request(app).post('/reservas/9999/confirmar');

    expect(respuesta.status).toBe(302);
    expect(mensajeDe(respuesta.headers.location)).toContain('Reserva no encontrada');

    db.close();
  });

  it('redirige con mensaje cuando el estado no permite la operación', async () => {
    const { app, db } = appConDatos();
    const cancelada = idReserva(db, 'BK-HU02-003');
    db.prepare("UPDATE reserva SET estado_reserva = 'Cancelada' WHERE id = ?").run(cancelada);

    const confirmar = await request(app).post(`/reservas/${cancelada}/confirmar`);
    expect(confirmar.status).toBe(302);
    expect(mensajeDe(confirmar.headers.location)).toContain('no se encuentra en estado');

    const temporal = idReserva(db, 'BK-HU02-001');
    const cancelar = await request(app).post(`/reservas/${temporal}/cancelar`);
    expect(cancelar.status).toBe(302);
    expect(mensajeDe(cancelar.headers.location)).toContain('no se encuentra en estado');

    db.close();
  });
});
