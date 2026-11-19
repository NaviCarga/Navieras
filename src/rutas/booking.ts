import { Router, type Response } from 'express';
import type { BaseDatos } from '../db/conexion';
import {
  consultarDisponibilidad,
  listarEmpresas,
  obtenerReserva,
} from '../dominio/repositorios';
import type { NuevoDetalleReserva, ReservaConDetalles } from '../dominio/tipos';
import { registrarBooking } from '../servicios/booking';

const CANTIDAD_LINEAS = 3;
const TIPOS_CONTENEDOR = ['20GP', '40HQ', '40RF'];

interface LineaFormulario {
  tipo: string;
  cantidad: string;
  peso: string;
}

interface ValoresBooking {
  empresaId: string;
  viajeId: string;
  tipoMercancia: string;
  numeroContrato: string;
  lineas: LineaFormulario[];
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function lineasVacias(): LineaFormulario[] {
  return Array.from({ length: CANTIDAD_LINEAS }, () => ({ tipo: '', cantidad: '', peso: '' }));
}

function valoresDesdeFormulario(cuerpo: Record<string, unknown>): ValoresBooking {
  const lineas = Array.from({ length: CANTIDAD_LINEAS }, (_, indice) => {
    const numero = indice + 1;
    return {
      tipo: texto(cuerpo[`tipoContenedor${numero}`]),
      cantidad: texto(cuerpo[`cantidad${numero}`]),
      peso: texto(cuerpo[`peso${numero}`]),
    };
  });
  return {
    empresaId: texto(cuerpo.empresaId),
    viajeId: texto(cuerpo.viajeId),
    tipoMercancia: texto(cuerpo.tipoMercancia),
    numeroContrato: texto(cuerpo.numeroContrato),
    lineas,
  };
}

function detallesDesde(valores: ValoresBooking): NuevoDetalleReserva[] {
  return valores.lineas
    .filter((linea) => linea.tipo !== '' || linea.cantidad !== '' || linea.peso !== '')
    .map((linea) => ({
      tipoContenedor: linea.tipo,
      cantidadSolicitada: linea.cantidad === '' ? Number.NaN : Number(linea.cantidad),
      pesoEstimadoTon: linea.peso === '' ? 0 : Number(linea.peso),
    }));
}

function datosVista(db: BaseDatos) {
  return {
    empresas: listarEmpresas(db),
    viajes: consultarDisponibilidad(db, {}),
    tiposContenedor: TIPOS_CONTENEDOR,
  };
}

function renderizarFormulario(
  res: Response,
  db: BaseDatos,
  valores: ValoresBooking,
  mensajes: { errores?: string[]; rechazo?: string; aviso?: string } = {},
): void {
  res.render('booking', {
    ...datosVista(db),
    valores,
    errores: mensajes.errores ?? [],
    rechazo: mensajes.rechazo,
    aviso: mensajes.aviso,
  });
}

function renderizarComprobante(
  res: Response,
  reserva: ReservaConDetalles,
  aviso?: string,
): void {
  res.render('comprobante', { reserva, aviso });
}

export function crearRutaBooking(db: BaseDatos): Router {
  const router = Router();

  router.get('/booking', (req, res, next) => {
    try {
      const viajes = consultarDisponibilidad(db, {});
      const solicitado = typeof req.query.viaje === 'string' ? req.query.viaje : '';
      const seleccionado = viajes.find((viaje) => viaje.codigoViaje === solicitado);

      renderizarFormulario(res, db, {
        empresaId: '',
        viajeId: seleccionado ? String(seleccionado.id) : '',
        tipoMercancia: '',
        numeroContrato: '',
        lineas: lineasVacias(),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/booking', (req, res, next) => {
    try {
      const valores = valoresDesdeFormulario(req.body as Record<string, unknown>);
      const empresaId = Number(valores.empresaId);
      const viajeId = Number(valores.viajeId);

      if (!Number.isInteger(empresaId) || empresaId <= 0) {
        renderizarFormulario(res, db, valores, {
          errores: ['Seleccione una empresa exportadora válida.'],
        });
        return;
      }

      const resultado = registrarBooking(db, {
        empresaExportadoraId: empresaId,
        viajeId,
        tipoMercancia: valores.tipoMercancia,
        numeroContrato: valores.numeroContrato,
        detalles: detallesDesde(valores),
      });

      switch (resultado.tipo) {
        case 'datos_invalidos':
          renderizarFormulario(res, db, valores, { errores: resultado.errores });
          return;
        case 'sin_cupo':
          renderizarFormulario(res, db, valores, { rechazo: resultado.mensaje });
          return;
        case 'rechazada_exportador':
          renderizarFormulario(res, db, valores, {
            rechazo: `La solicitud quedó en estado "${resultado.reserva.estadoReserva}": ${resultado.motivo}`,
          });
          return;
        case 'revalidacion_fallida':
          renderizarFormulario(res, db, valores, {
            rechazo:
              'Ya no existe capacidad disponible para la carga al momento de confirmar. La reserva quedó "Rechazada".',
          });
          return;
        case 'confirmada':
          res.redirect(`/booking/${resultado.reserva.id}/comprobante`);
          return;
      }
    } catch (error) {
      next(error);
    }
  });

  router.get('/booking/:id/comprobante', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(404).send('Reserva no encontrada.');
        return;
      }
      const reserva = obtenerReserva(db, id);
      if (!reserva) {
        res.status(404).send('Reserva no encontrada.');
        return;
      }
      renderizarComprobante(res, reserva);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
