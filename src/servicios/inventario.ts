// HU-02 (CU-03, CU-04, CU-08), EST-01 y EST-02 — ajuste-hu-04-lista-espera
import type { BaseDatos } from '../db/conexion';
import {
  listarListaEspera,
  obtenerReserva,
  registrarNotificacion,
  renumerarLista,
  salirDeLista,
} from '../dominio/repositorios';
import type { DetalleReserva, ReservaConDetalles } from '../dominio/tipos';
import {
  crearSistemaFlota,
  type DetalleAsignacion,
  type SistemaFlota,
} from '../integraciones/sistemaFlota';
import { asignarAgenteAReserva, type ResultadoAsignacion } from './asignacion';
import {
  evaluarSobrecupo,
  evaluarSobrecupoViaje,
  ingresarAListaEspera,
  type EvaluacionSobrecupo,
} from './listaEspera';

export type ResultadoConfirmacion =
  | { tipo: 'confirmada'; reserva: ReservaConDetalles; capacidadDisponibleTEU: number }
  | { tipo: 'lista_espera'; reserva: ReservaConDetalles; evaluacion: EvaluacionSobrecupo }
  | { tipo: 'rechazada'; reserva: ReservaConDetalles; evaluacion: EvaluacionSobrecupo }
  | { tipo: 'estado_invalido'; reserva: ReservaConDetalles }
  | { tipo: 'no_encontrada' };

export interface ConfirmacionDesdeLista {
  reserva: ReservaConDetalles;
  asignacion: ResultadoAsignacion;
}

export type ResultadoCancelacion =
  | {
      tipo: 'cancelada';
      reserva: ReservaConDetalles;
      capacidadDisponibleTEU: number;
      confirmadaDesdeLista?: ConfirmacionDesdeLista;
    }
  | { tipo: 'cancelada_lista_espera'; reserva: ReservaConDetalles; capacidadDisponibleTEU: number }
  | { tipo: 'fuera_de_plazo'; reserva: ReservaConDetalles }
  | { tipo: 'estado_invalido'; reserva: ReservaConDetalles }
  | { tipo: 'no_encontrada' };

