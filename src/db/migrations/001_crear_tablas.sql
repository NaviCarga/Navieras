CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  aplicada_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE buque (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_imo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  capacidad_total_teu INTEGER NOT NULL CHECK (capacidad_total_teu >= 0),
  naviera_operadora TEXT NOT NULL
);

CREATE TABLE puerto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_unlocode TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  pais TEXT NOT NULL,
  zona_geografica TEXT NOT NULL
);

CREATE TABLE viaje (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_viaje TEXT NOT NULL UNIQUE,
  buque_id INTEGER NOT NULL REFERENCES buque(id),
  puerto_origen_id INTEGER NOT NULL REFERENCES puerto(id),
  puerto_destino_id INTEGER NOT NULL REFERENCES puerto(id),
  fecha_zarpe TEXT NOT NULL,
  fecha_arribo_estimada TEXT NOT NULL,
  capacidad_disponible_teu INTEGER NOT NULL CHECK (capacidad_disponible_teu >= 0),
  estado_viaje TEXT NOT NULL
);

CREATE TABLE cupo_contenedor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  viaje_id INTEGER NOT NULL REFERENCES viaje(id) ON DELETE CASCADE,
  tipo_contenedor TEXT NOT NULL,
  cantidad_total INTEGER NOT NULL CHECK (cantidad_total >= 0),
  cantidad_disponible INTEGER NOT NULL CHECK (cantidad_disponible >= 0 AND cantidad_disponible <= cantidad_total),
  UNIQUE (viaje_id, tipo_contenedor)
);

CREATE TABLE integraciones_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL DEFAULT (datetime('now')),
  sistema TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  parametros TEXT,
  resultado TEXT
);

CREATE INDEX idx_viaje_fecha_zarpe ON viaje(fecha_zarpe);
CREATE INDEX idx_cupo_viaje_tipo ON cupo_contenedor(viaje_id, tipo_contenedor);
