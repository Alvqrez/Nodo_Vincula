-- ============================================================
-- Migración: modalidad de las citas (Presencial / Virtual)
-- Fecha: 2026-11-16
-- Idempotente: solo agrega la columna si todavía no existe.
-- Aplicar con:  cd backend && node migrations/run.js migrations/20261116_01_citas_modalidad.sql
-- ============================================================

SET @existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'citas'
    AND COLUMN_NAME = 'modalidad'
);

SET @sql := IF(
  @existe = 0,
  'ALTER TABLE citas ADD COLUMN modalidad ENUM(''Presencial'',''Virtual'') NULL DEFAULT ''Presencial'' AFTER lugar',
  'SELECT ''citas.modalidad ya existe; sin cambios'' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
