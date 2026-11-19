import type { BaseDatos } from '../db/conexion';
import {
  crearReserva,
  listarViajes,
  obtenerEmpresa,
  registrarNotificacion,
} from '../dominio/repositorios';
import type {
  NuevoDetalleReserva,
  ReservaConDetalles,
} from '../dominio/tipos';
import {
  crearEvaluacionComercial,
  type EvaluacionComercial,
} from '../integraciones/evaluacionComercial';
import { crearSistemaFlota, type SistemaFlota } from '../integraciones/sistemaFlota';
import { asignarAgenteAReserva } from './asignacion';
import { confirmarReserva, fechaHoy } from './inventario';

const PREFIJO_BOOKING = 'BK';
const PATRON_CONTRATO = /^[A-Za-z0-9][A-Za-z0-9-]{3,29}$/;
const DIAS_PLAZO_CANCELACION = 7;

export interface DatosBooking {
  empresaExportadoraId: number;
  viajeId: number;
  tipoMercancia: string;
  numeroContrato: string;
  detalles: NuevoDetalleReserva[];
}

export type ResultadoBooking =
  | {
      tipo: 'confirmada';
      reserva: ReservaConDetalles;
      avisoAgente: string;
      notificacion: string;
    }
  | { tipo: 'rechazada_exportador'; reserva: ReservaConDetalles; motivo: string }
  | { tipo: 'sin_cupo'; mensaje: string }
  | { tipo: 'revalidacion_fallida'; reserva: ReservaConDetalles }
  | { tipo: 'datos_invalidos'; errores: string[] };

export function restarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() - dias);
  return base.toISOString().slice(0, 10);
}

export function generarCodigoBooking(db: BaseDatos, hoy: string = fechaHoy()): string {
  const anio = hoy.slice(0, 4);
  const prefijo = `${PREFIJO_BOOKING}-${anio}-`;
  const fila = db
    .prepare(
      `SELECT COALESCE(MAX(CAST(substr(codigo_booking, ?) AS INTEGER)), 0) AS maximo
       FROM reserva
       WHERE codigo_booking LIKE ?`,
    )
    .get(prefijo.length + 1, `${prefijo}%`) as { maximo: number };
  return `${prefijo}${String(fila.maximo + 1).padStart(3, '0')}`;
}

function agruparCantidades(detalles: NuevoDetalleReserva[]): Map<string, number> {
  const agrupados = new Map<string, number>();
  for (const detalle of detalles) {
    agrupados.set(
      detalle.tipoContenedor,
      (agrupados.get(detalle.tipoContenedor) ?? 0) + detalle.cantidadSolicitada,
    );
  }
  return agrupados;
}

function validarDatos(db: BaseDatos, datos: DatosBooking): string[] {
  const errores: string[] = [];

  const viaje = listarViajes(db).find((candidato) => candidato.id === datos.viajeId);
  if (!viaje) {
    errores.push('Seleccione un viaje disponible.');
  }

  if (!datos.tipoMercancia.trim()) {
    errores.push('Indique el tipo de mercancía.');
  } else if (datos.tipoMercancia.trim().length > 100) {
    errores.push('El tipo de mercancía no puede superar los 100 caracteres.');
  }

  if (!PATRON_CONTRATO.test(datos.numeroContrato.trim())) {
    errores.push(
      'El número de contrato debe tener entre 4 y 30 caracteres alfanuméricos o guiones.',
    );
  }

  if (datos.detalles.length === 0) {
    errores.push('Indique al menos un contenedor con cantidad mayor que cero.');
  }

  for (const detalle of datos.detalles) {
    if (!detalle.tipoContenedor.trim()) {
      errores.push('Indique el tipo de contenedor de cada línea.');
    }
    if (!Number.isInteger(detalle.cantidadSolicitada) || detalle.cantidadSolicitada <= 0) {
      errores.push('La cantidad de contenedores debe ser un número entero mayor que cero.');
    }
    if (!Number.isFinite(detalle.pesoEstimadoTon) || detalle.pesoEstimadoTon < 0) {
      errores.push('El peso estimado debe ser un número mayor o igual a cero.');
    }
  }

  return errores;
}

function faltaCapacidad(
  sistemaFlota: SistemaFlota,
  viajeId: number,
  agrupados: Map<string, number>,
): { falta: boolean; mensaje: string } {
  const capacidad = sistemaFlota.consultarCapacidad(viajeId);
  if (!capacidad) {
    return {
      falta: true,
      mensaje: 'No se encontró el viaje seleccionado en el Sistema Central de Flota.',
    };
  }

  const total = Array.from(agrupados.values()).reduce((suma, cantidad) => suma + cantidad, 0);
  const cupos = new Map(capacidad.cupos.map((cupo) => [cupo.tipoContenedor, cupo]));

  for (const [tipo, cantidad] of agrupados) {
    const cupo = cupos.get(tipo);
    if (!cupo) {
      return {
        falta: true,
        mensaje: `El viaje no ofrece cupos para contenedores ${tipo}.`,
      };
    }
    if (cupo.cantidadDisponible < cantidad) {
      return {
        falta: true,
        mensaje: `No hay cupo suficiente para ${cantidad} contenedores ${tipo}: quedan ${cupo.cantidadDisponible}.`,
      };
    }
  }

  if (capacidad.capacidadDisponibleTEU < total) {
    return {
      falta: true,
      mensaje: `No hay capacidad suficiente en el viaje: quedan ${capacidad.capacidadDisponibleTEU} TEUs y se solicitaron ${total}.`,
    };
  }

  return { falta: false, mensaje: '' };
}

