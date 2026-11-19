import { crearConexion, type BaseDatos } from './conexion';

export interface ResumenSeed {
  viajes: number;
  cupos: number;
  reservas: number;
}

const PUERTOS = [
  { codigo: 'CLSAI', nombre: 'San Antonio', pais: 'Chile', zona: 'Sudamérica' },
  { codigo: 'CNSHA', nombre: 'Shanghái', pais: 'China', zona: 'Asia-Pacífico' },
  { codigo: 'CLVAP', nombre: 'Valparaíso', pais: 'Chile', zona: 'Sudamérica' },
  { codigo: 'NLRTM', nombre: 'Rotterdam', pais: 'Países Bajos', zona: 'Europa' },
];

const BUQUES = [
  {
    codigoIMO: 'IMO-9000001',
    nombre: 'Buque Andino',
    capacidadTotalTEU: 5000,
    navieraOperadora: 'Naviera Guerrero',
  },
  {
    codigoIMO: 'IMO-9000002',
    nombre: 'Buque Pacífico',
    capacidadTotalTEU: 4000,
    navieraOperadora: 'Naviera Guerrero',
  },
];

const AGENTES = [
  {
    identificadorEmpleado: 'A-001',
    nombreCompleto: 'Ana Torres',
    correoCorporativo: 'ana.torres@navieraguerrero.example',
    zonaGeograficaAsignada: 'Asia-Pacífico',
    limiteMaximoReservas: 2,
  },
  {
    identificadorEmpleado: 'A-002',
    nombreCompleto: 'Bruno Silva',
    correoCorporativo: 'bruno.silva@navieraguerrero.example',
    zonaGeograficaAsignada: 'Asia-Pacífico',
    limiteMaximoReservas: 2,
  },
  {
    identificadorEmpleado: 'A-003',
    nombreCompleto: 'Carla Núñez',
    correoCorporativo: 'carla.nunez@navieraguerrero.example',
    zonaGeograficaAsignada: 'Europa',
    limiteMaximoReservas: 1,
  },
  {
    identificadorEmpleado: 'A-004',
    nombreCompleto: 'Diego Rojas',
    correoCorporativo: 'diego.rojas@navieraguerrero.example',
    zonaGeograficaAsignada: 'Sudamérica',
    limiteMaximoReservas: 3,
  },
];

const VIAJES = [
  {
    codigoViaje: 'VIA-001',
    codigoIMO: 'IMO-9000001',
    origen: 'San Antonio',
    destino: 'Shanghái',
    fechaZarpe: '2026-11-20',
    fechaArriboEstimada: '2026-12-18',
    capacidadDisponibleTEU: 25,
    estadoViaje: 'Programado',
  },
  {
    codigoViaje: 'VIA-002',
    codigoIMO: 'IMO-9000002',
    origen: 'Valparaíso',
    destino: 'Rotterdam',
    fechaZarpe: '2026-12-01',
    fechaArriboEstimada: '2027-01-05',
    capacidadDisponibleTEU: 0,
    estadoViaje: 'Programado',
  },
  {
    codigoViaje: 'VIA-003',
    codigoIMO: 'IMO-9000001',
    origen: 'San Antonio',
    destino: 'Rotterdam',
    fechaZarpe: '2027-01-10',
    fechaArriboEstimada: '2027-02-10',
    capacidadDisponibleTEU: 50,
    estadoViaje: 'Programado',
  },
  {
    codigoViaje: 'VIA-004',
    codigoIMO: 'IMO-9000002',
    origen: 'Valparaíso',
    destino: 'Shanghái',
    fechaZarpe: '2027-02-01',
    fechaArriboEstimada: '2027-03-01',
    capacidadDisponibleTEU: 4,
    estadoViaje: 'Programado',
  },
  {
    codigoViaje: 'VIA-005',
    codigoIMO: 'IMO-9000001',
    origen: 'San Antonio',
    destino: 'Valparaíso',
    fechaZarpe: '2027-03-01',
    fechaArriboEstimada: '2027-03-05',
    capacidadDisponibleTEU: 30,
    estadoViaje: 'Programado',
  },
  {
    codigoViaje: 'VIA-006',
    codigoIMO: 'IMO-9000002',
    origen: 'San Antonio',
    destino: 'Rotterdam',
    fechaZarpe: '2027-04-01',
    fechaArriboEstimada: '2027-05-05',
    capacidadDisponibleTEU: 15,
    estadoViaje: 'Programado',
  },
];

