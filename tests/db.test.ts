import { describe, expect, it } from 'vitest';
import { crearConexion, type BaseDatos } from '../src/db/conexion';

function nombresDeTablas(db: BaseDatos): string[] {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>
  ).map((fila) => fila.name);
}

describe('Migración 001', () => {
  it('crea las tablas del modelo y las de soporte', () => {
    const db = crearConexion(':memory:');
    const tablas = nombresDeTablas(db);

    for (const tabla of [
      'buque',
      'puerto',
      'viaje',
      'cupo_contenedor',
      'integraciones_log',
      'schema_migrations',
    ]) {
      expect(tablas).toContain(tabla);
    }

    const migraciones = db.prepare('SELECT nombre FROM schema_migrations').all() as Array<{
      nombre: string;
    }>;
    expect(migraciones).toContainEqual({ nombre: '001_crear_tablas.sql' });

    db.close();
  });

  it('aplica ON DELETE CASCADE en cupo_contenedor.viaje_id', () => {
    const db = crearConexion(':memory:');
    const claves = db.prepare("PRAGMA foreign_key_list('cupo_contenedor')").all() as Array<{
      table: string;
      from: string;
      to: string;
      on_delete: string;
    }>;
    const clave = claves.find((fila) => fila.from === 'viaje_id' && fila.table === 'viaje');

    expect(clave?.on_delete).toBe('CASCADE');
    db.close();
  });

  it('impide duplicar el mismo tipo de contenedor en un viaje', () => {
    const db = crearConexion(':memory:');

    db.prepare(
      'INSERT INTO buque (codigo_imo, nombre, capacidad_total_teu, naviera_operadora) VALUES (?, ?, ?, ?)',
    ).run('IMO-PRUEBA', 'Buque de prueba', 100, 'Naviera de prueba');
    db.prepare(
      'INSERT INTO puerto (codigo_unlocode, nombre, pais, zona_geografica) VALUES (?, ?, ?, ?)',
    ).run('P-ORIGEN', 'Origen', 'Chile', 'Sudamérica');
    db.prepare(
      'INSERT INTO puerto (codigo_unlocode, nombre, pais, zona_geografica) VALUES (?, ?, ?, ?)',
    ).run('P-DESTINO', 'Destino', 'China', 'Asia-Pacífico');
    db.prepare(
      `INSERT INTO viaje (codigo_viaje, buque_id, puerto_origen_id, puerto_destino_id, fecha_zarpe, fecha_arribo_estimada, capacidad_disponible_teu, estado_viaje)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('VIAJE-PRUEBA', 1, 1, 2, '2026-11-20', '2026-12-18', 25, 'Programado');

    const insertarCupo = db.prepare(
      'INSERT INTO cupo_contenedor (viaje_id, tipo_contenedor, cantidad_total, cantidad_disponible) VALUES (?, ?, ?, ?)',
    );
    insertarCupo.run(1, '40HQ', 25, 25);

    expect(() => insertarCupo.run(1, '40HQ', 10, 10)).toThrow();
    db.close();
  });
});

describe('Migración 002', () => {
  function prepararBase(db: BaseDatos): void {
    db.prepare(
      'INSERT INTO buque (codigo_imo, nombre, capacidad_total_teu, naviera_operadora) VALUES (?, ?, ?, ?)',
    ).run('IMO-HU02', 'Buque HU-02', 100, 'Naviera Guerrero');
    db.prepare(
      'INSERT INTO puerto (codigo_unlocode, nombre, pais, zona_geografica) VALUES (?, ?, ?, ?)',
    ).run('P-HU02-OR', 'Puerto Origen', 'Chile', 'Sudamérica');
    db.prepare(
      'INSERT INTO puerto (codigo_unlocode, nombre, pais, zona_geografica) VALUES (?, ?, ?, ?)',
    ).run('P-HU02-DE', 'Puerto Destino', 'China', 'Asia-Pacífico');
    db.prepare(
      `INSERT INTO viaje (codigo_viaje, buque_id, puerto_origen_id, puerto_destino_id, fecha_zarpe, fecha_arribo_estimada, capacidad_disponible_teu, estado_viaje)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('VIA-HU02', 1, 1, 2, '2027-01-10', '2027-02-10', 50, 'Programado');
    db.prepare(
      'INSERT INTO empresa_exportadora (rut, razon_social, correo_contacto, estado_comercial) VALUES (?, ?, ?, ?)',
    ).run('76.000.000-0', 'Exportadora de prueba', 'prueba@example.com', 'Activa');
    db.prepare(
      `INSERT INTO reserva (codigo_booking, empresa_exportadora_id, viaje_id, fecha_solicitud, cantidad_teu, tipo_mercancia, plazo_maximo_cancelacion, estado_reserva)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('BK-HU02-PRUEBA', 1, 1, '2026-11-01', 10, 'Carga general', '2099-01-01', 'Reserva temporal');
    db.prepare(
      'INSERT INTO detalle_reserva (reserva_id, tipo_contenedor, cantidad_solicitada, peso_estimado_ton) VALUES (?, ?, ?, ?)',
    ).run(1, '40HQ', 10, 12.5);
  }

  it('crea las tablas de reservas y aplica la cascada en detalle_reserva', () => {
    const db = crearConexion(':memory:');
    const tablas = nombresDeTablas(db);

    for (const tabla of ['empresa_exportadora', 'reserva', 'detalle_reserva']) {
      expect(tablas).toContain(tabla);
    }

    const claves = db.prepare("PRAGMA foreign_key_list('detalle_reserva')").all() as Array<{
      table: string;
      from: string;
      on_delete: string;
    }>;
    const clave = claves.find((fila) => fila.from === 'reserva_id' && fila.table === 'reserva');
    expect(clave?.on_delete).toBe('CASCADE');

    prepararBase(db);
    db.prepare('DELETE FROM reserva WHERE id = 1').run();
    const detalles = db.prepare('SELECT COUNT(*) AS total FROM detalle_reserva').get() as {
      total: number;
    };
    expect(detalles.total).toBe(0);

    db.close();
  });

  it('impide duplicar rut y codigo_booking, y rechaza cantidades negativas', () => {
    const db = crearConexion(':memory:');
    prepararBase(db);

    expect(() =>
      db
        .prepare(
          'INSERT INTO empresa_exportadora (rut, razon_social, correo_contacto, estado_comercial) VALUES (?, ?, ?, ?)',
        )
        .run('76.000.000-0', 'Otra exportadora', 'otra@example.com', 'Activa'),
    ).toThrow();

    expect(() =>
      db
        .prepare(
          `INSERT INTO reserva (codigo_booking, empresa_exportadora_id, viaje_id, fecha_solicitud, cantidad_teu, tipo_mercancia, plazo_maximo_cancelacion, estado_reserva)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run('BK-HU02-PRUEBA', 1, 1, '2026-11-02', 5, 'Carga general', '2099-01-01', 'Reserva temporal'),
    ).toThrow();

    expect(() =>
      db
        .prepare(
          `INSERT INTO reserva (codigo_booking, empresa_exportadora_id, viaje_id, fecha_solicitud, cantidad_teu, tipo_mercancia, plazo_maximo_cancelacion, estado_reserva)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run('BK-NEGATIVA', 1, 1, '2026-11-02', -1, 'Carga general', '2099-01-01', 'Reserva temporal'),
    ).toThrow();

    db.close();
  });
});
