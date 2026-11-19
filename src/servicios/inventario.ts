import type { BaseDatos } from '../db/conexion';
import { obtenerReserva } from '../dominio/repositorios';
import type { DetalleReserva, ReservaConDetalles } from '../dominio/tipos';
import {
  crearSistemaFlota,
  type DetalleAsignacion,
  type SistemaFlota,
} from '../integraciones/sistemaFlota';

export type ResultadoConfirmacion =
  | { tipo: 'confirmada'; reserva: ReservaConDetalles; capacidadDisponibleTEU: number }
  | { tipo: 'rechazada'; reserva: ReservaConDetalles }
  | { tipo: 'estado_invalido'; reserva: ReservaConDetalles }
  | { tipo: 'no_encontrada' };

export type ResultadoCancelacion =
  | { tipo: 'cancelada'; reserva: ReservaConDetalles; capacidadDisponibleTEU: number }
  | { tipo: 'fuera_de_plazo'; reserva: ReservaConDetalles }
  | { tipo: 'estado_invalido'; reserva: ReservaConDetalles }
  | { tipo: 'no_encontrada' };

export function fechaHoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function agruparPorTipo(detalles: DetalleReserva[]): Map<string, number> {
  const agrupados = new Map<string, number>();
  for (const detalle of detalles) {
    agrupados.set(
      detalle.tipoContenedor,
      (agrupados.get(detalle.tipoContenedor) ?? 0) + detalle.cantidadSolicitada,
    );
  }
  return agrupados;
}

function totalTEU(agrupados: Map<string, number>): number {
  return Array.from(agrupados.values()).reduce((total, cantidad) => total + cantidad, 0);
}

function aDetallesAsignacion(agrupados: Map<string, number>): DetalleAsignacion[] {
  return Array.from(agrupados, ([tipoContenedor, cantidad]) => ({
    tipoContenedor,
    cantidad,
  }));
}

function capacidadDisponible(db: BaseDatos, viajeId: number): number {
  const fila = db
    .prepare('SELECT capacidad_disponible_teu AS capacidad FROM viaje WHERE id = ?')
    .get(viajeId) as { capacidad: number } | undefined;
  if (!fila) {
    throw new Error(`No se encontró el viaje ${viajeId}.`);
  }
  return fila.capacidad;
}

function reservaObligatoria(db: BaseDatos, reservaId: number): ReservaConDetalles {
  const reserva = obtenerReserva(db, reservaId);
  if (!reserva) {
    throw new Error(`No se encontró la reserva ${reservaId}.`);
  }
  return reserva;
}

