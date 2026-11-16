-- ============================================================
-- Migración: tipos de cita "Reunión con empresa" y "Reunión con vinculación"
-- Fecha: 2026-11-16
-- Amplía el ENUM citas.tipo; los valores existentes no cambian.
-- Idempotente: solo modifica la columna si aún no tiene los tipos nuevos.
-- Aplicar con:  cd backend && node migrations/run.js migrations/20261116_04_citas_tipos_reunion.sql
-- ============================================================

SET @tiene := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'citas'
    AND COLUMN_NAME = 'tipo'
    AND COLUMN_TYPE LIKE '%Reunión con empresa%'
);

SET @sql := IF(
  @tiene = 0,
  'ALTER TABLE citas MODIFY COLUMN tipo ENUM(''Asesoría'',''Revisión'',''Evaluación'',''Entrega'',''Otro'',''Reunión con empresa'',''Reunión con vinculación'') DEFAULT ''Asesoría''',
  'SELECT ''citas.tipo ya incluye los tipos de reunión; sin cambios'' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
