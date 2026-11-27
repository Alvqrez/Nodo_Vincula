/** Comparte la consulta de cuenta activa y las condiciones de asignación de asesores. */

const db = require("../db");

// Coincide con las tres formas de asignación usadas al revisar un reporte.
// En las consultas que usan este fragmento, "res" es la fila del residente.
const ASESOR_ASIGNADO = `EXISTS (
  SELECT 1 FROM asesores a
  WHERE a.usuario_id = ? AND (
    res.asesor_id = a.id OR EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.residente_id = res.id AND (
        p.asesor_id = a.id OR EXISTS (
          SELECT 1 FROM proyecto_asesores pa
          WHERE pa.proyecto_id = p.id AND pa.asesor_id = a.id
        )
      )
    )
  )
)`;

async function usuarioActivo(id) {
  const [[usuario]] = await db.execute(
    "SELECT id, rol FROM usuarios WHERE id = ? AND activo = TRUE",
    [id],
  );
  return usuario;
}

module.exports = { ASESOR_ASIGNADO, usuarioActivo };
