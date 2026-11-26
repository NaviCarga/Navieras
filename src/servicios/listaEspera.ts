// ajuste-hu-04-lista-espera — HU-04 CA2/CA4, HU-02 (CU-08), EST-01 (Reserva / SobreReserva)
// ACT-TOBE: «Ofrece alternativas (próxima salida, otro puerto, lista de espera)».
import type { BaseDatos } from '../db/conexion';
import {
  obtenerReserva,
  registrarNotificacion,
  registrarSobreReserva,
  renumerarLista,
  salirDeLista,
  teuEnListaEspera,
} from '../dominio/repositorios';
import type { CupoContenedor, ReservaConDetalles } from '../dominio/tipos';
import type { SistemaFlota } from '../integraciones/sistemaFlota';

/** Porcentaje del tope de sobrecupo sobre Buque.capacidadTotalTEU (08-modelo-dominio). */
export const PORCENTAJE_TOPE_SOBRECUPO = 3;

export interface EntradaSobrecupo {
  /** TEUs solicitados por tipo de contenedor (1 TEU por contenedor). */
  solicitados: Map<string, number>;
  /** Viaje.capacidadDisponibleTEU */
  capacidadDisponibleTEU: number;
  /** CupoContenedor del viaje */
  cupos: Pick<CupoContenedor, 'tipoContenedor' | 'cantidadDisponible'>[];
  /** E: TEUs de las reservas del viaje "En lista de espera" */
  teuEnLista: number;
  /** Buque.capacidadTotalTEU */
  capacidadTotalTEU: number;
}

export interface EvaluacionSobrecupo {
  q: number;
  dEfectiva: number;
  cabe: boolean;
  exceso: number;
  teuEnLista: number;
  sobrecupo: number;
  tope: number;
  /** true si no cabe y el sobrecupo acumulado no supera el tope (inclusivo). */
  dentroDelTope: boolean;
}

export function calcularTope(capacidadTotalTEU: number): number {
  return Math.floor((capacidadTotalTEU * PORCENTAJE_TOPE_SOBRECUPO) / 100);
}

/**
 * Regla de sobrecupo (design.md, decisión 1 y supuesto S-1):
 * D_efectiva = min(capacidadDisponibleTEU, Σ cupos disponibles de los tipos solicitados);
 * exceso = q − D_efectiva, o la suma de lo que falta por tipo si ese valor no es positivo;
 * sobrecupo = E + exceso; tope = floor(3 % de capacidadTotalTEU).
 */
export function evaluarSobrecupo(entrada: EntradaSobrecupo): EvaluacionSobrecupo {
  const disponiblePorTipo = new Map(
    entrada.cupos.map((cupo) => [cupo.tipoContenedor, cupo.cantidadDisponible]),
  );
  let q = 0;
  let sumaCuposSolicitados = 0;
  let faltantePorTipo = 0;
  for (const [tipo, cantidad] of entrada.solicitados) {
    const disponible = disponiblePorTipo.get(tipo) ?? 0;
    q += cantidad;
    sumaCuposSolicitados += disponible;
    faltantePorTipo += Math.max(0, cantidad - disponible);
  }

  const dEfectiva = Math.min(entrada.capacidadDisponibleTEU, sumaCuposSolicitados);
  const cabe = q <= dEfectiva && faltantePorTipo === 0;
  const excesoTEU = q - dEfectiva;
  const exceso = cabe ? 0 : excesoTEU > 0 ? excesoTEU : faltantePorTipo;
  const sobrecupo = entrada.teuEnLista + exceso;
  const tope = calcularTope(entrada.capacidadTotalTEU);

  return {
    q,
    dEfectiva,
    cabe,
    exceso,
    teuEnLista: entrada.teuEnLista,
    sobrecupo,
    tope,
    dentroDelTope: !cabe && sobrecupo <= tope,
  };
}

