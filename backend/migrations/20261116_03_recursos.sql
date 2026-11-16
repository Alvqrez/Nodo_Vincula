-- ============================================================
-- Biblioteca de recursos: documentos oficiales que sube el Jefe
-- de Vinculación (guías, formatos) dirigidos a uno o todos los roles.
-- Idempotente. Aplicar desde backend/:
--   node migrations/run.js migrations/20261116_03_recursos.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS recursos (
  id             VARCHAR(50)  PRIMARY KEY,
  titulo         VARCHAR(150) NOT NULL,
  descripcion    VARCHAR(500) NULL,
  rol_destino    ENUM('todos','residente','asesor','jefe') NOT NULL DEFAULT 'todos',
  nombre_archivo VARCHAR(255) NOT NULL,   -- nombre original, solo para mostrar y descargar
  ruta_archivo   VARCHAR(255) NOT NULL,   -- nombre generado en backend/uploads/recursos/
  mime           VARCHAR(100) NOT NULL,
  tamano         INT          NOT NULL,   -- bytes
  subido_por     VARCHAR(50)  NULL,
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rol_destino (rol_destino),
  FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
