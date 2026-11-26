import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app';
import { crearConexion } from '../src/db/conexion';
import { sembrar } from '../src/db/seed';

describe('Pantalla de disponibilidad', () => {
  it('muestra buque, fechas y cupos con una consulta exitosa', async () => {
    const db = crearConexion(':memory:');
    sembrar(db);
    const app = crearApp(db);

    const respuesta = await request(app).get('/disponibilidad').query({
      origen: 'San Antonio',
      destino: 'Shanghái',
      tipoContenedor: '40HQ',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('Buque Andino');
    expect(respuesta.text).toContain('2026-11-20');
    expect(respuesta.text).toContain('2026-12-18');
    expect(respuesta.text).toContain('25');
    expect(respuesta.text).toContain('40HQ');

    db.close();
  });

  it('muestra el aviso de falta de capacidad para el tipo solicitado', async () => {
    const db = crearConexion(':memory:');
    sembrar(db);
    const app = crearApp(db);

    const respuesta = await request(app).get('/disponibilidad').query({
      origen: 'Valparaíso',
      destino: 'Rotterdam',
      tipoContenedor: '40RF',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('Sin capacidad disponible para 40RF');
    expect(respuesta.text).toContain('Sin confirmación inmediata para este tipo');
    expect(respuesta.text).not.toContain('No se habilita para nuevas solicitudes');

    db.close();
  });
});