export function fechaHoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export function agruparPorTipo(detalles: Pick<DetalleReserva, 'tipoContenedor' | 'cantidadSolicitada'>[]): Map<string, number> {
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

/**
 * EST-02 `Reservado temporalmente / Disponible → Comprometido`: descuenta TEU del viaje y
 * cupos por tipo, deja la reserva "Confirmada" y registra la asignación en el ERP simulado.
 */
function comprometerInventario(
  db: BaseDatos,
  reserva: ReservaConDetalles,
  estadoOrigen: string,
  sistemaFlota: SistemaFlota,
): void {
  const agrupados = agruparPorTipo(reserva.detalles);
  const total = totalTEU(agrupados);

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
       WHERE id = ? AND estado_reserva = ?`,
    )
    .run(reserva.id, estadoOrigen);
  if (cambioEstado.changes !== 1) {
    throw new Error('No se pudo confirmar la reserva.');
  }

  sistemaFlota.registrarAsignacion(reserva.viajeId, reserva.id, aDetallesAsignacion(agrupados));
}

// EST-01: `confirmarReserva` (Reserva temporal → Confirmada) y, si no cabe,
// `detectarSobrecupo` (→ En lista de espera / Rechazada). HU-02 CA2, HU-04 (revalidación).
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

    const evaluacion = evaluarSobrecupoViaje(
      db,
      sistemaFlota,
      reserva.viajeId,
      agruparPorTipo(reserva.detalles),
    );
    if (!evaluacion) {
      throw new Error(`No se encontró el viaje ${reserva.viajeId}.`);
    }

    if (!evaluacion.cabe) {
      // El bloqueo de la reserva temporal es lógico: liberar el espacio temporal no escribe inventario.
      if (evaluacion.dentroDelTope) {
        const enEspera = ingresarAListaEspera(db, reservaId, evaluacion.exceso);
        return { tipo: 'lista_espera', reserva: enEspera, evaluacion };
      }
      db.prepare(
        `UPDATE reserva
         SET estado_reserva = 'Rechazada'
         WHERE id = ? AND estado_reserva = 'Reserva temporal'`,
      ).run(reservaId);
      return { tipo: 'rechazada', reserva: reservaObligatoria(db, reservaId), evaluacion };
    }

    comprometerInventario(db, reserva, 'Reserva temporal', sistemaFlota);

    return {
      tipo: 'confirmada',
      reserva: reservaObligatoria(db, reservaId),
      capacidadDisponibleTEU: capacidadDisponible(db, reserva.viajeId),
    };
  });

  return operacion();
}

/**
 * CU-08 — Confirmar reservas en lista de espera al liberarse cupo (decisión confirmada 2):
 * recorre la lista por posición y confirma la primera reserva que quepa completa,
 * saltando las que no caben. Solo una por liberación.
 */
export function revisarListaEspera(
  db: BaseDatos,
  viajeId: number,
  sistemaFlota: SistemaFlota = crearSistemaFlota(db),
): ConfirmacionDesdeLista | undefined {
  const operacion = db.transaction((): ConfirmacionDesdeLista | undefined => {
    const capacidad = sistemaFlota.consultarCapacidad(viajeId);
    if (!capacidad) {
      return undefined;
    }

    for (const enEspera of listarListaEspera(db, viajeId)) {
      const evaluacion = evaluarSobrecupo({
        solicitados: agruparPorTipo(enEspera.detalles),
        capacidadDisponibleTEU: capacidad.capacidadDisponibleTEU,
        cupos: capacidad.cupos,
        teuEnLista: 0,
        capacidadTotalTEU: capacidad.capacidadTotalTEU,
      });
      if (!evaluacion.cabe) {
        continue;
      }

      comprometerInventario(db, enEspera, 'En lista de espera', sistemaFlota);
      salirDeLista(db, enEspera.id);
      renumerarLista(db, viajeId);

      const confirmada = reservaObligatoria(db, enEspera.id);
      registrarNotificacion(db, {
        reservaId: confirmada.id,
        destinatarioTipo: 'exportador',
        destinatarioCorreo: confirmada.empresa.correoContacto,
        tipo: 'confirmacion_lista_espera',
        mensaje: `Se liberó cupo en el viaje ${confirmada.viaje.codigoViaje}: su reserva ${confirmada.codigoBooking} pasó de "En lista de espera" a "Confirmada" (${confirmada.cantidadTEU} TEUs).`,
      });

      // HU-03 / CU-05: asignación automática del agente operativo.
      const asignacion = asignarAgenteAReserva(db, confirmada.id);
      return { reserva: reservaObligatoria(db, confirmada.id), asignacion };
    }
    return undefined;
  });
  return operacion();
}

// CU-03 — Cancelar reserva. Desde "Confirmada" (con plazo, restituye y revisa la lista)
// o desde "En lista de espera" (sin plazo, no toca el inventario).
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

    if (reserva.estadoReserva === 'En lista de espera') {
      db.prepare(
        `UPDATE reserva SET estado_reserva = 'Cancelada'
         WHERE id = ? AND estado_reserva = 'En lista de espera'`,
      ).run(reservaId);
      salirDeLista(db, reservaId);
      renumerarLista(db, reserva.viajeId);
      return {
        tipo: 'cancelada_lista_espera',
        reserva: reservaObligatoria(db, reservaId),
        capacidadDisponibleTEU: capacidadDisponible(db, reserva.viajeId),
      };
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
      const resultado = restitucionCupo.run(cantidad, reserva.viajeId, tipo, cantidad);
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

    sistemaFlota.registrarLiberacion(reserva.viajeId, reserva.id, aDetallesAsignacion(agrupados));

    const confirmadaDesdeLista = revisarListaEspera(db, reserva.viajeId, sistemaFlota);

    return {
      tipo: 'cancelada',
      reserva: reservaObligatoria(db, reservaId),
      capacidadDisponibleTEU: capacidadDisponible(db, reserva.viajeId),
      confirmadaDesdeLista,
    };
  });

  return operacion();
}
