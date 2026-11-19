import { describe, expect, it } from 'vitest';
import { crearConexion } from '../src/db/conexion';
import { reiniciarDatos } from '../src/db/reset';
import { sembrar } from '../src/db/seed';

describe('Seed de datos de ejemplo', () => {
  it('carga los datos de los escenarios y es idempotente', () => {
    const db = crearConexion(':memory:');

    const primeraCarga = sembrar(db);
    const segundaCarga = sembrar(db);

    expect(primeraCarga).toEqual({ viajes: 6, cupos: 7, reservas: 5 });
    expect(segundaCarga).toEqual(primeraCarga);

    const cupos = db
      .prepare(
        `SELECT cc.tipo_contenedor, cc.cantidad_disponible, po.nombre AS origen, pd.nombre AS destino
         FROM cupo_contenedor cc
         JOIN viaje v ON v.id = cc.viaje_id
         JOIN puerto po ON po.id = v.puerto_origen_id
         JOIN puerto pd ON pd.id = v.puerto_destino_id
         WHERE v.codigo_viaje IN ('VIA-001', 'VIA-002')
         ORDER BY cc.id`,
      )
      .all() as Array<{
      tipo_contenedor: string;
      cantidad_disponible: number;
      origen: string;
      destino: string;
    }>;

    expect(cupos).toEqual([
      {
        tipo_contenedor: '40HQ',
        cantidad_disponible: 25,
        origen: 'San Antonio',
        destino: 'Shanghái',
      },
      {
        tipo_contenedor: '40RF',
        cantidad_disponible: 0,
        origen: 'Valparaíso',
        destino: 'Rotterdam',
      },
    ]);

    db.close();
  });

  it('carga las reservas de ejemplo de HU-02 con sus detalles', () => {
    const db = crearConexion(':memory:');
    sembrar(db);

    const reservas = db
      .prepare(
        `SELECT r.codigo_booking,
                r.estado_reserva,
                r.cantidad_teu,
                v.codigo_viaje,
                v.capacidad_disponible_teu,
                (SELECT COUNT(*) FROM detalle_reserva d WHERE d.reserva_id = r.id) AS detalles
         FROM reserva r
         JOIN viaje v ON v.id = r.viaje_id
         ORDER BY r.codigo_booking`,
      )
      .all() as Array<{
      codigo_booking: string;
      estado_reserva: string;
      cantidad_teu: number;
      codigo_viaje: string;
      capacidad_disponible_teu: number;
      detalles: number;
    }>;

    expect(reservas).toEqual([
      {
        codigo_booking: 'BK-HU02-001',
        estado_reserva: 'Reserva temporal',
        cantidad_teu: 10,
        codigo_viaje: 'VIA-003',
        capacidad_disponible_teu: 50,
        detalles: 1,
      },
      {
        codigo_booking: 'BK-HU02-002',
        estado_reserva: 'Reserva temporal',
        cantidad_teu: 6,
        codigo_viaje: 'VIA-004',
        capacidad_disponible_teu: 4,
        detalles: 1,
      },
      {
        codigo_booking: 'BK-HU02-003',
        estado_reserva: 'Confirmada',
        cantidad_teu: 8,
        codigo_viaje: 'VIA-005',
        capacidad_disponible_teu: 30,
        detalles: 1,
      },
      {
        codigo_booking: 'BK-HU03-001',
        estado_reserva: 'Reserva temporal',
        cantidad_teu: 5,
        codigo_viaje: 'VIA-001',
        capacidad_disponible_teu: 25,
        detalles: 1,
      },
      {
        codigo_booking: 'BK-HU03-002',
        estado_reserva: 'Confirmada',
        cantidad_teu: 5,
        codigo_viaje: 'VIA-006',
        capacidad_disponible_teu: 15,
        detalles: 1,
      },
    ]);

    db.close();
  });

  it('reinicia los datos modificados a su estado inicial', () => {
    const db = crearConexion(':memory:');
    sembrar(db);
    db.prepare("UPDATE reserva SET estado_reserva = 'Cancelada' WHERE codigo_booking = ?").run(
      'BK-HU02-001',
    );
    db.prepare('UPDATE viaje SET capacidad_disponible_teu = ? WHERE codigo_viaje = ?').run(
      1,
      'VIA-003',
    );

    const resumen = reiniciarDatos(db);

    expect(resumen).toEqual({ viajes: 6, cupos: 7, reservas: 5 });
    expect(
      db.prepare('SELECT estado_reserva FROM reserva WHERE codigo_booking = ?').get('BK-HU02-001'),
    ).toEqual({ estado_reserva: 'Reserva temporal' });
    expect(
      db
        .prepare('SELECT capacidad_disponible_teu FROM viaje WHERE codigo_viaje = ?')
        .get('VIA-003'),
    ).toEqual({ capacidad_disponible_teu: 50 });

    db.close();
  });
});
