// ajuste-hu-04-lista-espera — pruebas unitarias de la regla de sobrecupo y de las transiciones
import { describe, expect, it } from 'vitest';
import { crearConexion, type BaseDatos } from '../src/db/conexion';
import { sembrar } from '../src/db/seed';
import { obtenerReservaPorCodigo, registrarSobreReserva } from '../src/dominio/repositorios';
import { cancelarReserva, confirmarReserva } from '../src/servicios/inventario';
import {
  calcularTope,
  cerrarListasPorZarpe,
  evaluarSobrecupo,
} from '../src/servicios/listaEspera';

function baseConDatos(): BaseDatos {
  const db = crearConexion(':memory:');
  sembrar(db);
  return db;
}

function reserva(db: BaseDatos, codigo: string) {
  const encontrada = obtenerReservaPorCodigo(db, codigo);
  if (!encontrada) throw new Error(`No existe ${codigo}`);
  return encontrada;
}

function capacidadViaje(db: BaseDatos, codigoViaje: string): number {
  return (
    db
      .prepare('SELECT capacidad_disponible_teu AS d FROM viaje WHERE codigo_viaje = ?')
      .get(codigoViaje) as { d: number }
  ).d;
}

describe('Regla de sobrecupo (evaluarSobrecupo)', () => {
  const cupos20GP = (disponible: number) => [{ tipoContenedor: '20GP', cantidadDisponible: disponible }];

  it('calcula el tope como el 3 % entero de la capacidad total', () => {
    expect(calcularTope(100)).toBe(3);
    expect(calcularTope(4000)).toBe(120);
    expect(calcularTope(5000)).toBe(150);
  });

  it('usa un límite inclusivo: sobrecupo 3 entra a la lista y 4 se rechaza', () => {
    const base = { capacidadDisponibleTEU: 0, cupos: cupos20GP(0), teuEnLista: 0, capacidadTotalTEU: 100 };
    const tres = evaluarSobrecupo({ ...base, solicitados: new Map([['20GP', 3]]) });
    const cuatro = evaluarSobrecupo({ ...base, solicitados: new Map([['20GP', 4]]) });

    expect(tres).toMatchObject({ cabe: false, sobrecupo: 3, tope: 3, dentroDelTope: true });
    expect(cuatro).toMatchObject({ cabe: false, sobrecupo: 4, tope: 3, dentroDelTope: false });
  });

  it('D_efectiva es el menor valor entre la capacidad del viaje y los cupos de los tipos solicitados', () => {
    const evaluacion = evaluarSobrecupo({
      solicitados: new Map([['20GP', 5]]),
      capacidadDisponibleTEU: 50,
      cupos: cupos20GP(3),
      teuEnLista: 0,
      capacidadTotalTEU: 100,
    });
    expect(evaluacion).toMatchObject({ q: 5, dEfectiva: 3, cabe: false, exceso: 2, dentroDelTope: true });
  });

  it('un tipo sin fila de cupo cuenta con 0 disponibles', () => {
    const evaluacion = evaluarSobrecupo({
      solicitados: new Map([['40RF', 2]]),
      capacidadDisponibleTEU: 50,
      cupos: cupos20GP(10),
      teuEnLista: 0,
      capacidadTotalTEU: 100,
    });
    expect(evaluacion).toMatchObject({ dEfectiva: 0, cabe: false, exceso: 2 });
  });

  it('supuesto S-1: con varios tipos y q ≤ D_efectiva, el exceso es lo que falta por tipo', () => {
    const evaluacion = evaluarSobrecupo({
      solicitados: new Map([
        ['20GP', 2],
        ['40HQ', 1],
      ]),
      capacidadDisponibleTEU: 50,
      cupos: [
        { tipoContenedor: '20GP', cantidadDisponible: 0 },
        { tipoContenedor: '40HQ', cantidadDisponible: 5 },
      ],
      teuEnLista: 0,
      capacidadTotalTEU: 100,
    });
    expect(evaluacion).toMatchObject({ q: 3, dEfectiva: 5, cabe: false, exceso: 2, sobrecupo: 2 });
  });

  it('suma E (TEUs ya en lista) al exceso de la nueva solicitud', () => {
    const evaluacion = evaluarSobrecupo({
      solicitados: new Map([['20GP', 1]]),
      capacidadDisponibleTEU: 0,
      cupos: cupos20GP(0),
      teuEnLista: 3,
      capacidadTotalTEU: 100,
    });
    expect(evaluacion).toMatchObject({ sobrecupo: 4, tope: 3, dentroDelTope: false });
  });
});

