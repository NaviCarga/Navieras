import type { BaseDatos } from '../db/conexion';
import type { EmpresaExportadora } from '../dominio/tipos';

const NOMBRE_SISTEMA = 'Sistema de Evaluación Comercial y Aduana';

export interface ResultadoEvaluacion {
  aprobado: boolean;
  motivo?: string;
}

export interface EvaluacionComercial {
  validarExportador(empresa: EmpresaExportadora): ResultadoEvaluacion;
}

export class EvaluacionComercialSimulada implements EvaluacionComercial {
  constructor(private readonly db: BaseDatos) {}

  validarExportador(empresa: EmpresaExportadora): ResultadoEvaluacion {
    const aprobado = empresa.estadoComercial === 'Activa';
    const motivo = aprobado
      ? undefined
      : 'El exportador registra un bloqueo comercial o aduanero vigente.';

    this.db
      .prepare(
        `INSERT INTO integraciones_log (sistema, mensaje, parametros, resultado)
         VALUES (?, ?, ?, ?)`,
      )
      .run(
        NOMBRE_SISTEMA,
        'Validar estado comercial y documentación aduanera',
        JSON.stringify({ rut: empresa.rut, estadoComercial: empresa.estadoComercial }),
        aprobado ? 'Cliente y carga validados' : (motivo ?? 'Cliente bloqueado'),
      );

    return aprobado ? { aprobado } : { aprobado, motivo };
  }
}

export function crearEvaluacionComercial(db: BaseDatos): EvaluacionComercial {
  return new EvaluacionComercialSimulada(db);
}
