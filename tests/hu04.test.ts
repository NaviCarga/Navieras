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

  // ajuste-hu-04-lista-espera — escenarios de sobrecupo y lista de espera (Buque Austral, 100 TEU)
  function solicitarTEU(app: ReturnType<typeof crearApp>, db: BaseDatos, codigoViaje: string, rut: string, teu: number) {
    return request(app).post('/booking').type('form').send({
      empresaId: String(empresaPorRut(db, rut)),
      viajeId: String(viajePorCodigo(db, codigoViaje)),
      tipoMercancia: 'Carga general',
      numeroContrato: 'CT-2026-900',
      tipoContenedor1: '20GP',
      cantidad1: String(teu),
      peso1: '5',
    });
  }

  function capacidadTotalBuque(db: BaseDatos, codigoViaje: string): number {
    return (
      db
        .prepare(
          'SELECT b.capacidad_total_teu AS total FROM viaje v JOIN buque b ON b.id = v.buque_id WHERE v.codigo_viaje = ?',
        )
        .get(codigoViaje) as { total: number }
    ).total;
  }

  function enLista(db: BaseDatos, codigoViaje: string): Array<{ codigo_booking: string; posicion: number }> {
    return db
      .prepare(
        `SELECT r.codigo_booking, sr.posicion_lista_espera AS posicion
         FROM reserva r
         JOIN viaje v ON v.id = r.viaje_id
         JOIN sobre_reserva sr ON sr.reserva_id = r.id
         WHERE v.codigo_viaje = ? AND r.estado_reserva = 'En lista de espera'
         ORDER BY sr.posicion_lista_espera`,
      )
      .all(codigoViaje) as Array<{ codigo_booking: string; posicion: number }>;
  }

  function ultimaReserva(db: BaseDatos) {
    return db
      .prepare('SELECT id, codigo_booking, estado_reserva FROM reserva ORDER BY id DESC LIMIT 1')
      .get() as { id: number; codigo_booking: string; estado_reserva: string };
  }

  it('HU-04 · Solicitud dentro del tope de sobrecupo queda en lista de espera', async () => {
    const { app, db } = appConDatos();
    // Dado un viaje de un buque de 100 TEUs, con capacidad disponible 0 y sin reservas en lista de espera
    expect(capacidadTotalBuque(db, 'VIA-007')).toBe(100);
    expect(inventario(db, 'VIA-007', '20GP')).toEqual({ teus: 0, cupos: 0 });
    expect(enLista(db, 'VIA-007')).toEqual([]);

    // Cuando el exportador registra una solicitud por 3 TEUs
    const respuesta = await solicitarTEU(app, db, 'VIA-007', '76.111.111-1', 3);

    // Entonces la reserva se registra "En lista de espera" con un código Booking
    expect(respuesta.status).toBe(302);
    const reserva = ultimaReserva(db);
    expect(reserva.estado_reserva).toBe('En lista de espera');
    expect(reserva.codigo_booking).toMatch(/^BK-\d{4}-\d{3}$/);
    // Y queda en la posición 1 de la lista de espera del viaje
    expect(enLista(db, 'VIA-007')).toEqual([{ codigo_booking: reserva.codigo_booking, posicion: 1 }]);
    // Y la capacidad disponible del viaje se mantiene en 0 TEUs
    expect(inventario(db, 'VIA-007', '20GP')).toEqual({ teus: 0, cupos: 0 });
    // Y se informa al exportador el estado "En lista de espera" y su posición
    expect(respuesta.headers.location).toBe(`/booking/${reserva.id}/comprobante`);
    const comprobante = await request(app).get(respuesta.headers.location!);
    expect(comprobante.text).toContain('En lista de espera');
    expect(comprobante.text).toContain('Posición 1');
    expect(comprobante.text).toContain(reserva.codigo_booking);
  });

  it('HU-04 · Solicitud sobre el tope de sobrecupo se rechaza automáticamente', async () => {
    const { app, db } = appConDatos();
    expect(capacidadTotalBuque(db, 'VIA-007')).toBe(100);
    expect(enLista(db, 'VIA-007')).toEqual([]);

    // Cuando el exportador registra una solicitud por 4 TEUs
    const respuesta = await solicitarTEU(app, db, 'VIA-007', '76.111.111-1', 4);

    // Entonces la solicitud cambia a estado "Rechazada"
    expect(respuesta.status).toBe(200);
    expect(ultimaReserva(db).estado_reserva).toBe('Rechazada');
    // Y se informa que supera el tope de sobrecupo del viaje
    expect(respuesta.text).toContain('Rechazada');
    expect(respuesta.text).toContain('supera el tope de sobrecupo del viaje');
    // Y la capacidad disponible se mantiene en 0 TEUs sin descontar cupos
    expect(inventario(db, 'VIA-007', '20GP')).toEqual({ teus: 0, cupos: 0 });
    expect(enLista(db, 'VIA-007')).toEqual([]);
  });

  it('HU-04 · Solicitud rechazada por tope de sobrecupo compartido con la lista de espera', async () => {
    const { app, db } = appConDatos();
    // Dado un viaje de 100 TEUs con D = 0 y una reserva "En lista de espera" de 3 TEUs
    expect(capacidadTotalBuque(db, 'VIA-008')).toBe(100);
    expect(enLista(db, 'VIA-008')).toEqual([{ codigo_booking: 'BK-LE-001', posicion: 1 }]);

    // Cuando otro exportador registra una solicitud por 1 TEU
    const respuesta = await solicitarTEU(app, db, 'VIA-008', '78.333.333-3', 1);

    // Entonces la solicitud cambia a "Rechazada" porque el sobrecupo acumulado de 4 TEUs supera el tope de 3
    expect(respuesta.status).toBe(200);
    expect(ultimaReserva(db).estado_reserva).toBe('Rechazada');
    expect(respuesta.text).toContain('sobrecupo acumulado de 4 TEUs');
    expect(respuesta.text).toContain('tope de sobrecupo de 3 TEUs');
    // Y la reserva de 3 TEUs se mantiene "En lista de espera" en la posición 1
    expect(enLista(db, 'VIA-008')).toEqual([{ codigo_booking: 'BK-LE-001', posicion: 1 }]);
    // Y la capacidad disponible se mantiene en 0 TEUs sin descontar cupos
    expect(inventario(db, 'VIA-008', '20GP')).toEqual({ teus: 0, cupos: 0 });
  });

  it('HU-04 · Consulta del estado y la posición de una reserva en lista de espera', async () => {
    const { app, db } = appConDatos();
    // Dado que el exportador tiene una reserva "En lista de espera" en la posición 2
    expect(enLista(db, 'VIA-009')).toEqual([
      { codigo_booking: 'BK-LE-002', posicion: 1 },
      { codigo_booking: 'BK-LE-003', posicion: 2 },
    ]);

    // Cuando el exportador consulta el estado de su reserva
    const respuesta = await request(app).get('/booking/estado').query({ codigo: 'BK-LE-003' });

    // Entonces se muestra el estado "En lista de espera"
    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('Estado: En lista de espera');
    // Y se muestra la posición 2 en la lista de espera del viaje
    expect(respuesta.text).toContain('Posición 2 en la lista de espera del viaje');
    expect(respuesta.text).toContain('VIA-009');
  });

  it('HU-04 · Reserva en lista de espera vence al llegar la fecha de zarpe', async () => {
    const { app, db } = appConDatos();
    // Dado que el exportador tiene una reserva "En lista de espera" de 3 TEUs en un viaje con D = 0
    // (VIA-012 zarpa el 2026-11-25; se fija la fecha en el pasado para que la prueba no dependa del día)
    db.prepare("UPDATE viaje SET fecha_zarpe = '2026-01-01' WHERE codigo_viaje = 'VIA-012'").run();
    const antes = db
      .prepare("SELECT id, estado_reserva, cantidad_teu FROM reserva WHERE codigo_booking = 'BK-LE-008'")
      .get() as { id: number; estado_reserva: string; cantidad_teu: number };
    expect(antes).toMatchObject({ estado_reserva: 'En lista de espera', cantidad_teu: 3 });
    expect(inventario(db, 'VIA-012', '20GP')).toEqual({ teus: 0, cupos: 0 });

    // Cuando llega la fecha de zarpe sin que se haya liberado cupo (se procesa al cargar una pantalla)
    const pantalla = await request(app).get('/reservas');
    expect(pantalla.status).toBe(200);

    // Entonces la reserva cambia a estado "Vencida"
    expect(
      db.prepare('SELECT estado_reserva FROM reserva WHERE id = ?').get(antes.id),
    ).toEqual({ estado_reserva: 'Vencida' });
    // Y deja de figurar en la lista de espera del viaje
    expect(enLista(db, 'VIA-012')).toEqual([]);
    expect(
      db.prepare('SELECT posicion_lista_espera FROM sobre_reserva WHERE reserva_id = ?').get(antes.id),
    ).toEqual({ posicion_lista_espera: null });
    // Y se notifica al exportador que su reserva quedó "Vencida" por el zarpe del viaje
    const notificacion = db
      .prepare(
        "SELECT destinatario_tipo, mensaje FROM notificacion WHERE reserva_id = ? AND tipo = 'vencimiento_lista_espera'",
      )
      .get(antes.id) as { destinatario_tipo: string; mensaje: string };
    expect(notificacion.destinatario_tipo).toBe('exportador');
    expect(notificacion.mensaje).toContain('"Vencida" por el zarpe del viaje');
  });
});
