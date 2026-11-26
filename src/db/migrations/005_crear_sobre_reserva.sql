-- ajuste-hu-04-lista-espera (HU-04 CA2, HU-02, EST-01)
-- SobreReserva (subclase de Reserva): reserva "En lista de espera" por sobrecupo.
-- Buque.capacidadTotalTEU (base del tope de sobrecupo, 3 %) ya existe como
-- buque.capacidad_total_teu desde 001_crear_tablas.sql: no se vuelve a crear.

CREATE TABLE sobre_reserva (
  reserva_id INTEGER PRIMARY KEY REFERENCES reserva(id) ON DELETE CASCADE,
  posicion_lista_espera INTEGER CHECK (posicion_lista_espera IS NULL OR posicion_lista_espera >= 1),
  exceso_solicitado_teu INTEGER NOT NULL CHECK (exceso_solicitado_teu >= 0)
);

CREATE INDEX idx_sobre_reserva_posicion ON sobre_reserva(posicion_lista_espera);
