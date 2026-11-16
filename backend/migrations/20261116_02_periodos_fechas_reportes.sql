-- ============================================================================
-- 20261116_02 — Fechas límite de reportes por período
-- El Jefe de Vinculación define las 5 fechas límite de cada período; la
-- asignación de proyectos las usa para crear los reportes del residente.
-- Idempotente: cada columna se agrega solo si todavía no existe.
-- ============================================================================

SET @db := DATABASE();

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'periodos' AND COLUMN_NAME = 'fecha_preliminar') = 0,
  'ALTER TABLE periodos ADD COLUMN fecha_preliminar DATE NULL AFTER fecha_fin',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'periodos' AND COLUMN_NAME = 'fecha_parcial1') = 0,
  'ALTER TABLE periodos ADD COLUMN fecha_parcial1 DATE NULL AFTER fecha_preliminar',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'periodos' AND COLUMN_NAME = 'fecha_parcial2') = 0,
  'ALTER TABLE periodos ADD COLUMN fecha_parcial2 DATE NULL AFTER fecha_parcial1',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'periodos' AND COLUMN_NAME = 'fecha_parcial3') = 0,
  'ALTER TABLE periodos ADD COLUMN fecha_parcial3 DATE NULL AFTER fecha_parcial2',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'periodos' AND COLUMN_NAME = 'fecha_final') = 0,
  'ALTER TABLE periodos ADD COLUMN fecha_final DATE NULL AFTER fecha_parcial3',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
