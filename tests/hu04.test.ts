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

function empresaPorRut(db: BaseDatos, rut: string): number {
  return (db.prepare('SELECT id FROM empresa_exportadora WHERE rut = ?').get(rut) as { id: number })
    .id;
}

function viajePorCodigo(db: BaseDatos, codigoViaje: string): number {
  return (db.prepare('SELECT id FROM viaje WHERE codigo_viaje = ?').get(codigoViaje) as { id: number })
    .id;
}

function inventario(
  db: BaseDatos,
  codigoViaje: string,
  tipoContenedor: string,
): { teus: number; cupos: number } {
  const viaje = db
    .prepare('SELECT id, capacidad_disponible_teu AS teus FROM viaje WHERE codigo_viaje = ?')
    .get(codigoViaje) as { id: number; teus: number };
  const cupo = db
    .prepare(
      'SELECT cantidad_disponible AS cupos FROM cupo_contenedor WHERE viaje_id = ? AND tipo_contenedor = ?',
    )
    .get(viaje.id, tipoContenedor) as { cupos: number };
  return { teus: viaje.teus, cupos: cupo.cupos };
}

describe('HU-04', () => {
  it('HU-04 · Confirmación exitosa con cliente y carga validados', async () => {
    const { app, db } = appConDatos();
    const empresaId = empresaPorRut(db, '76.111.111-1');
    const viajeId = viajePorCodigo(db, 'VIA-003');

    const respuesta = await request(app).post('/booking').type('form').send({
      empresaId: String(empresaId),
      viajeId: String(viajeId),
      tipoMercancia: 'Carga general',
      numeroContrato: 'CT-2026-700',
      tipoContenedor1: '20GP',
      cantidad1: '5',
      peso1: '9',
    });

    expect(respuesta.status).toBe(302);
    expect(respuesta.headers.location).toMatch(/^\/booking\/\d+\/comprobante$/);

    const reserva = db
      .prepare(
        `SELECT id, codigo_booking, estado_reserva, cantidad_teu, numero_contrato, plazo_maximo_cancelacion
         FROM reserva WHERE codigo_booking = 'BK-2026-001'`,
      )
      .get() as {
      id: number;
      codigo_booking: string;
      estado_reserva: string;
      cantidad_teu: number;
      numero_contrato: string;
      plazo_maximo_cancelacion: string;
    };

    expect(reserva.estado_reserva).toBe('Confirmada');
    expect(reserva.cantidad_teu).toBe(5);
    expect(reserva.numero_contrato).toBe('CT-2026-700');
    expect(reserva.plazo_maximo_cancelacion).toBe('2027-01-03');
    expect(inventario(db, 'VIA-003', '20GP')).toEqual({ teus: 45, cupos: 10 });

    const notificacion = db
      .prepare(
        "SELECT COUNT(*) AS total FROM notificacion WHERE reserva_id = ? AND destinatario_tipo = 'exportador'",
      )
      .get(reserva.id) as { total: number };
    expect(notificacion.total).toBe(1);

    const comprobante = await request(app).get(`/booking/${reserva.id}/comprobante`);
    expect(comprobante.status).toBe(200);
    expect(comprobante.text).toContain('BK-2026-001');
    expect(comprobante.text).toContain('Confirmada');
    expect(comprobante.text).toContain('CT-2026-700');
    expect(comprobante.text).toContain('Exportadora Andina SpA');
  });

  it('HU-04 · Rechazo de solicitud por bloqueo comercial o documental del exportador', async () => {
    const { app, db } = appConDatos();
    const empresaId = empresaPorRut(db, '79.999.999-9');
    const viajeId = viajePorCodigo(db, 'VIA-003');
    const antes = inventario(db, 'VIA-003', '20GP');

    const respuesta = await request(app).post('/booking').type('form').send({
      empresaId: String(empresaId),
      viajeId: String(viajeId),
      tipoMercancia: 'Carga general',
      numeroContrato: 'CT-2026-800',
      tipoContenedor1: '20GP',
      cantidad1: '5',
      peso1: '9',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('Rechazada');
    expect(respuesta.text).toContain('bloqueo');

    const reserva = db
      .prepare(
        "SELECT estado_reserva, numero_contrato, cantidad_teu FROM reserva WHERE codigo_booking = 'BK-2026-001'",
      )
      .get() as { estado_reserva: string; numero_contrato: string; cantidad_teu: number };

    expect(reserva.estado_reserva).toBe('Rechazada');
    expect(reserva.numero_contrato).toBe('CT-2026-800');
    expect(reserva.cantidad_teu).toBe(5);
    expect(inventario(db, 'VIA-003', '20GP')).toEqual(antes);
  });
});
