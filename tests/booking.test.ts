import { describe, expect, it } from 'vitest';
import { crearConexion, type BaseDatos } from '../src/db/conexion';
import { sembrar } from '../src/db/seed';
import { crearReserva, listarEmpresas, listarViajes } from '../src/dominio/repositorios';
import { crearEvaluacionComercial } from '../src/integraciones/evaluacionComercial';
import {
  crearSistemaFlota,
  type CapacidadViaje,
  type SistemaFlota,
} from '../src/integraciones/sistemaFlota';
import { generarCodigoBooking, registrarBooking } from '../src/servicios/booking';

const HOY = '2026-11-19';

function baseConDatos(): BaseDatos {
  const db = crearConexion(':memory:');
  sembrar(db);
  return db;
}

function ids(db: BaseDatos) {
  const activa = listarEmpresas(db).find((empresa) => empresa.estadoComercial === 'Activa')!;
  const bloqueada = listarEmpresas(db).find((empresa) => empresa.estadoComercial === 'Bloqueada')!;
  const viaje = listarViajes(db).find((candidato) => candidato.codigoViaje === 'VIA-003')!;
  const sinCupo = listarViajes(db).find((candidato) => candidato.codigoViaje === 'VIA-004')!;
  return { activa, bloqueada, viaje, sinCupo };
}

function capacidad(db: BaseDatos, viajeId: number) {
  const viaje = db
    .prepare(
      'SELECT capacidad_disponible_teu AS capacidad FROM viaje WHERE id = ?',
    )
    .get(viajeId) as { capacidad: number };
  const cupos = db
    .prepare(
      'SELECT tipo_contenedor, cantidad_disponible FROM cupo_contenedor WHERE viaje_id = ? ORDER BY tipo_contenedor',
    )
    .all(viajeId) as Array<{ tipo_contenedor: string; cantidad_disponible: number }>;
  return { capacidad: viaje.capacidad, cupos };
}

function contarReservas(db: BaseDatos): number {
  return (db.prepare('SELECT COUNT(*) AS total FROM reserva').get() as { total: number }).total;
}

describe('generación del código de booking', () => {
  it('genera códigos correlativos por año', () => {
    const db = baseConDatos();
    const { activa, viaje } = ids(db);

    const primero = generarCodigoBooking(db, HOY);
    expect(primero).toBe('BK-2026-001');

    crearReserva(db, {
      codigoBooking: primero,
      empresaExportadoraId: activa.id,
      viajeId: viaje.id,
      fechaSolicitud: HOY,
      cantidadTEU: 1,
      tipoMercancia: 'Carga general',
      numeroContrato: 'CT-2026-100',
      plazoMaximoCancelacion: '2027-01-03',
      estadoReserva: 'Reserva temporal',
      detalles: [{ tipoContenedor: '20GP', cantidadSolicitada: 1, pesoEstimadoTon: 1 }],
    });

    expect(generarCodigoBooking(db, HOY)).toBe('BK-2026-002');
    expect(generarCodigoBooking(db, '2027-01-01')).toBe('BK-2027-001');
    db.close();
  });
});

describe('validación de la solicitud de booking', () => {
  it('rechaza datos faltantes sin registrar la reserva ni tocar el inventario', () => {
    const db = baseConDatos();
    const { activa, viaje } = ids(db);
    const antes = capacidad(db, viaje.id);
    const reservasAntes = contarReservas(db);

    const resultado = registrarBooking(
      db,
      {
        empresaExportadoraId: activa.id,
        viajeId: viaje.id,
        tipoMercancia: '',
        numeroContrato: '',
        detalles: [],
      },
      crearSistemaFlota(db),
      crearEvaluacionComercial(db),
      HOY,
    );

    expect(resultado.tipo).toBe('datos_invalidos');
    if (resultado.tipo === 'datos_invalidos') {
      expect(resultado.errores.length).toBeGreaterThanOrEqual(3);
    }
    expect(contarReservas(db)).toBe(reservasAntes);
    expect(capacidad(db, viaje.id)).toEqual(antes);
    db.close();
  });

  it('rechaza un contrato con formato inválido', () => {
    const db = baseConDatos();
    const { activa, viaje } = ids(db);

    const resultado = registrarBooking(
      db,
      {
        empresaExportadoraId: activa.id,
        viajeId: viaje.id,
        tipoMercancia: 'Frutas',
        numeroContrato: 'ab',
        detalles: [{ tipoContenedor: '20GP', cantidadSolicitada: 2, pesoEstimadoTon: 10 }],
      },
      crearSistemaFlota(db),
      crearEvaluacionComercial(db),
      HOY,
    );

    expect(resultado.tipo).toBe('datos_invalidos');
    db.close();
  });

  it('informa falta de cupo sin descontar inventario ni registrar la reserva', () => {
    const db = baseConDatos();
    const { activa, sinCupo } = ids(db);
    const antes = capacidad(db, sinCupo.id);
    const reservasAntes = contarReservas(db);

    const resultado = registrarBooking(
      db,
      {
        empresaExportadoraId: activa.id,
        viajeId: sinCupo.id,
        tipoMercancia: 'Textiles',
        numeroContrato: 'CT-2026-200',
        detalles: [{ tipoContenedor: '20GP', cantidadSolicitada: 6, pesoEstimadoTon: 8 }],
      },
      crearSistemaFlota(db),
      crearEvaluacionComercial(db),
      HOY,
    );

    expect(resultado.tipo).toBe('sin_cupo');
    expect(contarReservas(db)).toBe(reservasAntes);
    expect(capacidad(db, sinCupo.id)).toEqual(antes);
    db.close();
  });
});

