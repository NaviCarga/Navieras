import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const RUTA_POR_DEFECTO = path.join(process.cwd(), 'data', 'app.db');

export type BaseDatos = Database.Database;

export function crearConexion(rutaDb: string = process.env.DB_PATH ?? RUTA_POR_DEFECTO): BaseDatos {
  if (rutaDb !== ':memory:') {
    fs.mkdirSync(path.dirname(rutaDb), { recursive: true });
  }
  const db = new Database(rutaDb);
  db.pragma('foreign_keys = ON');
  aplicarMigraciones(db);
  return db;
}

export function aplicarMigraciones(db: BaseDatos): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      aplicada_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const directorio = path.join(process.cwd(), 'src', 'db', 'migrations');
  const archivos = fs
    .readdirSync(directorio)
    .filter((archivo) => archivo.endsWith('.sql'))
    .sort();

  const aplicadas = new Set(
    (db.prepare('SELECT nombre FROM schema_migrations').all() as Array<{ nombre: string }>).map(
      (fila) => fila.nombre,
    ),
  );
  const registrar = db.prepare('INSERT INTO schema_migrations (nombre) VALUES (?)');

  for (const archivo of archivos) {
    if (aplicadas.has(archivo)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(directorio, archivo), 'utf8');
    const aplicar = db.transaction(() => {
      db.exec(sql);
      registrar.run(archivo);
    });
    aplicar();
  }
}
