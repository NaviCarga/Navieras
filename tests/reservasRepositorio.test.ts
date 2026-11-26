import { describe, expect, it } from 'vitest';
import { crearConexion } from '../src/db/conexion';
import {
  crearReserva,
  listarListaEspera,
  listarReservas,
  obtenerReserva,
  obtenerReservaPorCodigo,
  registrarSobreReserva,
  renumerarLista,
  salirDeLista,
  teuEnListaEspera,
} from '../src/dominio/repositorios';

function prepararBase() {
  const db = crearConexion(':memory:');
  db.prepare(
    'INSERT INTO buque (codigo_imo, nombre, capacidad_total_teu, naviera_operadora) VALUES (?, ?, ?, ?)',
  ).run('IMO-REPO', 'Buque Repositorio', 100, 'Naviera Guerrero');
  db.prepare(
    'INSERT INTO puerto (codigo_unlocode, nombre, pais, zona_geografica) VALUES (?, ?, ?, ?)',
  ).run('P-REPO-OR', 'Puerto Origen', 'Chile', 'Sudamérica');
  db.prepare(
    'INSERT INTO puerto (codigo_unlocode, nombre, pais, zona_geografica) VALUES (?, ?, ?, ?)',
  ).run('P-REPO-DE', 'Puerto Destino', 'China', 'Asia-Pacífico');
  db.prepare(
    `INSERT INTO viaje (codigo_viaje, buque_id, puerto_origen_id, puerto_destino_id, fecha_zarpe, fecha_arribo_estimada, capacidad_disponible_teu, estado_viaje)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run('VIA-REPO', 1, 1, 2, '2027-01-10', '2027-02-10', 50, 'Programado');
  db.prepare(
    'INSERT INTO empresa_exportadora (rut, razon_social, correo_contacto, estado_comercial) VALUES (?, ?, ?, ?)',
  ).run('76.000.001-1', 'Exportadora Repositorio', 'repo@example.com', 'Activa');
  return db;
}

describe('Repositorio de reservas', () => {
  it('crea una reserva y la recupera con sus detalles y su empresa', () => {
    const db = prepararBase();

    const creada = crearReserva(db, {
      codigoBooking: 'BK-REPO-001',
      empresaExportadoraId: 1,
      viajeId: 1,
      fechaSolicitud: '2026-11-01',
      cantidadTEU: 10,
      tipoMercancia: 'Carga general',
      plazoMaximoCancelacion: '2099-01-01',
      estadoReserva: 'Reserva temporal',
      detalles: [
        { tipoContenedor: '40HQ', cantidadSolicitada: 6, pesoEstimadoTon: 12 },
        { tipoContenedor: '20GP', cantidadSolicitada: 4, pesoEstimadoTon: 8 },
      ],
    });

    const recuperada = obtenerReserva(db, creada.id);
    expect(recuperada).toBeDefined();
    expect(recuperada?.codigoBooking).toBe('BK-REPO-001');
    expect(recuperada?.empresa.razonSocial).toBe('Exportadora Repositorio');
    expect(recuperada?.viaje.codigoViaje).toBe('VIA-REPO');
    expect(recuperada?.puertoOrigen).toBe('Puerto Origen');
    expect(recuperada?.puertoDestino).toBe('Puerto Destino');
    expect(recuperada?.detalles).toHaveLength(2);
    expect(recuperada?.detalles.map((detalle) => detalle.tipoContenedor)).toEqual([
      '40HQ',
      '20GP',
    ]);

    const listado = listarReservas(db);
    expect(listado).toHaveLength(1);
    expect(listado[0].detalles).toHaveLength(2);

    db.close();
  });

  it('gestiona la lista de espera: posición al final, E, salida y renumeración', () => {
    const db = prepararBase();
    const crear = (codigo: string, teu: number) =>
      crearReserva(db, {
        codigoBooking: codigo,
        empresaExportadoraId: 1,
        viajeId: 1,
        fechaSolicitud: '2026-11-01',
        cantidadTEU: teu,
        tipoMercancia: 'Carga general',
        plazoMaximoCancelacion: '2099-01-01',
        estadoReserva: 'En lista de espera',
        detalles: [{ tipoContenedor: '20GP', cantidadSolicitada: teu, pesoEstimadoTon: 1 }],
      });

    const a = crear('BK-LE-A', 1);
    const b = crear('BK-LE-B', 1);
    const c = crear('BK-LE-C', 1);
    expect(registrarSobreReserva(db, a.id, 1)).toBe(1);
    expect(registrarSobreReserva(db, b.id, 1)).toBe(2);
    expect(registrarSobreReserva(db, c.id, 1)).toBe(3);
    expect(teuEnListaEspera(db, 1)).toBe(3);

    db.prepare("UPDATE reserva SET estado_reserva = 'Cancelada' WHERE id = ?").run(a.id);
    salirDeLista(db, a.id);
    renumerarLista(db, 1);

    expect(teuEnListaEspera(db, 1)).toBe(2);
    expect(obtenerReserva(db, a.id)?.posicionListaEspera).toBeNull();
    expect(obtenerReserva(db, a.id)?.excesoSolicitadoTEU).toBe(1);
    expect(listarListaEspera(db, 1).map((r) => [r.codigoBooking, r.posicionListaEspera])).toEqual([
      ['BK-LE-B', 1],
      ['BK-LE-C', 2],
    ]);
    expect(obtenerReservaPorCodigo(db, 'BK-LE-C')?.posicionListaEspera).toBe(2);
    expect(obtenerReservaPorCodigo(db, 'NO-EXISTE')).toBeUndefined();

    db.prepare('DELETE FROM reserva WHERE id = ?').run(b.id);
    expect(
      db.prepare('SELECT COUNT(*) AS total FROM sobre_reserva WHERE reserva_id = ?').get(b.id),
    ).toEqual({ total: 0 });

    db.close();
  });
});
