import type { BaseDatos } from '../db/conexion';
import type {
  AgenteOperativo,
  Buque,
  CupoContenedor,
  DetalleReserva,
  EmpresaExportadora,
  FiltrosDisponibilidad,
  Notificacion,
  NuevaNotificacion,
  NuevaReserva,
  Puerto,
  ReservaConDetalles,
  Viaje,
  ViajeConCupos,
} from './tipos';

interface FilaBuque {
  id: number;
  codigo_imo: string;
  nombre: string;
  capacidad_total_teu: number;
  naviera_operadora: string;
}

interface FilaPuerto {
  id: number;
  codigo_unlocode: string;
  nombre: string;
  pais: string;
  zona_geografica: string;
}

interface FilaViaje {
  id: number;
  codigo_viaje: string;
  buque_id: number;
  puerto_origen_id: number;
  puerto_destino_id: number;
  fecha_zarpe: string;
  fecha_arribo_estimada: string;
  capacidad_disponible_teu: number;
  estado_viaje: string;
}

interface FilaCupo {
  id: number;
  viaje_id: number;
  tipo_contenedor: string;
  cantidad_total: number;
  cantidad_disponible: number;
}

interface FilaDisponibilidad {
  id: number;
  codigo_viaje: string;
  buque_nombre: string;
  puerto_origen: string;
  puerto_destino: string;
  fecha_zarpe: string;
  fecha_arribo_estimada: string;
  capacidad_disponible_teu: number;
  estado_viaje: string;
  cupo_id: number;
  tipo_contenedor: string;
  cantidad_total: number;
  cantidad_disponible: number;
}

interface FilaDetalleReserva {
  id: number;
  reserva_id: number;
  tipo_contenedor: string;
  cantidad_solicitada: number;
  peso_estimado_ton: number;
}

interface FilaReserva {
  id: number;
  codigo_booking: string;
  empresa_exportadora_id: number;
  viaje_id: number;
  fecha_solicitud: string;
  cantidad_teu: number;
  tipo_mercancia: string;
  numero_contrato: string | null;
  plazo_maximo_cancelacion: string;
  estado_reserva: string;
  posicion_lista_espera: number | null;
  exceso_solicitado_teu: number | null;
  empresa_rut: string;
  empresa_razon_social: string;
  empresa_correo_contacto: string;
  empresa_estado_comercial: string;
  codigo_viaje: string;
  buque_id: number;
  puerto_origen_id: number;
  puerto_destino_id: number;
  fecha_zarpe: string;
  fecha_arribo_estimada: string;
  capacidad_disponible_teu: number;
  estado_viaje: string;
  buque_nombre: string;
  puerto_origen: string;
  puerto_destino: string;
  agente_id: number | null;
  agente_identificador: string | null;
  agente_nombre: string | null;
  agente_correo: string | null;
  agente_zona: string | null;
  agente_limite: number | null;
  agente_reservas_activas: number | null;
}

interface FilaAgente {
  id: number;
  identificador_empleado: string;
  nombre_completo: string;
  correo_corporativo: string;
  zona_geografica_asignada: string;
  limite_maximo_reservas: number;
  reservas_activas_actuales: number;
}

interface FilaNotificacion {
  id: number;
  reserva_id: number;
  agente_operativo_id: number | null;
  destinatario_tipo: 'agente' | 'exportador';
  destinatario_correo: string;
  tipo: string;
  mensaje: string;
  fecha: string;
}

interface FilaEmpresa {
  id: number;
  rut: string;
  razon_social: string;
  correo_contacto: string;
  estado_comercial: string;
}

