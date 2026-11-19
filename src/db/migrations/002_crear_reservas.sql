CREATE TABLE empresa_exportadora (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rut TEXT NOT NULL UNIQUE,
  razon_social TEXT NOT NULL,
  correo_contacto TEXT NOT NULL,
  estado_comercial TEXT NOT NULL
);

CREATE TABLE reserva (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_booking TEXT NOT NULL UNIQUE,
  empresa_exportadora_id INTEGER NOT NULL REFERENCES empresa_exportadora(id),
  viaje_id INTEGER NOT NULL REFERENCES viaje(id),
  fecha_solicitud TEXT NOT NULL,
  cantidad_teu INTEGER NOT NULL CHECK (cantidad_teu >= 0),
  tipo_mercancia TEXT NOT NULL,
  plazo_maximo_cancelacion TEXT NOT NULL,
  estado_reserva TEXT NOT NULL
);

CREATE TABLE detalle_reserva (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reserva_id INTEGER NOT NULL REFERENCES reserva(id) ON DELETE CASCADE,
  tipo_contenedor TEXT NOT NULL,
  cantidad_solicitada INTEGER NOT NULL CHECK (cantidad_solicitada >= 0),
  peso_estimado_ton REAL NOT NULL CHECK (peso_estimado_ton >= 0)
);

CREATE INDEX idx_reserva_viaje ON reserva(viaje_id);
CREATE INDEX idx_reserva_empresa ON reserva(empresa_exportadora_id);
CREATE INDEX idx_detalle_reserva ON detalle_reserva(reserva_id);
