/** Sirve un archivo de reporte después de comprobar la cuenta activa y su acceso al expediente. */

const express = require("express");
const path = require("path");
const db = require("../db");
const { auth } = require("../middleware");
const { EXTENSIONES_DOCUMENTO } = require("../utils/archivos");
const { ASESOR_ASIGNADO, usuarioActivo } = require("../utils/accesoExpediente");

const router = express.Router();
const uploads = path.join(__dirname, "..", "uploads");
const errorDescarga = (res, err) => {
  console.error("Error al descargar el reporte:", err);
  return res.status(500).json({ ok: false, mensaje: "No pudimos abrir el archivo." });
};
const noDisponible = (res) => res.status(404).json({ ok: false, mensaje: "Archivo no disponible." });

// Autenticar la cuenta es el primer filtro. La consulta posterior verifica el permiso sobre este reporte.
router.get("/:filename", auth, async (req, res, next) => {
  const { filename } = req.params;
  if (!/^[\w.-]+$/.test(filename) || !EXTENSIONES_DOCUMENTO.includes(path.extname(filename).toLowerCase())) {
    return noDisponible(res);
  }

  try {
    const usuario = await usuarioActivo(req.user.id);
    if (!usuario) return res.status(401).json({ ok: false, mensaje: "Sesión no válida." });

    // La consulta usa la ruta almacenada en el expediente y el rol vigente de la cuenta.
    const [reportes] = await db.execute(
      `SELECT 1 FROM reportes r
       JOIN residentes res ON res.id = r.residente_id
       WHERE BINARY r.archivo_url = ?
       AND ((? = 'residente' AND res.usuario_id = ?)
          OR (? = 'asesor' AND ${ASESOR_ASIGNADO})
          OR ? = 'jefe')
       LIMIT 1`,
      [`/uploads/${filename}`, usuario.rol, usuario.id, usuario.rol, usuario.id, usuario.rol],
    );
    if (!reportes.length) return noDisponible(res);

    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");
    // El archivo se lee desde uploads. Un archivo ausente y uno fuera del alcance de la cuenta usan la misma respuesta.
    res.sendFile(filename, { root: uploads }, (err) => {
      if (!err) return;
      if (res.headersSent) return next(err);
      if (err.status === 404) return noDisponible(res);
      return errorDescarga(res, err);
    });
  } catch (err) {
    return errorDescarga(res, err);
  }
});

module.exports = router;