const SELECT_RESERVA = `
  SELECT r.id,
         r.codigo_booking,
         r.empresa_exportadora_id,
         r.viaje_id,
         r.fecha_solicitud,
         r.cantidad_teu,
         r.tipo_mercancia,
         r.numero_contrato,
         r.plazo_maximo_cancelacion,
         r.estado_reserva,
         sr.posicion_lista_espera,
         sr.exceso_solicitado_teu,
         e.rut AS empresa_rut,
         e.razon_social AS empresa_razon_social,
         e.correo_contacto AS empresa_correo_contacto,
         e.estado_comercial AS empresa_estado_comercial,
         v.codigo_viaje,
         v.buque_id,
         v.puerto_origen_id,
         v.puerto_destino_id,
         v.fecha_zarpe,
         v.fecha_arribo_estimada,
         v.capacidad_disponible_teu,
         v.estado_viaje,
         b.nombre AS buque_nombre,
         po.nombre AS puerto_origen,
         pd.nombre AS puerto_destino,
         a.id AS agente_id,
         a.identificador_empleado AS agente_identificador,
         a.nombre_completo AS agente_nombre,
         a.correo_corporativo AS agente_correo,
         a.zona_geografica_asignada AS agente_zona,
         a.limite_maximo_reservas AS agente_limite,
         (SELECT COUNT(*)
          FROM reserva r2
          WHERE r2.agente_operativo_id = a.id
            AND r2.estado_reserva = 'Confirmada') AS agente_reservas_activas
  FROM reserva r
  JOIN empresa_exportadora e ON e.id = r.empresa_exportadora_id
  JOIN viaje v ON v.id = r.viaje_id
  JOIN buque b ON b.id = v.buque_id
  JOIN puerto po ON po.id = v.puerto_origen_id
  JOIN puerto pd ON pd.id = v.puerto_destino_id
  LEFT JOIN agente_operativo a ON a.id = r.agente_operativo_id
  LEFT JOIN sobre_reserva sr ON sr.reserva_id = r.id
`;

function mapearBuque(fila: FilaBuque): Buque {
  return {
    id: fila.id,
    codigoIMO: fila.codigo_imo,
    nombre: fila.nombre,
    capacidadTotalTEU: fila.capacidad_total_teu,
    navieraOperadora: fila.naviera_operadora,
  };
}

function mapearPuerto(fila: FilaPuerto): Puerto {
  return {
    id: fila.id,
    codigoUNLOCODE: fila.codigo_unlocode,
    nombre: fila.nombre,
    pais: fila.pais,
    zonaGeografica: fila.zona_geografica,
  };
}

function mapearViaje(fila: FilaViaje): Viaje {
  return {
    id: fila.id,
    codigoViaje: fila.codigo_viaje,
    buqueId: fila.buque_id,
    puertoOrigenId: fila.puerto_origen_id,
    puertoDestinoId: fila.puerto_destino_id,
    fechaZarpe: fila.fecha_zarpe,
    fechaArriboEstimada: fila.fecha_arribo_estimada,
    capacidadDisponibleTEU: fila.capacidad_disponible_teu,
    estadoViaje: fila.estado_viaje,
  };
}

function mapearCupo(fila: FilaCupo): CupoContenedor {
  return {
    id: fila.id,
    viajeId: fila.viaje_id,
    tipoContenedor: fila.tipo_contenedor,
    cantidadTotal: fila.cantidad_total,
    cantidadDisponible: fila.cantidad_disponible,
  };
}

function mapearDetalleReserva(fila: FilaDetalleReserva): DetalleReserva {
  return {
    id: fila.id,
    reservaId: fila.reserva_id,
    tipoContenedor: fila.tipo_contenedor,
    cantidadSolicitada: fila.cantidad_solicitada,
    pesoEstimadoTon: fila.peso_estimado_ton,
  };
}