describe('rechazo por bloqueo comercial del exportador', () => {
  it('deja la reserva Rechazada sin descontar cupos', () => {
    const db = baseConDatos();
    const { bloqueada, viaje } = ids(db);
    const antes = capacidad(db, viaje.id);

    const resultado = registrarBooking(
      db,
      {
        empresaExportadoraId: bloqueada.id,
        viajeId: viaje.id,
        tipoMercancia: 'Carga general',
        numeroContrato: 'CT-2026-300',
        detalles: [{ tipoContenedor: '20GP', cantidadSolicitada: 5, pesoEstimadoTon: 9 }],
      },
      crearSistemaFlota(db),
      crearEvaluacionComercial(db),
      HOY,
    );

    expect(resultado.tipo).toBe('rechazada_exportador');
    if (resultado.tipo === 'rechazada_exportador') {
      expect(resultado.reserva.estadoReserva).toBe('Rechazada');
      expect(resultado.motivo).toContain('bloqueo');
    }
    expect(capacidad(db, viaje.id)).toEqual(antes);
    db.close();
  });
});

describe('revalidación de disponibilidad antes de confirmar', () => {
  it('rechaza la reserva si el cupo se agotó después de la verificación preliminar', () => {
    const db = baseConDatos();
    const { activa, viaje } = ids(db);
    const antes = capacidad(db, viaje.id);
    const real = crearSistemaFlota(db);
    let llamadas = 0;

    const sistemaFlota: SistemaFlota = {
      consultarItinerarios: (filtros) => real.consultarItinerarios(filtros),
      consultarCapacidad: (viajeId): CapacidadViaje | undefined => {
        llamadas += 1;
        if (llamadas === 1) {
          return real.consultarCapacidad(viajeId);
        }
        const capacidadViaje = real.consultarCapacidad(viajeId)!;
        return {
          capacidadDisponibleTEU: 0,
          cupos: capacidadViaje.cupos.map((cupo) => ({ ...cupo, cantidadDisponible: 0 })),
        };
      },
      registrarAsignacion: (...args) => real.registrarAsignacion(...args),
      registrarLiberacion: (...args) => real.registrarLiberacion(...args),
    };

    const resultado = registrarBooking(
      db,
      {
        empresaExportadoraId: activa.id,
        viajeId: viaje.id,
        tipoMercancia: 'Carga general',
        numeroContrato: 'CT-2026-400',
        detalles: [{ tipoContenedor: '20GP', cantidadSolicitada: 5, pesoEstimadoTon: 9 }],
      },
      sistemaFlota,
      crearEvaluacionComercial(db),
      HOY,
    );

    expect(llamadas).toBeGreaterThanOrEqual(2);
    expect(resultado.tipo).toBe('revalidacion_fallida');
    if (resultado.tipo === 'revalidacion_fallida') {
      expect(resultado.reserva.estadoReserva).toBe('Rechazada');
    }
    expect(capacidad(db, viaje.id)).toEqual(antes);
    db.close();
  });
});

describe('confirmación exitosa del booking', () => {
  it('confirma la reserva, descuenta cupos y genera el comprobante', () => {
    const db = baseConDatos();
    const { activa, viaje } = ids(db);

    const resultado = registrarBooking(
      db,
      {
        empresaExportadoraId: activa.id,
        viajeId: viaje.id,
        tipoMercancia: 'Carga general',
        numeroContrato: 'CT-2026-500',
        detalles: [{ tipoContenedor: '20GP', cantidadSolicitada: 5, pesoEstimadoTon: 9 }],
      },
      crearSistemaFlota(db),
      crearEvaluacionComercial(db),
      HOY,
    );

    expect(resultado.tipo).toBe('confirmada');
    if (resultado.tipo === 'confirmada') {
      expect(resultado.reserva.codigoBooking).toBe('BK-2026-001');
      expect(resultado.reserva.estadoReserva).toBe('Confirmada');
      expect(resultado.reserva.cantidadTEU).toBe(5);
      expect(resultado.reserva.numeroContrato).toBe('CT-2026-500');
      expect(resultado.reserva.plazoMaximoCancelacion).toBe('2027-01-03');
      expect(resultado.notificacion).toContain('BK-2026-001');
    }

    const despues = capacidad(db, viaje.id);
    expect(despues.capacidad).toBe(45);
    expect(despues.cupos).toEqual([
      { tipo_contenedor: '20GP', cantidad_disponible: 10 },
      { tipo_contenedor: '40HQ', cantidad_disponible: 50 },
    ]);

    const notificaciones = db
      .prepare(
        "SELECT COUNT(*) AS total FROM notificacion WHERE destinatario_tipo = 'exportador' AND tipo = 'confirmacion_booking'",
      )
      .get() as { total: number };
    expect(notificaciones.total).toBe(1);
    db.close();
  });
});
