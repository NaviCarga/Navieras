export interface Buque {
  id: number;
  codigoIMO: string;
  nombre: string;
  capacidadTotalTEU: number;
  navieraOperadora: string;
}

export interface Puerto {
  id: number;
  codigoUNLOCODE: string;
  nombre: string;
  pais: string;
  zonaGeografica: string;
}

export interface Viaje {
  id: number;
  codigoViaje: string;
  buqueId: number;
  puertoOrigenId: number;
  puertoDestinoId: number;
  fechaZarpe: string;
  fechaArriboEstimada: string;
  capacidadDisponibleTEU: number;
  estadoViaje: string;
}

export interface CupoContenedor {
  id: number;
  viajeId: number;
  tipoContenedor: string;
  cantidadTotal: number;
  cantidadDisponible: number;
}

export interface ViajeConCupos {
  id: number;
  codigoViaje: string;
  buqueNombre: string;
  puertoOrigen: string;
  puertoDestino: string;
  fechaZarpe: string;
  fechaArriboEstimada: string;
  capacidadDisponibleTEU: number;
  estadoViaje: string;
  cupos: CupoContenedor[];
}

export interface FiltrosDisponibilidad {
  origen?: string;
  destino?: string;
  tipoContenedor?: string;
}

export interface EmpresaExportadora {
  id: number;
  rut: string;
  razonSocial: string;
  correoContacto: string;
  estadoComercial: string;
}

export interface AgenteOperativo {
  id: number;
  identificadorEmpleado: string;
  nombreCompleto: string;
  correoCorporativo: string;
  zonaGeograficaAsignada: string;
  reservasActivasActuales: number;
  limiteMaximoReservas: number;
}

export type DestinatarioNotificacion = 'agente' | 'exportador';

export interface Notificacion {
  id: number;
  reservaId: number;
  agenteOperativoId: number | null;
  destinatarioTipo: DestinatarioNotificacion;
  destinatarioCorreo: string;
  tipo: string;
  mensaje: string;
  fecha: string;
}

export interface NuevaNotificacion {
  reservaId: number;
  agenteOperativoId?: number;
  destinatarioTipo: DestinatarioNotificacion;
  destinatarioCorreo: string;
  tipo: string;
  mensaje: string;
}

export interface DetalleReserva {
  id: number;
  reservaId: number;
  tipoContenedor: string;
  cantidadSolicitada: number;
  pesoEstimadoTon: number;
}

export interface Reserva {
  id: number;
  codigoBooking: string;
  empresaExportadoraId: number;
  viajeId: number;
  fechaSolicitud: string;
  cantidadTEU: number;
  tipoMercancia: string;
  numeroContrato: string | null;
  plazoMaximoCancelacion: string;
  estadoReserva: string;
  /** SobreReserva.posicionListaEspera (null si no está en la lista). */
  posicionListaEspera: number | null;
  /** SobreReserva.excesoSolicitadoTEU (null si nunca fue SobreReserva). */
  excesoSolicitadoTEU: number | null;
}

export const ESTADO_LISTA_ESPERA = 'En lista de espera';

export interface ReservaConDetalles extends Reserva {
  empresa: EmpresaExportadora;
  viaje: Viaje;
  detalles: DetalleReserva[];
  buqueNombre: string;
  puertoOrigen: string;
  puertoDestino: string;
  agente: AgenteOperativo | null;
}

export interface NuevoDetalleReserva {
  tipoContenedor: string;
  cantidadSolicitada: number;
  pesoEstimadoTon: number;
}

export interface NuevaReserva {
  codigoBooking: string;
  empresaExportadoraId: number;
  viajeId: number;
  fechaSolicitud: string;
  cantidadTEU: number;
  tipoMercancia: string;
  numeroContrato?: string | null;
  plazoMaximoCancelacion: string;
  estadoReserva: string;
  detalles: NuevoDetalleReserva[];
}
