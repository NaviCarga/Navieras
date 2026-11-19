import { describe, expect, it } from 'vitest';
import { crearConexion } from '../src/db/conexion';
import { sembrar } from '../src/db/seed';
import { crearSistemaFlota } from '../src/integraciones/sistemaFlota';

describe('SistemaFlotaSimulado', () => {
  it('devuelve los viajes y deja una fila de log en integraciones_log', () => {
    const db = crearConexion(':memory:');
    sembrar(db);

    const sistema = crearSistemaFlota(db);
    const viajes = sistema.consultarItinerarios({
      origen: 'San Antonio',
      destino: 'Shanghái',
      tipoContenedor: '40HQ',
    });

    expect(viajes).toHaveLength(1);

    const logs = db
      .prepare('SELECT sistema, mensaje, parametros, resultado FROM integraciones_log')
      .all() as Array<{
      sistema: string;
      mensaje: string;
      parametros: string;
      resultado: string;
    }>;

    expect(logs).toHaveLength(1);
    expect(logs[0].sistema).toBe('Sistema Central de Flota (ERP Naviero)');
    expect(logs[0].mensaje).toBe('Solicitar itinerarios y capacidad');
    expect(logs[0].resultado).toContain('Retornar viajes y cupos disponibles');

    db.close();
  });

  it('registra capacidad, asignación y liberación en el log de integraciones', () => {
    const db = crearConexion(':memory:');
    sembrar(db);

    const viaje = db
      .prepare("SELECT id, capacidad_disponible_teu FROM viaje WHERE codigo_viaje = 'VIA-001'")
      .get() as { id: number; capacidad_disponible_teu: number };
    const sistema = crearSistemaFlota(db);

    const capacidad = sistema.consultarCapacidad(viaje.id);
    expect(capacidad?.capacidadDisponibleTEU).toBe(viaje.capacidad_disponible_teu);
    expect(capacidad?.cupos).toHaveLength(1);

    sistema.registrarAsignacion(viaje.id, 1, [{ tipoContenedor: '40HQ', cantidad: 2 }]);
    sistema.registrarLiberacion(viaje.id, 1, [{ tipoContenedor: '40HQ', cantidad: 2 }]);

    const logs = db
      .prepare('SELECT mensaje, resultado FROM integraciones_log ORDER BY id')
      .all() as Array<{ mensaje: string; resultado: string }>;

    expect(logs.map((log) => log.mensaje)).toEqual([
      'Consultar disponibilidad preliminar',
      'Registrar asignación de recursos',
      'Liberar cupos',
    ]);
    expect(logs[0].resultado).toContain('Retornar capacidad disponible');
    expect(logs[1].resultado).toBe('Confirmar asignación');
    expect(logs[2].resultado).toBe('Cupos reincorporados');

    db.close();
  });
});