const CUPOS = [
  { codigoViaje: 'VIA-001', tipoContenedor: '40HQ', cantidadTotal: 25, cantidadDisponible: 25 },
  { codigoViaje: 'VIA-002', tipoContenedor: '40RF', cantidadTotal: 10, cantidadDisponible: 0 },
  { codigoViaje: 'VIA-003', tipoContenedor: '40HQ', cantidadTotal: 50, cantidadDisponible: 50 },
  { codigoViaje: 'VIA-003', tipoContenedor: '20GP', cantidadTotal: 15, cantidadDisponible: 15 },
  { codigoViaje: 'VIA-004', tipoContenedor: '20GP', cantidadTotal: 10, cantidadDisponible: 4 },
  { codigoViaje: 'VIA-005', tipoContenedor: '40HQ', cantidadTotal: 38, cantidadDisponible: 30 },
  { codigoViaje: 'VIA-006', tipoContenedor: '40HQ', cantidadTotal: 20, cantidadDisponible: 15 },
];

const EMPRESAS = [
  {
    rut: '76.111.111-1',
    razonSocial: 'Exportadora Andina SpA',
    correoContacto: 'contacto@andina.example',
    estadoComercial: 'Activa',
  },
  {
    rut: '77.222.222-2',
    razonSocial: 'Comercial del Sur Ltda',
    correoContacto: 'contacto@delsur.example',
    estadoComercial: 'Activa',
  },
  {
    rut: '78.333.333-3',
    razonSocial: 'Frutícola Central S.A.',
    correoContacto: 'contacto@fruticola.example',
    estadoComercial: 'Activa',
  },
  {
    rut: '79.999.999-9',
    razonSocial: 'Carga Rápida SpA',
    correoContacto: 'contacto@cargarapida.example',
    estadoComercial: 'Bloqueada',
  },
];

interface ReservaSeed {
  codigoBooking: string;
  rutEmpresa: string;
  codigoViaje: string;
  fechaSolicitud: string;
  cantidadTEU: number;
  tipoMercancia: string;
  numeroContrato: string;
  plazoMaximoCancelacion: string;
  estadoReserva: string;
  detalles: Array<{
    tipoContenedor: string;
    cantidadSolicitada: number;
    pesoEstimadoTon: number;
  }>;
  identificadorAgente?: string;
}

const RESERVAS: ReservaSeed[] = [
  {
    codigoBooking: 'BK-HU02-001',
    rutEmpresa: '76.111.111-1',
    codigoViaje: 'VIA-003',
    fechaSolicitud: '2026-11-01',
    cantidadTEU: 10,
    tipoMercancia: 'Carga general',
    numeroContrato: 'CT-2026-001',
    plazoMaximoCancelacion: '2027-01-03',
    estadoReserva: 'Reserva temporal',
    detalles: [{ tipoContenedor: '40HQ', cantidadSolicitada: 10, pesoEstimadoTon: 12.5 }],
  },
  {
    codigoBooking: 'BK-HU02-002',
    rutEmpresa: '77.222.222-2',
    codigoViaje: 'VIA-004',
    fechaSolicitud: '2026-11-02',
    cantidadTEU: 6,
    tipoMercancia: 'Textiles',
    numeroContrato: 'CT-2026-002',
    plazoMaximoCancelacion: '2027-01-25',
    estadoReserva: 'Reserva temporal',
    detalles: [{ tipoContenedor: '20GP', cantidadSolicitada: 6, pesoEstimadoTon: 8 }],
  },
  {
    codigoBooking: 'BK-HU02-003',
    rutEmpresa: '78.333.333-3',
    codigoViaje: 'VIA-005',
    fechaSolicitud: '2026-10-15',
    cantidadTEU: 8,
    tipoMercancia: 'Frutas',
    numeroContrato: 'CT-2026-003',
    plazoMaximoCancelacion: '2027-02-22',
    estadoReserva: 'Confirmada',
    detalles: [{ tipoContenedor: '40HQ', cantidadSolicitada: 8, pesoEstimadoTon: 15 }],
    identificadorAgente: 'A-004',
  },
  {
    codigoBooking: 'BK-HU03-001',
    rutEmpresa: '76.111.111-1',
    codigoViaje: 'VIA-001',
    fechaSolicitud: '2026-11-10',
    cantidadTEU: 5,
    tipoMercancia: 'Carga general',
    numeroContrato: 'CT-2026-004',
    plazoMaximoCancelacion: '2027-01-15',
    estadoReserva: 'Reserva temporal',
    detalles: [{ tipoContenedor: '40HQ', cantidadSolicitada: 5, pesoEstimadoTon: 12 }],
  },
  {
    codigoBooking: 'BK-HU03-002',
    rutEmpresa: '77.222.222-2',
    codigoViaje: 'VIA-006',
    fechaSolicitud: '2026-10-20',
    cantidadTEU: 5,
    tipoMercancia: 'Textiles',
    numeroContrato: 'CT-2026-005',
    plazoMaximoCancelacion: '2027-03-20',
    estadoReserva: 'Confirmada',
    detalles: [{ tipoContenedor: '40HQ', cantidadSolicitada: 5, pesoEstimadoTon: 10 }],
    identificadorAgente: 'A-003',
  },
];

