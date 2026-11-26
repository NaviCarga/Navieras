import type { BaseDatos } from '../db/conexion';
import {
  capacidadTotalBuqueDeViaje,
  consultarDisponibilidad,
  listarCuposPorViaje,
  listarViajes,
} from '../dominio/repositorios';
import type {
  CupoContenedor,
  FiltrosDisponibilidad,
  ViajeConCupos,
} from '../dominio/tipos';

const NOMBRE_SISTEMA = 'Sistema Central de Flota (ERP Naviero)';

export interface CapacidadViaje {
  capacidadDisponibleTEU: number;
  /** Buque.capacidadTotalTEU: base del tope de sobrecupo (HU-04 CA2). */
  capacidadTotalTEU: number;
  cupos: CupoContenedor[];
}

export interface DetalleAsignacion {
  tipoContenedor: string;
  cantidad: number;
}

export interface SistemaFlota {
  consultarItinerarios(filtros: FiltrosDisponibilidad): ViajeConCupos[];
  consultarCapacidad(viajeId: number): CapacidadViaje | undefined;
  registrarAsignacion(
    viajeId: number,
    reservaId: number,
    detalles: DetalleAsignacion[],
  ): void;
  registrarLiberacion(
    viajeId: number,
    reservaId: number,
    detalles: DetalleAsignacion[],
  ): void;
}

export class SistemaFlotaSimulado implements SistemaFlota {
  constructor(private readonly db: BaseDatos) {}

  consultarItinerarios(filtros: FiltrosDisponibilidad): ViajeConCupos[] {
    const viajes = consultarDisponibilidad(this.db, filtros);

    this.registrar(
      'Solicitar itinerarios y capacidad',
      filtros,
      `Retornar viajes y cupos disponibles (${viajes.length} viajes)`,
    );

    return viajes;
  }

  consultarCapacidad(viajeId: number): CapacidadViaje | undefined {
    const viaje = listarViajes(this.db).find((candidato) => candidato.id === viajeId);
    if (!viaje) {
      this.registrar(
        'Consultar disponibilidad preliminar',
        { viajeId },
        'Viaje no encontrado',
      );
      return undefined;
    }

    const cupos = listarCuposPorViaje(this.db, viajeId);
    const capacidadTotalTEU = capacidadTotalBuqueDeViaje(this.db, viajeId) ?? 0;
    this.registrar(
      'Consultar disponibilidad preliminar',
      { viajeId },
      `Retornar capacidad disponible (${viaje.capacidadDisponibleTEU} TEUs; capacidad total del buque ${capacidadTotalTEU} TEUs)`,
    );
    return { capacidadDisponibleTEU: viaje.capacidadDisponibleTEU, capacidadTotalTEU, cupos };
  }

  registrarAsignacion(
    viajeId: number,
    reservaId: number,
    detalles: DetalleAsignacion[],
  ): void {
    this.registrar(
      'Registrar asignación de recursos',
      { viajeId, reservaId, detalles },
      'Confirmar asignación',
    );
  }

  registrarLiberacion(
    viajeId: number,
    reservaId: number,
    detalles: DetalleAsignacion[],
  ): void {
    this.registrar(
      'Liberar cupos',
      { viajeId, reservaId, detalles },
      'Cupos reincorporados',
    );
  }

  private registrar(mensaje: string, parametros: unknown, resultado: string): void {
    this.db
      .prepare(
        `INSERT INTO integraciones_log (sistema, mensaje, parametros, resultado)
         VALUES (?, ?, ?, ?)`,
      )
      .run(NOMBRE_SISTEMA, mensaje, JSON.stringify(parametros), resultado);
  }
}

export function crearSistemaFlota(db: BaseDatos): SistemaFlota {
  const modo = process.env.ERP_SIMULADO ?? 'true';
  if (modo === 'false') {
    throw new Error(
      'La integración real con el ERP Naviero no está implementada; use ERP_SIMULADO=true.',
    );
  }
  return new SistemaFlotaSimulado(db);
}
