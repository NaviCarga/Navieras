import { Router } from 'express';
import type { BaseDatos } from '../db/conexion';
import type { FiltrosDisponibilidad, ViajeConCupos } from '../dominio/tipos';
import { crearSistemaFlota } from '../integraciones/sistemaFlota';

export interface GrupoPorFecha {
  fecha: string;
  viajes: ViajeConCupos[];
}

function texto(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : undefined;
}

export function agruparPorFecha(viajes: ViajeConCupos[]): GrupoPorFecha[] {
  const mapa = new Map<string, ViajeConCupos[]>();

  for (const viaje of viajes) {
    const lista = mapa.get(viaje.fechaZarpe) ?? [];
    lista.push(viaje);
    mapa.set(viaje.fechaZarpe, lista);
  }

  return Array.from(mapa.entries()).map(([fecha, viajesDelDia]) => ({
    fecha,
    viajes: viajesDelDia,
  }));
}

export function crearRutaDisponibilidad(db: BaseDatos): Router {
  const router = Router();
  const sistemaFlota = crearSistemaFlota(db);

  router.get('/disponibilidad', (req, res, next) => {
    try {
      const filtros: FiltrosDisponibilidad = {
        origen: texto(req.query.origen),
        destino: texto(req.query.destino),
        tipoContenedor: texto(req.query.tipoContenedor),
      };

      const viajes = sistemaFlota.consultarItinerarios(filtros);

      res.render('disponibilidad', {
        filtros,
        viajes,
        porFecha: agruparPorFecha(viajes),
        hayConsulta: Boolean(filtros.origen || filtros.destino || filtros.tipoContenedor),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
