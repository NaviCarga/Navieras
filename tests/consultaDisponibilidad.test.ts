import { describe, expect, it } from 'vitest';
import { crearConexion } from '../src/db/conexion';
import { sembrar } from '../src/db/seed';
import { consultarDisponibilidad } from '../src/dominio/repositorios';

describe('Consulta de disponibilidad', () => {
  it('filtra por origen, destino y tipo de contenedor', () => {
    const db = crearConexion(':memory:');
    sembrar(db);

    const viajes = consultarDisponibilidad(db, {
      origen: 'San Antonio',
      destino: 'Shanghái',
      tipoContenedor: '40HQ',
    });

    expect(viajes).toHaveLength(1);
    expect(viajes[0].buqueNombre).toBe('Buque Andino');
    expect(viajes[0].puertoOrigen).toBe('San Antonio');
    expect(viajes[0].puertoDestino).toBe('Shanghái');
    expect(viajes[0].cupos).toEqual([
      {
        id: expect.any(Number),
        viajeId: viajes[0].id,
        tipoContenedor: '40HQ',
        cantidadTotal: 25,
        cantidadDisponible: 25,
      },
    ]);

    db.close();
  });

  it('devuelve cantidadDisponible = 0 cuando no hay cupo para el tipo', () => {
    const db = crearConexion(':memory:');
    sembrar(db);

    const viajes = consultarDisponibilidad(db, {
      origen: 'Valparaíso',
      destino: 'Rotterdam',
      tipoContenedor: '40RF',
    });

    expect(viajes).toHaveLength(1);
    expect(viajes[0].cupos[0].cantidadDisponible).toBe(0);

    db.close();
  });

  it('no devuelve viajes de una ruta cuando el tipo solicitado no existe', () => {
    const db = crearConexion(':memory:');
    sembrar(db);

    const viajes = consultarDisponibilidad(db, {
      origen: 'San Antonio',
      destino: 'Shanghái',
      tipoContenedor: '40RF',
    });

    expect(viajes).toHaveLength(0);

    db.close();
  });
});
