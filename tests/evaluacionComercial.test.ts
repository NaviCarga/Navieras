import { describe, expect, it } from 'vitest';
import { crearConexion } from '../src/db/conexion';
import { sembrar } from '../src/db/seed';
import { listarEmpresas } from '../src/dominio/repositorios';
import { crearEvaluacionComercial } from '../src/integraciones/evaluacionComercial';

function baseConDatos() {
  const db = crearConexion(':memory:');
  sembrar(db);
  return db;
}

describe('Sistema de Evaluación Comercial y Aduana (simulado)', () => {
  it('aprueba a un exportador con estado comercial activo', () => {
    const db = baseConDatos();
    const evaluacion = crearEvaluacionComercial(db);
    const activa = listarEmpresas(db).find((empresa) => empresa.estadoComercial === 'Activa');

    expect(activa).toBeDefined();
    const resultado = evaluacion.validarExportador(activa!);

    expect(resultado).toEqual({ aprobado: true });
    db.close();
  });

  it('bloquea a un exportador con bloqueo vigente y registra la llamada', () => {
    const db = baseConDatos();
    const evaluacion = crearEvaluacionComercial(db);
    const bloqueada = listarEmpresas(db).find((empresa) => empresa.estadoComercial === 'Bloqueada');

    expect(bloqueada).toBeDefined();
    const resultado = evaluacion.validarExportador(bloqueada!);

    expect(resultado.aprobado).toBe(false);
    expect(resultado.motivo).toContain('bloqueo comercial o aduanero');

    const log = db
      .prepare(
        `SELECT sistema, mensaje, resultado
         FROM integraciones_log
         WHERE sistema = 'Sistema de Evaluación Comercial y Aduana'
         ORDER BY id DESC`,
      )
      .get() as { sistema: string; mensaje: string; resultado: string };

    expect(log.mensaje).toContain('Validar estado comercial');
    expect(log.resultado).toContain('bloqueo comercial o aduanero');
    db.close();
  });
});