function notificarConfirmacion(db: BaseDatos, reserva: ReservaConDetalles): string {
  const mensaje = `Su reserva ${reserva.codigoBooking} fue confirmada para ${reserva.puertoOrigen} → ${reserva.puertoDestino}, zarpe ${reserva.viaje.fechaZarpe}, ${reserva.cantidadTEU} TEUs.`;
  registrarNotificacion(db, {
    reservaId: reserva.id,
    destinatarioTipo: 'exportador',
    destinatarioCorreo: reserva.empresa.correoContacto,
    tipo: 'confirmacion_booking',
    mensaje,
  });
  return mensaje;
}

function avisoDeAsignacion(resultado: ReturnType<typeof asignarAgenteAReserva>): string {
  switch (resultado.tipo) {
    case 'asignada':
      return `Agente asignado: ${resultado.agente.nombreCompleto} (${resultado.agente.identificadorEmpleado}).`;
    case 'sin_agente':
      return `Sin agente asignado: no hay agentes con cupo de atención en la zona "${resultado.zona}". Se emitió una alerta al administrador.`;
    case 'ya_asignada':
      return `Agente ya asignado: ${resultado.agente.nombreCompleto} (${resultado.agente.identificadorEmpleado}).`;
    default:
      return 'No se pudo asignar un agente; la reserva queda en la lista de alertas del administrador.';
  }
}

export function registrarBooking(
  db: BaseDatos,
  datos: DatosBooking,
  sistemaFlota: SistemaFlota = crearSistemaFlota(db),
  evaluacionComercial: EvaluacionComercial = crearEvaluacionComercial(db),
  hoy: string = fechaHoy(),
): ResultadoBooking {
  const operacion = db.transaction((): ResultadoBooking => {
    const empresa = obtenerEmpresa(db, datos.empresaExportadoraId);
    if (!empresa) {
      return {
        tipo: 'datos_invalidos',
        errores: ['Seleccione una empresa exportadora válida.'],
      };
    }

    const errores = validarDatos(db, datos);
    if (errores.length > 0) {
      return { tipo: 'datos_invalidos', errores };
    }

    const viaje = listarViajes(db).find((candidato) => candidato.id === datos.viajeId);
    if (!viaje) {
      return { tipo: 'datos_invalidos', errores: ['Seleccione un viaje disponible.'] };
    }

    const agrupados = agruparCantidades(datos.detalles);
    const capacidad = faltaCapacidad(sistemaFlota, datos.viajeId, agrupados);
    if (capacidad.falta) {
      return { tipo: 'sin_cupo', mensaje: capacidad.mensaje };
    }

    const codigoBooking = generarCodigoBooking(db, hoy);
    const base = {
      codigoBooking,
      empresaExportadoraId: empresa.id,
      viajeId: viaje.id,
      fechaSolicitud: hoy,
      cantidadTEU: Array.from(agrupados.values()).reduce(
        (suma, cantidad) => suma + cantidad,
        0,
      ),
      tipoMercancia: datos.tipoMercancia.trim(),
      numeroContrato: datos.numeroContrato.trim(),
      plazoMaximoCancelacion: restarDias(viaje.fechaZarpe, DIAS_PLAZO_CANCELACION),
      detalles: datos.detalles.map((detalle) => ({
        tipoContenedor: detalle.tipoContenedor.trim(),
        cantidadSolicitada: detalle.cantidadSolicitada,
        pesoEstimadoTon: detalle.pesoEstimadoTon,
      })),
    };

    const evaluacion = evaluacionComercial.validarExportador(empresa);
    if (!evaluacion.aprobado) {
      const rechazada = crearReserva(db, {
        ...base,
        estadoReserva: 'Rechazada',
      });
      return {
        tipo: 'rechazada_exportador',
        reserva: rechazada,
        motivo: evaluacion.motivo ?? 'El exportador registra un bloqueo vigente.',
      };
    }

    const temporal = crearReserva(db, {
      ...base,
      estadoReserva: 'Reserva temporal',
    });

    const confirmacion = confirmarReserva(db, temporal.id, sistemaFlota);
    if (confirmacion.tipo !== 'confirmada') {
      if (confirmacion.tipo === 'rechazada') {
        return {
          tipo: 'revalidacion_fallida',
          reserva: confirmacion.reserva,
        };
      }
      throw new Error(
        `No se pudo confirmar la reserva ${temporal.codigoBooking}: ${confirmacion.tipo}.`,
      );
    }

    const asignacion = asignarAgenteAReserva(db, confirmacion.reserva.id);
    const reservaFinal =
      asignacion.tipo === 'asignada' || asignacion.tipo === 'ya_asignada'
        ? asignacion.reserva
        : confirmacion.reserva;

    const notificacion = notificarConfirmacion(db, reservaFinal);

    return {
      tipo: 'confirmada',
      reserva: reservaFinal,
      avisoAgente: avisoDeAsignacion(asignacion),
      notificacion,
    };
  });

  return operacion();
}
