import { Router, type Response } from 'express';
import type { BaseDatos } from '../db/conexion';
import {
  consultarDisponibilidad,
  listarEmpresas,
  obtenerReserva,
  obtenerReservaPorCodigo,
} from '../dominio/repositorios';
import type { NuevoDetalleReserva, ReservaConDetalles } from '../dominio/tipos';
import { crearSistemaFlota } from '../integraciones/sistemaFlota';
import { registrarBooking } from '../servicios/booking';
import { cancelarReserva, fechaHoy } from '../servicios/inventario';
import { cerrarListasPorZarpe } from '../servicios/listaEspera';

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

  // HU-04 CA4: vencimiento perezoso de las listas de espera al cargar /booking, /booking/estado y el comprobante
  router.get(['/booking', '/booking/estado', '/booking/:id/comprobante'], (_req, _res, next) => {
    try {
      cerrarListasPorZarpe(db, fechaHoy());
      next();
    } catch (error) {
      next(error);
    }
  });

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
        case 'lista_espera':
          // HU-04 CA2: se informa estado y posición en el comprobante
          res.redirect(`/booking/${resultado.reserva.id}/comprobante`);
          return;
        case 'rechazada_sobrecupo':
          renderizarFormulario(res, db, valores, {
            rechazo: `La solicitud ${resultado.reserva.codigoBooking} quedó en estado "Rechazada". ${resultado.motivo} No se descontaron cupos del viaje.`,
          });
          return;
        case 'rechazada_exportador':
          renderizarFormulario(res, db, valores, {
            rechazo: `La solicitud quedó en estado "${resultado.reserva.estadoReserva}": ${resultado.motivo}`,
          });
          return;
        case 'revalidacion_fallida':
          renderizarFormulario(res, db, valores, {
            rechazo: `Ya no existe capacidad disponible para la carga al momento de confirmar. La reserva ${resultado.reserva.codigoBooking} quedó "Rechazada". ${resultado.motivo}`,
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

  // CU-07 — Consultar estado de una reserva (HU-04 CA3)
  router.get('/booking/estado', (req, res, next) => {
    try {
      const codigo = texto(req.query.codigo);
      const mensajeQuery = texto(req.query.mensaje);
      const reserva = codigo ? obtenerReservaPorCodigo(db, codigo) : undefined;
      let mensaje = mensajeQuery || undefined;
      let error = req.query.error === '1';
      if (codigo && !reserva) {
        mensaje = `No existe una reserva con el código ${codigo}.`;
        error = true;
      }
      res.render('estado-reserva', { codigo, reserva, mensaje, error });
    } catch (error) {
      next(error);
    }
  });

  // HU-02 «Cancelar reserva en lista de espera» (exportador; sin plazo máximo)
  router.post('/booking/:id/cancelar', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const reserva = Number.isInteger(id) && id > 0 ? obtenerReserva(db, id) : undefined;
      if (!reserva) {
        res.status(404).send('Reserva no encontrada.');
        return;
      }
      const volver = (mensaje: string, error = false) => {
        const parametros = new URLSearchParams({ codigo: reserva.codigoBooking, mensaje });
        if (error) parametros.set('error', '1');
        res.redirect(`/booking/estado?${parametros.toString()}`);
      };
      if (reserva.estadoReserva !== 'En lista de espera') {
        volver(
          `Solo se pueden cancelar desde aquí las reservas "En lista de espera"; su estado actual es "${reserva.estadoReserva}".`,
          true,
        );
        return;
      }
      const resultado = cancelarReserva(db, id, crearSistemaFlota(db));
      if (resultado.tipo === 'cancelada_lista_espera') {
        volver(`Reserva ${reserva.codigoBooking} cancelada: dejó la lista de espera del viaje.`);
        return;
      }
      volver(`No se pudo cancelar la reserva ${reserva.codigoBooking}.`, true);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