/** Lee del ERP simulado y de la lista de espera los datos de la regla para un viaje. */
export function evaluarSobrecupoViaje(
  db: BaseDatos,
  sistemaFlota: SistemaFlota,
  viajeId: number,
  solicitados: Map<string, number>,
): EvaluacionSobrecupo | undefined {
  const capacidad = sistemaFlota.consultarCapacidad(viajeId);
  if (!capacidad) {
    return undefined;
  }
  return evaluarSobrecupo({
    solicitados,
    capacidadDisponibleTEU: capacidad.capacidadDisponibleTEU,
    cupos: capacidad.cupos,
    teuEnLista: teuEnListaEspera(db, viajeId),
    capacidadTotalTEU: capacidad.capacidadTotalTEU,
  });
}

export function mensajeSobreTope(evaluacion: EvaluacionSobrecupo): string {
  return `La solicitud supera el tope de sobrecupo del viaje: sobrecupo acumulado de ${evaluacion.sobrecupo} TEUs y tope de sobrecupo de ${evaluacion.tope} TEUs.`;
}

/**
 * EST-01 `detectarSobrecupo` (guarda E + (q − D) ≤ tope): la reserva pasa a
 * "En lista de espera" como SobreReserva en la última posición, sin descontar inventario.
 * Debe llamarse dentro de una transacción.
 */
export function ingresarAListaEspera(
  db: BaseDatos,
  reservaId: number,
  exceso: number,
): ReservaConDetalles {
  const cambio = db
    .prepare(
      `UPDATE reserva SET estado_reserva = 'En lista de espera'
       WHERE id = ? AND estado_reserva IN ('Reserva temporal', 'En lista de espera')`,
    )
    .run(reservaId);
  if (cambio.changes !== 1) {
    throw new Error(`La reserva ${reservaId} no puede pasar a "En lista de espera".`);
  }
  const posicion = registrarSobreReserva(db, reservaId, exceso);
  const reserva = obtenerReserva(db, reservaId)!;
  registrarNotificacion(db, {
    reservaId,
    destinatarioTipo: 'exportador',
    destinatarioCorreo: reserva.empresa.correoContacto,
    tipo: 'lista_espera',
    mensaje: `Su reserva ${reserva.codigoBooking} quedó "En lista de espera" en la posición ${posicion} del viaje ${reserva.viaje.codigoViaje} (zarpe ${reserva.viaje.fechaZarpe}).`,
  });
  return reserva;
}

/**
 * EST-01 `cerrarListaPorZarpe`: toda reserva "En lista de espera" de un viaje cuya fecha de
 * zarpe llegó (fecha_zarpe ≤ hoy) pasa a "Vencida", sale de la lista y se notifica.
 * Vencimiento perezoso (design.md, decisión 6): idempotente, sin tarea programada.
 */
export function cerrarListasPorZarpe(db: BaseDatos, hoy: string): number {
  const operacion = db.transaction((): number => {
    const filas = db
      .prepare(
        `SELECT r.id, r.viaje_id
         FROM reserva r
         JOIN viaje v ON v.id = r.viaje_id
         WHERE r.estado_reserva = 'En lista de espera' AND v.fecha_zarpe <= ?
         ORDER BY r.id`,
      )
      .all(hoy) as Array<{ id: number; viaje_id: number }>;

    const viajes = new Set<number>();
    for (const fila of filas) {
      db.prepare(
        `UPDATE reserva SET estado_reserva = 'Vencida'
         WHERE id = ? AND estado_reserva = 'En lista de espera'`,
      ).run(fila.id);
      salirDeLista(db, fila.id);
      viajes.add(fila.viaje_id);

      const reserva = obtenerReserva(db, fila.id)!;
      registrarNotificacion(db, {
        reservaId: fila.id,
        destinatarioTipo: 'exportador',
        destinatarioCorreo: reserva.empresa.correoContacto,
        tipo: 'vencimiento_lista_espera',
        mensaje: `Su reserva ${reserva.codigoBooking} quedó "Vencida" por el zarpe del viaje ${reserva.viaje.codigoViaje} (${reserva.viaje.fechaZarpe}) sin que se liberara cupo suficiente.`,
      });
    }
    for (const viajeId of viajes) {
      renumerarLista(db, viajeId);
    }
    return filas.length;
  });
  return operacion();
}
