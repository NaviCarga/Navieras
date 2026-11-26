import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app';
import { crearConexion } from '../src/db/conexion';
import { sembrar } from '../src/db/seed';

function appConDatosDeEjemplo() {
  const db = crearConexion(':memory:');
  sembrar(db);
  return { app: crearApp(db), db };
}

describe('HU-01', () => {
  it('HU-01 · Consulta exitosa de itinerarios con cupo disponible según ruta y contenedor', async () => {
    const { app, db } = appConDatosDeEjemplo();

    const respuesta = await request(app).get('/disponibilidad').query({
      origen: 'San Antonio',
      destino: 'Shanghái',
      tipoContenedor: '40HQ',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('Buque Andino');
    expect(respuesta.text).toContain('<th>Zarpe</th>');
    const celdasDelViaje = respuesta.text.match(
      /<td>Buque Andino<\/td>\s*<td>([^<]+)<\/td>/,
    );
    expect(celdasDelViaje?.[1].trim()).toBe('2026-11-20');
    expect(respuesta.text).toContain('2026-12-18');
    expect(respuesta.text).toContain('25 cupos 40HQ');

    db.close();
  });

  it('HU-01 · Consulta de ruta o tipo de contenedor sin cupos disponibles', async () => {
    const { app, db } = appConDatosDeEjemplo();

    const respuesta = await request(app).get('/disponibilidad').query({
      origen: 'Valparaíso',
      destino: 'Rotterdam',
      tipoContenedor: '40RF',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('Buque Pacífico');
    expect(respuesta.text).toContain('Valparaíso');
    expect(respuesta.text).toContain('Rotterdam');
    // Entonces se informa que el viaje no cuenta con capacidad disponible para el tipo solicitado
    expect(respuesta.text).toContain('Sin capacidad disponible para 40RF');
    // Y no se habilita la reserva directa con confirmación inmediata para ese tipo de contenedor
    expect(respuesta.text).toContain('Sin confirmación inmediata para este tipo');
    // Y una solicitud cuyo sobrecupo acumulado no supere el tope puede quedar "En lista de espera"
    expect(respuesta.text).toContain('En lista de espera');
    expect(respuesta.text).toContain('si no supera el tope de sobrecupo');
    expect(respuesta.text).toContain('/booking?viaje=VIA-002');
    expect(respuesta.text).not.toContain('25 cupos 40RF');

    db.close();
  });
});