export function confirmarReserva(
  db: BaseDatos,
  reservaId: number,
  sistemaFlota: SistemaFlota = crearSistemaFlota(db),
): ResultadoConfirmacion {
  const operacion = db.transaction((): ResultadoConfirmacion => {
    const reserva = obtenerReserva(db, reservaId);
    if (!reserva) {
      return { tipo: 'no_encontrada' };
    }
    if (reserva.estadoReserva !== 'Reserva temporal') {
      return { tipo: 'estado_invalido', reserva };
    }

    const agrupados = agruparPorTipo(reserva.detalles);
    const total = totalTEU(agrupados);
    const capacidad = sistemaFlota.consultarCapacidad(reserva.viajeId);
    if (!capacidad) {
      throw new Error(`No se encontró el viaje ${reserva.viajeId}.`);
    }

    const cuposPorTipo = new Map(
      capacidad.cupos.map((cupo) => [cupo.tipoContenedor, cupo]),
    );
    const suficiente =
      capacidad.capacidadDisponibleTEU >= total &&
      Array.from(agrupados).every(([tipo, cantidad]) => {
        const cupo = cuposPorTipo.get(tipo);
        return cupo !== undefined && cupo.cantidadDisponible >= cantidad;
      });

    if (!suficiente) {
      db.prepare(
        `UPDATE reserva
         SET estado_reserva = 'Rechazada'
         WHERE id = ? AND estado_reserva = 'Reserva temporal'`,
      ).run(reservaId);
      return { tipo: 'rechazada', reserva: reservaObligatoria(db, reservaId) };
    }

    const descuentoViaje = db
      .prepare(
        `UPDATE viaje
         SET capacidad_disponible_teu = capacidad_disponible_teu - ?
         WHERE id = ? AND capacidad_disponible_teu >= ?`,
      )
      .run(total, reserva.viajeId, total);
    if (descuentoViaje.changes !== 1) {
      throw new Error('No se pudo descontar la capacidad del viaje.');
    }

    const descuentoCupo = db.prepare(
      `UPDATE cupo_contenedor
       SET cantidad_disponible = cantidad_disponible - ?
       WHERE viaje_id = ? AND tipo_contenedor = ? AND cantidad_disponible >= ?`,
    );
    for (const [tipo, cantidad] of agrupados) {
      const resultado = descuentoCupo.run(cantidad, reserva.viajeId, tipo, cantidad);
      if (resultado.changes !== 1) {
        throw new Error(`No se pudo descontar el cupo de tipo ${tipo}.`);
      }
    }

    const cambioEstado = db
      .prepare(
        `UPDATE reserva
         SET estado_reserva = 'Confirmada'
         WHERE id = ? AND estado_reserva = 'Reserva temporal'`,
      )
      .run(reservaId);
    if (cambioEstado.changes !== 1) {
      throw new Error('No se pudo confirmar la reserva.');
    }

    sistemaFlota.registrarAsignacion(
      reserva.viajeId,
      reserva.id,
      aDetallesAsignacion(agrupados),
    );

    return {
      tipo: 'confirmada',
      reserva: reservaObligatoria(db, reservaId),
      capacidadDisponibleTEU: capacidadDisponible(db, reserva.viajeId),
    };
  });

  return operacion();
}

export function cancelarReserva(
  db: BaseDatos,
  reservaId: number,
  sistemaFlota: SistemaFlota = crearSistemaFlota(db),
  hoy: string = fechaHoy(),
): ResultadoCancelacion {
  const operacion = db.transaction((): ResultadoCancelacion => {
    const reserva = obtenerReserva(db, reservaId);
    if (!reserva) {
      return { tipo: 'no_encontrada' };
    }
    if (reserva.estadoReserva !== 'Confirmada') {
      return { tipo: 'estado_invalido', reserva };
    }
    if (hoy > reserva.plazoMaximoCancelacion) {
      return { tipo: 'fuera_de_plazo', reserva };
    }

    const agrupados = agruparPorTipo(reserva.detalles);
    const total = totalTEU(agrupados);

    const restitucionViaje = db
      .prepare(
        `UPDATE viaje
         SET capacidad_disponible_teu = capacidad_disponible_teu + ?
         WHERE id = ?`,
      )
      .run(total, reserva.viajeId);
    if (restitucionViaje.changes !== 1) {
      throw new Error('No se pudo restituir la capacidad del viaje.');
    }

    const restitucionCupo = db.prepare(
      `UPDATE cupo_contenedor
       SET cantidad_disponible = cantidad_disponible + ?
       WHERE viaje_id = ? AND tipo_contenedor = ?
         AND cantidad_disponible + ? <= cantidad_total`,
    );
    for (const [tipo, cantidad] of agrupados) {
      const resultado = restitucionCupo.run(
        cantidad,
        reserva.viajeId,
        tipo,
        cantidad,
      );
      if (resultado.changes !== 1) {
        throw new Error(`No se pudo restituir el cupo de tipo ${tipo}.`);
      }
    }

    const cambioEstado = db
      .prepare(
        `UPDATE reserva
         SET estado_reserva = 'Cancelada'
         WHERE id = ? AND estado_reserva = 'Confirmada'`,
      )
      .run(reservaId);
    if (cambioEstado.changes !== 1) {
      throw new Error('No se pudo cancelar la reserva.');
    }

    sistemaFlota.registrarLiberacion(
      reserva.viajeId,
      reserva.id,
      aDetallesAsignacion(agrupados),
    );

    return {
      tipo: 'cancelada',
      reserva: reservaObligatoria(db, reservaId),
      capacidadDisponibleTEU: capacidadDisponible(db, reserva.viajeId),
    };
  });

  return operacion();
}