export function sembrar(db: BaseDatos): ResumenSeed {
  const insertarPuerto = db.prepare(
    `INSERT INTO puerto (codigo_unlocode, nombre, pais, zona_geografica)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(codigo_unlocode) DO NOTHING`,
  );
  for (const puerto of PUERTOS) {
    insertarPuerto.run(puerto.codigo, puerto.nombre, puerto.pais, puerto.zona);
  }

  const insertarBuque = db.prepare(
    `INSERT INTO buque (codigo_imo, nombre, capacidad_total_teu, naviera_operadora)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(codigo_imo) DO NOTHING`,
  );
  for (const buque of BUQUES) {
    insertarBuque.run(
      buque.codigoIMO,
      buque.nombre,
      buque.capacidadTotalTEU,
      buque.navieraOperadora,
    );
  }

  const idPuerto = (nombre: string): number =>
    (db.prepare('SELECT id FROM puerto WHERE nombre = ?').get(nombre) as { id: number }).id;
  const idBuque = (codigoIMO: string): number =>
    (db.prepare('SELECT id FROM buque WHERE codigo_imo = ?').get(codigoIMO) as { id: number }).id;

  const insertarViaje = db.prepare(
    `INSERT INTO viaje (codigo_viaje, buque_id, puerto_origen_id, puerto_destino_id, fecha_zarpe, fecha_arribo_estimada, capacidad_disponible_teu, estado_viaje)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(codigo_viaje) DO NOTHING`,
  );
  for (const viaje of VIAJES) {
    insertarViaje.run(
      viaje.codigoViaje,
      idBuque(viaje.codigoIMO),
      idPuerto(viaje.origen),
      idPuerto(viaje.destino),
      viaje.fechaZarpe,
      viaje.fechaArriboEstimada,
      viaje.capacidadDisponibleTEU,
      viaje.estadoViaje,
    );
  }

  const idViaje = (codigoViaje: string): number =>
    (db.prepare('SELECT id FROM viaje WHERE codigo_viaje = ?').get(codigoViaje) as { id: number }).id;

  const insertarCupo = db.prepare(
    `INSERT INTO cupo_contenedor (viaje_id, tipo_contenedor, cantidad_total, cantidad_disponible)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(viaje_id, tipo_contenedor) DO NOTHING`,
  );
  for (const cupo of CUPOS) {
    insertarCupo.run(
      idViaje(cupo.codigoViaje),
      cupo.tipoContenedor,
      cupo.cantidadTotal,
      cupo.cantidadDisponible,
    );
  }

  const insertarEmpresa = db.prepare(
    `INSERT INTO empresa_exportadora (rut, razon_social, correo_contacto, estado_comercial)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(rut) DO NOTHING`,
  );
  for (const empresa of EMPRESAS) {
    insertarEmpresa.run(
      empresa.rut,
      empresa.razonSocial,
      empresa.correoContacto,
      empresa.estadoComercial,
    );
  }

  const idEmpresa = (rut: string): number =>
    (db.prepare('SELECT id FROM empresa_exportadora WHERE rut = ?').get(rut) as { id: number }).id;

  const insertarAgente = db.prepare(
    `INSERT INTO agente_operativo (identificador_empleado, nombre_completo, correo_corporativo, zona_geografica_asignada, limite_maximo_reservas)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(identificador_empleado) DO NOTHING`,
  );
  for (const agente of AGENTES) {
    insertarAgente.run(
      agente.identificadorEmpleado,
      agente.nombreCompleto,
      agente.correoCorporativo,
      agente.zonaGeograficaAsignada,
      agente.limiteMaximoReservas,
    );
  }

  const idAgente = (identificadorEmpleado: string): number =>
    (
      db
        .prepare('SELECT id FROM agente_operativo WHERE identificador_empleado = ?')
        .get(identificadorEmpleado) as { id: number }
    ).id;

  const insertarReserva = db.prepare(
    `INSERT INTO reserva (codigo_booking, empresa_exportadora_id, viaje_id, fecha_solicitud, cantidad_teu, tipo_mercancia, numero_contrato, plazo_maximo_cancelacion, estado_reserva)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(codigo_booking) DO NOTHING`,
  );
  const idReserva = (codigoBooking: string): number =>
    (
      db.prepare('SELECT id FROM reserva WHERE codigo_booking = ?').get(codigoBooking) as {
        id: number;
      }
    ).id;
  const insertarDetalle = db.prepare(
    `INSERT INTO detalle_reserva (reserva_id, tipo_contenedor, cantidad_solicitada, peso_estimado_ton)
     VALUES (?, ?, ?, ?)`,
  );

  for (const reserva of RESERVAS) {
    const resultado = insertarReserva.run(
      reserva.codigoBooking,
      idEmpresa(reserva.rutEmpresa),
      idViaje(reserva.codigoViaje),
      reserva.fechaSolicitud,
      reserva.cantidadTEU,
      reserva.tipoMercancia,
      reserva.numeroContrato,
      reserva.plazoMaximoCancelacion,
      reserva.estadoReserva,
    );
    if (resultado.changes === 0) {
      db.prepare(
        `UPDATE reserva
         SET numero_contrato = ?
         WHERE codigo_booking = ? AND numero_contrato IS NULL`,
      ).run(reserva.numeroContrato, reserva.codigoBooking);
    }
    if (resultado.changes > 0) {
      const reservaId = idReserva(reserva.codigoBooking);
      for (const detalle of reserva.detalles) {
        insertarDetalle.run(
          reservaId,
          detalle.tipoContenedor,
          detalle.cantidadSolicitada,
          detalle.pesoEstimadoTon,
        );
      }
    }
    if (reserva.identificadorAgente) {
      db.prepare(
        `UPDATE reserva
         SET agente_operativo_id = ?
         WHERE codigo_booking = ? AND agente_operativo_id IS NULL`,
      ).run(idAgente(reserva.identificadorAgente), reserva.codigoBooking);
    }
  }

  const totalViajes = (
    db.prepare('SELECT COUNT(*) AS total FROM viaje').get() as { total: number }
  ).total;
  const totalCupos = (
    db.prepare('SELECT COUNT(*) AS total FROM cupo_contenedor').get() as { total: number }
  ).total;
  const totalReservas = (
    db.prepare('SELECT COUNT(*) AS total FROM reserva').get() as { total: number }
  ).total;

  return { viajes: totalViajes, cupos: totalCupos, reservas: totalReservas };
}

if (require.main === module) {
  const db = crearConexion();
  const resumen = sembrar(db);
  console.log(
    `Datos de ejemplo cargados en data/app.db. Viajes: ${resumen.viajes}, cupos: ${resumen.cupos}, reservas: ${resumen.reservas}.`,
  );
  db.close();
}