function mapearReserva(
  fila: FilaReserva,
  detalles: DetalleReserva[],
): ReservaConDetalles {
  return {
    id: fila.id,
    codigoBooking: fila.codigo_booking,
    empresaExportadoraId: fila.empresa_exportadora_id,
    viajeId: fila.viaje_id,
    fechaSolicitud: fila.fecha_solicitud,
    cantidadTEU: fila.cantidad_teu,
    tipoMercancia: fila.tipo_mercancia,
    numeroContrato: fila.numero_contrato,
    plazoMaximoCancelacion: fila.plazo_maximo_cancelacion,
    estadoReserva: fila.estado_reserva,
    posicionListaEspera: fila.posicion_lista_espera ?? null,
    excesoSolicitadoTEU: fila.exceso_solicitado_teu ?? null,
    empresa: {
      id: fila.empresa_exportadora_id,
      rut: fila.empresa_rut,
      razonSocial: fila.empresa_razon_social,
      correoContacto: fila.empresa_correo_contacto,
      estadoComercial: fila.empresa_estado_comercial,
    },
    viaje: {
      id: fila.viaje_id,
      codigoViaje: fila.codigo_viaje,
      buqueId: fila.buque_id,
      puertoOrigenId: fila.puerto_origen_id,
      puertoDestinoId: fila.puerto_destino_id,
      fechaZarpe: fila.fecha_zarpe,
      fechaArriboEstimada: fila.fecha_arribo_estimada,
      capacidadDisponibleTEU: fila.capacidad_disponible_teu,
      estadoViaje: fila.estado_viaje,
    },
    detalles,
    buqueNombre: fila.buque_nombre,
    puertoOrigen: fila.puerto_origen,
    puertoDestino: fila.puerto_destino,
    agente:
      fila.agente_id === null
        ? null
        : {
            id: fila.agente_id,
            identificadorEmpleado: fila.agente_identificador ?? '',
            nombreCompleto: fila.agente_nombre ?? '',
            correoCorporativo: fila.agente_correo ?? '',
            zonaGeograficaAsignada: fila.agente_zona ?? '',
            reservasActivasActuales: fila.agente_reservas_activas ?? 0,
            limiteMaximoReservas: fila.agente_limite ?? 0,
          },
  };
}

function mapearAgente(fila: FilaAgente): AgenteOperativo {
  return {
    id: fila.id,
    identificadorEmpleado: fila.identificador_empleado,
    nombreCompleto: fila.nombre_completo,
    correoCorporativo: fila.correo_corporativo,
    zonaGeograficaAsignada: fila.zona_geografica_asignada,
    reservasActivasActuales: fila.reservas_activas_actuales,
    limiteMaximoReservas: fila.limite_maximo_reservas,
  };
}

function mapearEmpresa(fila: FilaEmpresa): EmpresaExportadora {
  return {
    id: fila.id,
    rut: fila.rut,
    razonSocial: fila.razon_social,
    correoContacto: fila.correo_contacto,
    estadoComercial: fila.estado_comercial,
  };
}

function mapearNotificacion(fila: FilaNotificacion): Notificacion {
  return {
    id: fila.id,
    reservaId: fila.reserva_id,
    agenteOperativoId: fila.agente_operativo_id,
    destinatarioTipo: fila.destinatario_tipo,
    destinatarioCorreo: fila.destinatario_correo,
    tipo: fila.tipo,
    mensaje: fila.mensaje,
    fecha: fila.fecha,
  };
}

export function listarBuques(db: BaseDatos): Buque[] {
  const filas = db.prepare('SELECT * FROM buque ORDER BY nombre').all() as FilaBuque[];
  return filas.map(mapearBuque);
}

export function listarPuertos(db: BaseDatos): Puerto[] {
  const filas = db.prepare('SELECT * FROM puerto ORDER BY nombre').all() as FilaPuerto[];
  return filas.map(mapearPuerto);
}

export function obtenerPuerto(db: BaseDatos, puertoId: number): Puerto | undefined {
  const fila = db.prepare('SELECT * FROM puerto WHERE id = ?').get(puertoId) as
    | FilaPuerto
    | undefined;
  return fila ? mapearPuerto(fila) : undefined;
}

