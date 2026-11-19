CREATE TABLE agente_operativo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identificador_empleado TEXT NOT NULL UNIQUE,
  nombre_completo TEXT NOT NULL,
  correo_corporativo TEXT NOT NULL,
  zona_geografica_asignada TEXT NOT NULL,
  limite_maximo_reservas INTEGER NOT NULL CHECK (limite_maximo_reservas >= 0)
);

ALTER TABLE reserva
  ADD COLUMN agente_operativo_id INTEGER REFERENCES agente_operativo(id) ON DELETE SET NULL;

CREATE TABLE notificacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reserva_id INTEGER NOT NULL REFERENCES reserva(id) ON DELETE CASCADE,
  agente_operativo_id INTEGER REFERENCES agente_operativo(id) ON DELETE CASCADE,
  destinatario_tipo TEXT NOT NULL CHECK (destinatario_tipo IN ('agente', 'exportador')),
  destinatario_correo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  fecha TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_reserva_agente ON reserva(agente_operativo_id);
CREATE INDEX idx_notificacion_agente ON notificacion(agente_operativo_id);
CREATE INDEX idx_notificacion_reserva ON notificacion(reserva_id);
