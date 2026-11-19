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

function datosValidos(campos: Record<string, string> = {}): Record<string, string> {
  return {
    empresaId: '1',
    viajeId: '3',
    tipoMercancia: 'Carga general',
    numeroContrato: 'CT-2026-500',
    tipoContenedor1: '20GP',
    cantidad1: '5',
    peso1: '9',
    ...campos,
  };
}

describe('HU-04 · rutas de booking', () => {
  it('muestra el formulario con las empresas y el estado comercial', async () => {
    const { app } = appConDatos();

    const respuesta = await request(app).get('/booking');

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('Solicitud de reserva (Booking)');
    expect(respuesta.text).toContain('Carga Rápida SpA');
    expect(respuesta.text).toContain('Bloqueada');
  });

  it('preselecciona el viaje indicado en la consulta', async () => {
    const { app, db } = appConDatos();
    const viaje = db.prepare("SELECT id FROM viaje WHERE codigo_viaje = 'VIA-003'").get() as {
      id: number;
    };

    const respuesta = await request(app).get('/booking?viaje=VIA-003');

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain(`value="${viaje.id}" selected`);
  });

  it('vuelve a mostrar el formulario con los errores de validación', async () => {
    const { app, db } = appConDatos();

    const respuesta = await request(app).post('/booking').type('form').send({
      empresaId: '1',
      viajeId: '3',
      tipoMercancia: '',
      numeroContrato: '',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('Revisa los datos de la solicitud');
    expect(respuesta.text).toContain('Indique el tipo de mercancía');
    const total = db.prepare('SELECT COUNT(*) AS total FROM reserva').get() as { total: number };
    expect(total.total).toBe(5);
  });

  it('informa la falta de cupo sin crear la reserva', async () => {
    const { app, db } = appConDatos();

    const respuesta = await request(app)
      .post('/booking')
      .type('form')
      .send(datosValidos({ viajeId: '4', cantidad1: '6' }));

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('No hay cupo suficiente');
    const total = db.prepare('SELECT COUNT(*) AS total FROM reserva').get() as { total: number };
    expect(total.total).toBe(5);
  });

  it('redirige al comprobante cuando la reserva queda confirmada', async () => {
    const { app } = appConDatos();

    const respuesta = await request(app).post('/booking').type('form').send(datosValidos());

    expect(respuesta.status).toBe(302);
    expect(respuesta.headers.location).toMatch(/^\/booking\/\d+\/comprobante$/);

    const comprobante = await request(app).get(respuesta.headers.location!);
    expect(comprobante.status).toBe(200);
    expect(comprobante.text).toContain('Comprobante de reserva');
    expect(comprobante.text).toContain('BK-2026-001');
    expect(comprobante.text).toContain('Confirmada');
    expect(comprobante.text).toContain('CT-2026-500');
    expect(comprobante.text).toContain('2027-01-03');
  });

  it('responde 404 si el comprobante no existe', async () => {
    const { app } = appConDatos();

    const respuesta = await request(app).get('/booking/9999/comprobante');
    expect(respuesta.status).toBe(404);
  });
});