export function listarViajes(db: BaseDatos): Viaje[] {
  const filas = db
    .prepare('SELECT * FROM viaje ORDER BY fecha_zarpe, id')
    .all() as FilaViaje[];
  return filas.map(mapearViaje);
}

export function listarCuposPorViaje(
  db: BaseDatos,
  viajeId: number,
  tipoContenedor?: string,
): CupoContenedor[] {
  const filas = tipoContenedor
    ? (db
        .prepare(
          'SELECT * FROM cupo_contenedor WHERE viaje_id = ? AND tipo_contenedor = ? ORDER BY tipo_contenedor',
        )
        .all(viajeId, tipoContenedor) as FilaCupo[])
    : (db
        .prepare('SELECT * FROM cupo_contenedor WHERE viaje_id = ? ORDER BY tipo_contenedor')
        .all(viajeId) as FilaCupo[]);
  return filas.map(mapearCupo);
}

export function consultarDisponibilidad(
  db: BaseDatos,
  filtros: FiltrosDisponibilidad,
): ViajeConCupos[] {
  const condiciones: string[] = [];
  const parametros: string[] = [];

  if (filtros.origen) {
    condiciones.push('po.nombre = ?');
    parametros.push(filtros.origen);
  }
  if (filtros.destino) {
    condiciones.push('pd.nombre = ?');
    parametros.push(filtros.destino);
  }
  if (filtros.tipoContenedor) {
    condiciones.push('cc.tipo_contenedor = ?');
    parametros.push(filtros.tipoContenedor);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  const filas = db
    .prepare(
      `SELECT v.id,
              v.codigo_viaje,
              b.nombre AS buque_nombre,
              po.nombre AS puerto_origen,
              pd.nombre AS puerto_destino,
              v.fecha_zarpe,
              v.fecha_arribo_estimada,
              v.capacidad_disponible_teu,
              v.estado_viaje,
              cc.id AS cupo_id,
              cc.tipo_contenedor,
              cc.cantidad_total,
              cc.cantidad_disponible
       FROM viaje v
       JOIN buque b ON b.id = v.buque_id
       JOIN puerto po ON po.id = v.puerto_origen_id
       JOIN puerto pd ON pd.id = v.puerto_destino_id
       JOIN cupo_contenedor cc ON cc.viaje_id = v.id
       ${where}
       ORDER BY v.fecha_zarpe ASC, v.id ASC, cc.tipo_contenedor ASC`,
    )
    .all(...parametros) as FilaDisponibilidad[];

  const porViaje = new Map<number, ViajeConCupos>();

  for (const fila of filas) {
    let viaje = porViaje.get(fila.id);
    if (!viaje) {
      viaje = {
        id: fila.id,
        codigoViaje: fila.codigo_viaje,
        buqueNombre: fila.buque_nombre,
        puertoOrigen: fila.puerto_origen,
        puertoDestino: fila.puerto_destino,
        fechaZarpe: fila.fecha_zarpe,
        fechaArriboEstimada: fila.fecha_arribo_estimada,
        capacidadDisponibleTEU: fila.capacidad_disponible_teu,
        estadoViaje: fila.estado_viaje,
        cupos: [],
      };
      porViaje.set(fila.id, viaje);
    }

    viaje.cupos.push({
      id: fila.cupo_id,
      viajeId: fila.id,
      tipoContenedor: fila.tipo_contenedor,
      cantidadTotal: fila.cantidad_total,
      cantidadDisponible: fila.cantidad_disponible,
    });
  }

  return Array.from(porViaje.values());
}

function detallesPorReserva(
  db: BaseDatos,
  reservaId?: number,
): Map<number, DetalleReserva[]> {
  const filas = reservaId
    ? (db
        .prepare('SELECT * FROM detalle_reserva WHERE reserva_id = ? ORDER BY id')
        .all(reservaId) as FilaDetalleReserva[])
    : (db.prepare('SELECT * FROM detalle_reserva ORDER BY id').all() as FilaDetalleReserva[]);

  const mapa = new Map<number, DetalleReserva[]>();
  for (const fila of filas) {
    const lista = mapa.get(fila.reserva_id) ?? [];
    lista.push(mapearDetalleReserva(fila));
    mapa.set(fila.reserva_id, lista);
  }
  return mapa;
}

export function listarReservas(db: BaseDatos): ReservaConDetalles[] {
  const filas = db
    .prepare(`${SELECT_RESERVA} ORDER BY r.fecha_solicitud DESC, r.id DESC`)
    .all() as FilaReserva[];
  const detalles = detallesPorReserva(db);
  return filas.map((fila) => mapearReserva(fila, detalles.get(fila.id) ?? []));
}

export function obtenerReserva(
  db: BaseDatos,
  reservaId: number,
): ReservaConDetalles | undefined {
  const fila = db
    .prepare(`${SELECT_RESERVA} WHERE r.id = ?`)
    .get(reservaId) as FilaReserva | undefined;
  if (!fila) {
    return undefined;
  }
  const detalles = detallesPorReserva(db, reservaId).get(reservaId) ?? [];
  return mapearReserva(fila, detalles);
}

export function crearReserva(db: BaseDatos, datos: NuevaReserva): ReservaConDetalles {
  const insertar = db.transaction(() => {
    const resultado = db
      .prepare(
        `INSERT INTO reserva (codigo_booking, empresa_exportadora_id, viaje_id, fecha_solicitud, cantidad_teu, tipo_mercancia, numero_contrato, plazo_maximo_cancelacion, estado_reserva)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        datos.codigoBooking,
        datos.empresaExportadoraId,
        datos.viajeId,
        datos.fechaSolicitud,
        datos.cantidadTEU,
        datos.tipoMercancia,
        datos.numeroContrato ?? null,
        datos.plazoMaximoCancelacion,
        datos.estadoReserva,
      );

    const reservaId = Number(resultado.lastInsertRowid);
    const insertarDetalle = db.prepare(
      `INSERT INTO detalle_reserva (reserva_id, tipo_contenedor, cantidad_solicitada, peso_estimado_ton)
       VALUES (?, ?, ?, ?)`,
    );
    for (const detalle of datos.detalles) {
      insertarDetalle.run(
        reservaId,
        detalle.tipoContenedor,
        detalle.cantidadSolicitada,
        detalle.pesoEstimadoTon,
      );
    }
    return reservaId;
  });

  const reservaId = insertar();
  const reserva = obtenerReserva(db, reservaId);
  if (!reserva) {
    throw new Error('No se pudo recuperar la reserva creada.');
  }
  return reserva;
}

const SELECT_AGENTE = `
  SELECT a.id,
         a.identificador_empleado,
         a.nombre_completo,
         a.correo_corporativo,
         a.zona_geografica_asignada,
         a.limite_maximo_reservas,
         (SELECT COUNT(*)
          FROM reserva r
          WHERE r.agente_operativo_id = a.id
            AND r.estado_reserva = 'Confirmada') AS reservas_activas_actuales
  FROM agente_operativo a
`;

export function listarEmpresas(db: BaseDatos): EmpresaExportadora[] {
  const filas = db
    .prepare('SELECT * FROM empresa_exportadora ORDER BY razon_social')
    .all() as FilaEmpresa[];
  return filas.map(mapearEmpresa);
}

export function obtenerEmpresa(
  db: BaseDatos,
  empresaId: number,
): EmpresaExportadora | undefined {
  const fila = db
    .prepare('SELECT * FROM empresa_exportadora WHERE id = ?')
    .get(empresaId) as FilaEmpresa | undefined;
  return fila ? mapearEmpresa(fila) : undefined;
}

export function listarAgentes(db: BaseDatos): AgenteOperativo[] {
  const filas = db
    .prepare(`${SELECT_AGENTE} ORDER BY a.zona_geografica_asignada, a.identificador_empleado`)
    .all() as FilaAgente[];
  return filas.map(mapearAgente);
}

export function obtenerAgente(
  db: BaseDatos,
  agenteId: number,
): AgenteOperativo | undefined {
  const fila = db.prepare(`${SELECT_AGENTE} WHERE a.id = ?`).get(agenteId) as
    | FilaAgente
    | undefined;
  return fila ? mapearAgente(fila) : undefined;
}

function reservasConFiltro(db: BaseDatos, condicion: string, parametro: number): ReservaConDetalles[] {
  const filas = db
    .prepare(`${SELECT_RESERVA} WHERE ${condicion} ORDER BY r.fecha_solicitud DESC, r.id DESC`)
    .all(parametro) as FilaReserva[];
  const detalles = detallesPorReserva(db);
  return filas.map((fila) => mapearReserva(fila, detalles.get(fila.id) ?? []));
}

export function listarReservasConfirmadasSinAgente(db: BaseDatos): ReservaConDetalles[] {
  const filas = db
    .prepare(
      `${SELECT_RESERVA}
       WHERE r.estado_reserva = 'Confirmada' AND r.agente_operativo_id IS NULL
       ORDER BY r.fecha_solicitud DESC, r.id DESC`,
    )
    .all() as FilaReserva[];
  const detalles = detallesPorReserva(db);
  return filas.map((fila) => mapearReserva(fila, detalles.get(fila.id) ?? []));
}

export function listarReservasDeAgente(
  db: BaseDatos,
  agenteId: number,
): ReservaConDetalles[] {
  return reservasConFiltro(
    db,
    "r.agente_operativo_id = ? AND r.estado_reserva = 'Confirmada'",
    agenteId,
  );
}

export function asignarAgenteAReserva(
  db: BaseDatos,
  reservaId: number,
  agenteId: number,
): boolean {
  const resultado = db
    .prepare(
      `UPDATE reserva
       SET agente_operativo_id = ?
       WHERE id = ? AND estado_reserva = 'Confirmada'`,
    )
    .run(agenteId, reservaId);
  return resultado.changes === 1;
}

export function registrarNotificacion(
  db: BaseDatos,
  datos: NuevaNotificacion,
): Notificacion {
  const resultado = db
    .prepare(
      `INSERT INTO notificacion (reserva_id, agente_operativo_id, destinatario_tipo, destinatario_correo, tipo, mensaje)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      datos.reservaId,
      datos.agenteOperativoId ?? null,
      datos.destinatarioTipo,
      datos.destinatarioCorreo,
      datos.tipo,
      datos.mensaje,
    );
  const fila = db
    .prepare('SELECT * FROM notificacion WHERE id = ?')
    .get(Number(resultado.lastInsertRowid)) as FilaNotificacion;
  return mapearNotificacion(fila);
}

export function listarNotificacionesDeAgente(
  db: BaseDatos,
  agenteId: number,
): Notificacion[] {
  const filas = db
    .prepare(
      `SELECT *
       FROM notificacion
       WHERE agente_operativo_id = ? AND destinatario_tipo = 'agente'
       ORDER BY fecha DESC, id DESC`,
    )
    .all(agenteId) as FilaNotificacion[];
  return filas.map(mapearNotificacion);
}

// ---------------------------------------------------------------------------
// ajuste-hu-04-lista-espera — SobreReserva y lista de espera (HU-04 CA2/CA3/CA4, HU-02, EST-01)
// ---------------------------------------------------------------------------

export function obtenerReservaPorCodigo(
  db: BaseDatos,
  codigoBooking: string,
): ReservaConDetalles | undefined {
  const fila = db
    .prepare('SELECT id FROM reserva WHERE codigo_booking = ?')
    .get(codigoBooking) as { id: number } | undefined;
  return fila ? obtenerReserva(db, fila.id) : undefined;
}

/** E: suma de cantidadTEU de las reservas del viaje "En lista de espera". */
export function teuEnListaEspera(db: BaseDatos, viajeId: number): number {
  const fila = db
    .prepare(
      `SELECT COALESCE(SUM(cantidad_teu), 0) AS total
       FROM reserva
       WHERE viaje_id = ? AND estado_reserva = 'En lista de espera'`,
    )
    .get(viajeId) as { total: number };
  return fila.total;
}

/** Registra la SobreReserva al final de la lista del viaje y devuelve su posición. */
export function registrarSobreReserva(
  db: BaseDatos,
  reservaId: number,
  excesoSolicitadoTEU: number,
): number {
  const reserva = db
    .prepare('SELECT viaje_id FROM reserva WHERE id = ?')
    .get(reservaId) as { viaje_id: number } | undefined;
  if (!reserva) {
    throw new Error(`No se encontró la reserva ${reservaId}.`);
  }
  const fila = db
    .prepare(
      `SELECT COALESCE(MAX(sr.posicion_lista_espera), 0) AS maximo
       FROM sobre_reserva sr
       JOIN reserva r ON r.id = sr.reserva_id
       WHERE r.viaje_id = ? AND sr.reserva_id <> ?`,
    )
    .get(reserva.viaje_id, reservaId) as { maximo: number };
  const posicion = fila.maximo + 1;
  db.prepare(
    `INSERT INTO sobre_reserva (reserva_id, posicion_lista_espera, exceso_solicitado_teu)
     VALUES (?, ?, ?)
     ON CONFLICT(reserva_id) DO UPDATE
       SET posicion_lista_espera = excluded.posicion_lista_espera,
           exceso_solicitado_teu = excluded.exceso_solicitado_teu`,
  ).run(reservaId, posicion, Math.max(0, excesoSolicitadoTEU));
  return posicion;
}

/** La reserva deja de figurar en la lista (se conserva la fila como historial). */
export function salirDeLista(db: BaseDatos, reservaId: number): void {
  db.prepare('UPDATE sobre_reserva SET posicion_lista_espera = NULL WHERE reserva_id = ?').run(
    reservaId,
  );
}

/** Renumera 1..n las posiciones del viaje conservando su orden relativo. */
export function renumerarLista(db: BaseDatos, viajeId: number): void {
  const filas = db
    .prepare(
      `SELECT sr.reserva_id
       FROM sobre_reserva sr
       JOIN reserva r ON r.id = sr.reserva_id
       WHERE r.viaje_id = ? AND sr.posicion_lista_espera IS NOT NULL
       ORDER BY sr.posicion_lista_espera, sr.reserva_id`,
    )
    .all(viajeId) as Array<{ reserva_id: number }>;
  const actualizar = db.prepare(
    'UPDATE sobre_reserva SET posicion_lista_espera = ? WHERE reserva_id = ?',
  );
  filas.forEach((fila, indice) => actualizar.run(indice + 1, fila.reserva_id));
}

/** Reservas "En lista de espera" del viaje, en orden de posición. */
export function listarListaEspera(db: BaseDatos, viajeId: number): ReservaConDetalles[] {
  const filas = db
    .prepare(
      `${SELECT_RESERVA}
       WHERE r.viaje_id = ? AND r.estado_reserva = 'En lista de espera'
       ORDER BY sr.posicion_lista_espera, r.id`,
    )
    .all(viajeId) as FilaReserva[];
  const detalles = detallesPorReserva(db);
  return filas.map((fila) => mapearReserva(fila, detalles.get(fila.id) ?? []));
}

export function capacidadTotalBuqueDeViaje(db: BaseDatos, viajeId: number): number | undefined {
  const fila = db
    .prepare(
      `SELECT b.capacidad_total_teu AS total
       FROM viaje v JOIN buque b ON b.id = v.buque_id
       WHERE v.id = ?`,
    )
    .get(viajeId) as { total: number } | undefined;
  return fila?.total;
}
