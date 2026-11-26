// ajuste-hu-04-lista-espera — rutas y pantallas de la lista de espera (tareas 4.2 a 4.4)
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

function estado(db: BaseDatos, codigo: string): string | undefined {
  return obtenerReservaPorCodigo(db, codigo)?.estadoReserva;
}

describe('Consulta de estado (/booking/estado)', () => {
  it('muestra el formulario vacío y avisa si el código no existe', async () => {
    const { app } = appConDatos();

    const vacio = await request(app).get('/booking/estado');
    expect(vacio.status).toBe(200);
    expect(vacio.text).toContain('Consultar el estado de mi reserva');

    const inexistente = await request(app).get('/booking/estado').query({ codigo: 'BK-0000-999' });
    expect(inexistente.text).toContain('No existe una reserva con el código BK-0000-999');
  });

  it('solo permite cancelar desde el exportador las reservas en lista de espera', async () => {
    const { app, db } = appConDatos();
    const confirmada = obtenerReservaPorCodigo(db, 'BK-LE-004')!;

    const respuesta = await request(app).post(`/booking/${confirmada.id}/cancelar`);

    expect(respuesta.status).toBe(302);
    expect(estado(db, 'BK-LE-004')).toBe('Confirmada');
    const mensaje = new URL(respuesta.headers.location!, 'http://x').searchParams.get('mensaje');
    expect(mensaje).toContain('Solo se pueden cancelar desde aquí las reservas "En lista de espera"');
  });
});

describe('Listado de reservas de la Naviera (/reservas)', () => {
  it('muestra la columna de posición y el botón de cierre de listas', async () => {
    const { app } = appConDatos();

    const respuesta = await request(app).get('/reservas');

    expect(respuesta.text).toContain('Posición en lista de espera');
    expect(respuesta.text).toContain('Cerrar listas de espera vencidas');
    expect(respuesta.text).toContain('BK-LE-003');
  });

  it('el botón cierra las listas vencidas e informa cuántas reservas vencieron', async () => {
    const { app, db } = appConDatos();
    db.prepare(
      "UPDATE viaje SET fecha_zarpe = '2026-01-02' WHERE codigo_viaje IN ('VIA-008', 'VIA-012')",
    ).run();

    const primera = await request(app).post('/reservas/cerrar-listas');
    const mensaje = new URL(primera.headers.location!, 'http://x').searchParams.get('mensaje');
    // BK-LE-001 (VIA-008) y BK-LE-008 (VIA-012)
    expect(mensaje).toBe('2 reserva(s) pasaron a "Vencida" por el zarpe del viaje.');
    expect(estado(db, 'BK-LE-001')).toBe('Vencida');

    const segunda = await request(app).post('/reservas/cerrar-listas');
    expect(new URL(segunda.headers.location!, 'http://x').searchParams.get('mensaje')).toBe(
      'No hay reservas en lista de espera de viajes que ya zarparon.',
    );
  });

  it('cancelar una reserva en lista de espera desde /reservas no toca la capacidad', async () => {
    const { app, db } = appConDatos();
    const enEspera = obtenerReservaPorCodigo(db, 'BK-LE-001')!;

    await request(app).post(`/reservas/${enEspera.id}/cancelar`);

    expect(estado(db, 'BK-LE-001')).toBe('Cancelada');
    expect(obtenerReservaPorCodigo(db, 'BK-LE-001')?.viaje.capacidadDisponibleTEU).toBe(0);
  });
});

describe('Vencimiento perezoso al cargar pantallas', () => {
  it.each(['/disponibilidad', '/booking', '/booking/estado'])(
    'abrir %s vence las reservas en espera de viajes ya zarpados',
    async (ruta) => {
      const { app, db } = appConDatos();
      db.prepare("UPDATE viaje SET fecha_zarpe = '2026-01-01' WHERE codigo_viaje = 'VIA-012'").run();
      expect(estado(db, 'BK-LE-008')).toBe('En lista de espera');

      await request(app).get(ruta);

      expect(estado(db, 'BK-LE-008')).toBe('Vencida');
      expect(estado(db, 'BK-LE-001')).toBe('En lista de espera');
    },
  );

  it('abrir el comprobante también procesa el vencimiento', async () => {
    const { app, db } = appConDatos();
    db.prepare("UPDATE viaje SET fecha_zarpe = '2026-01-01' WHERE codigo_viaje = 'VIA-012'").run();
    const reserva = obtenerReservaPorCodigo(db, 'BK-LE-008')!;

    const comprobante = await request(app).get(`/booking/${reserva.id}/comprobante`);

    expect(comprobante.text).toContain('Vencida');
    expect(estado(db, 'BK-LE-008')).toBe('Vencida');
  });
});
