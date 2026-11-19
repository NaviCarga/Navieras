import { crearConexion, type BaseDatos } from './conexion';
import { sembrar, type ResumenSeed } from './seed';

const TABLAS = [
  'notificacion',
  'detalle_reserva',
  'reserva',
  'cupo_contenedor',
  'viaje',
  'agente_operativo',
  'integraciones_log',
  'empresa_exportadora',
  'buque',
  'puerto',
];

export function reiniciarDatos(db: BaseDatos): ResumenSeed {
  const reiniciar = db.transaction(() => {
    for (const tabla of TABLAS) {
      db.prepare(`DELETE FROM ${tabla}`).run();
    }
  });

  reiniciar();
  return sembrar(db);
}

if (require.main === module) {
  const db = crearConexion();
  const resumen = reiniciarDatos(db);
  console.log(
    `Datos de ejemplo reiniciados en data/app.db. Viajes: ${resumen.viajes}, cupos: ${resumen.cupos}, reservas: ${resumen.reservas}.`,
  );
  db.close();
}