describe('Transiciones de la lista de espera', () => {
  it('HU-02 · Confirmación con capacidad insuficiente dentro del tope pasa a lista de espera (EST-01)', () => {
    const db = baseConDatos();
    const temporal = reserva(db, 'BK-HU02-002');
    db.prepare('UPDATE detalle_reserva SET cantidad_solicitada = 6 WHERE reserva_id = ?').run(temporal.id);
    db.prepare('UPDATE reserva SET cantidad_teu = 6 WHERE id = ?').run(temporal.id);

    const resultado = confirmarReserva(db, temporal.id);

    expect(resultado.tipo).toBe('lista_espera');
    if (resultado.tipo === 'lista_espera') {
      expect(resultado.evaluacion).toMatchObject({ sobrecupo: 2, tope: 3 });
    }
    expect(reserva(db, 'BK-HU02-002')).toMatchObject({
      estadoReserva: 'En lista de espera',
      posicionListaEspera: 1,
    });
    expect(capacidadViaje(db, 'VIA-004')).toBe(4);
    db.close();
  });

  it('se confirma la primera reserva de la lista que cabe completa (decisión confirmada)', () => {
    const db = baseConDatos();
    // VIA-010: confirmada 8 + espera 3 (pos. 1). Se agrega una espera de 2 TEU en la pos. 2
    // y se reduce la confirmada a 2 TEU para que solo quepa la de la posición 2.
    const confirmada = reserva(db, 'BK-LE-004');
    db.prepare('UPDATE detalle_reserva SET cantidad_solicitada = 2 WHERE reserva_id = ?').run(confirmada.id);
    db.prepare('UPDATE reserva SET cantidad_teu = 2 WHERE id = ?').run(confirmada.id);
    db.prepare(
      `UPDATE cupo_contenedor SET cantidad_total = 2
       WHERE viaje_id = (SELECT id FROM viaje WHERE codigo_viaje = 'VIA-010')`,
    ).run();
    const segunda = db
      .prepare(
        `INSERT INTO reserva (codigo_booking, empresa_exportadora_id, viaje_id, fecha_solicitud, cantidad_teu, tipo_mercancia, numero_contrato, plazo_maximo_cancelacion, estado_reserva)
         SELECT 'BK-LE-PRUEBA', empresa_exportadora_id, viaje_id, fecha_solicitud, 2, tipo_mercancia, 'CT-PRUEBA', plazo_maximo_cancelacion, 'En lista de espera'
         FROM reserva WHERE codigo_booking = 'BK-LE-005'`,
      )
      .run();
    const segundaId = Number(segunda.lastInsertRowid);
    db.prepare(
      "INSERT INTO detalle_reserva (reserva_id, tipo_contenedor, cantidad_solicitada, peso_estimado_ton) VALUES (?, '20GP', 2, 1)",
    ).run(segundaId);
    expect(registrarSobreReserva(db, segundaId, 2)).toBe(2);

    const resultado = cancelarReserva(db, confirmada.id, undefined, '2027-01-01');

    expect(resultado.tipo).toBe('cancelada');
    if (resultado.tipo === 'cancelada') {
      expect(resultado.confirmadaDesdeLista?.reserva.codigoBooking).toBe('BK-LE-PRUEBA');
    }
    expect(reserva(db, 'BK-LE-PRUEBA')).toMatchObject({ estadoReserva: 'Confirmada', posicionListaEspera: null });
    expect(reserva(db, 'BK-LE-005')).toMatchObject({ estadoReserva: 'En lista de espera', posicionListaEspera: 1 });
    expect(capacidadViaje(db, 'VIA-010')).toBe(0);
    db.close();
  });

  it('el cierre por zarpe es idempotente y notifica una sola vez', () => {
    const db = baseConDatos();

    expect(cerrarListasPorZarpe(db, '2026-11-26')).toBe(1); // BK-LE-008 (VIA-012 zarpó el 2026-11-25)
    expect(cerrarListasPorZarpe(db, '2026-11-26')).toBe(0);

    const vencida = reserva(db, 'BK-LE-008');
    expect(vencida).toMatchObject({ estadoReserva: 'Vencida', posicionListaEspera: null });
    const notificaciones = db
      .prepare("SELECT COUNT(*) AS total FROM notificacion WHERE reserva_id = ? AND tipo = 'vencimiento_lista_espera'")
      .get(vencida.id);
    expect(notificaciones).toEqual({ total: 1 });
    // Las listas de viajes que aún no zarpan no cambian
    expect(reserva(db, 'BK-LE-001').estadoReserva).toBe('En lista de espera');
    db.close();
  });
});
