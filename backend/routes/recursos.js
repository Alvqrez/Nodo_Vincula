/** Permite publicar documentos por audiencia y consultar o descargar los que corresponden a la cuenta. */

/**
 * Biblioteca de recursos (guías, formatos y documentos oficiales).
 * El Jefe de Vinculación sube PDF/DOCX y elige a quién van dirigidos;
 * cada rol ve y descarga los suyos y los marcados para "todos".
 */
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const { auth, requireRol } = require("../middleware");
const { validarDocumento } = require("../utils/archivos");

const router = express.Router();
const soloJefe = [auth, requireRol("jefe")];

const ROLES_DESTINO = ["todos", "residente", "asesor", "jefe"];
const MAX_TITULO = 150;
const MAX_DESCRIPCION = 500;
const DIR_RECURSOS = path.join(__dirname, "..", "uploads", "recursos");

function rutaSegura(rutaArchivo) {
  // Solo se usa el nombre generado por el servidor, nunca una ruta del cliente.
  return path.join(DIR_RECURSOS, path.basename(String(rutaArchivo || "")));
}

function puedeVer(rol, rolDestino) {
  return rol === "jefe" || rolDestino === "todos" || rolDestino === rol;
}

function aRespuesta(r) {
  return {
    id: r.id,
    titulo: r.titulo,
    descripcion: r.descripcion || "",
    rolDestino: r.rol_destino,
    nombreArchivo: r.nombre_archivo,
    tipo: path.extname(r.nombre_archivo || "").replace(".", "").toUpperCase(),
    mime: r.mime,
    tamano: r.tamano,
    subidoPor: r.subido_por_nombre || null,
    createdAt: r.created_at,
  };
}

// ── GET /api/recursos ─────────────────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  try {
    const rol = req.user.rol;
    const filtro =
      rol === "jefe" ? "" : "WHERE r.rol_destino IN (?, 'todos')";
    const [rows] = await db.execute(
      `SELECT r.id, r.titulo, r.descripcion, r.rol_destino, r.nombre_archivo,
              r.mime, r.tamano, r.created_at,
              CONCAT(u.nombre,' ',u.apellidos) AS subido_por_nombre
       FROM recursos r
       LEFT JOIN usuarios u ON r.subido_por = u.id
       ${filtro}
       ORDER BY r.created_at DESC, r.id DESC`,
      rol === "jefe" ? [] : [rol],
    );
    return res.json({ ok: true, recursos: rows.map(aRespuesta) });
  } catch (err) {
    console.error("Error en GET /recursos:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ── POST /api/recursos ────────────────────────────────────────────────────────
router.post("/", ...soloJefe, async (req, res) => {
  const titulo = String(req.body?.titulo || "").trim();
  const descripcion = String(req.body?.descripcion || "").trim();
  const rolDestino = String(req.body?.rol_destino || "todos").trim();
  const { archivo, nombre_archivo } = req.body || {};

  if (!titulo)
    return res
      .status(400)
      .json({ ok: false, mensaje: "Escribe el título del recurso." });
  if (titulo.length > MAX_TITULO)
    return res.status(400).json({
      ok: false,
      mensaje: `El título admite ${MAX_TITULO} caracteres como máximo.`,
    });
  if (descripcion.length > MAX_DESCRIPCION)
    return res.status(400).json({
      ok: false,
      mensaje: `La descripción admite ${MAX_DESCRIPCION} caracteres como máximo.`,
    });
  if (!ROLES_DESTINO.includes(rolDestino))
    return res
      .status(400)
      .json({ ok: false, mensaje: "Elige a quién va dirigido el recurso." });

  const doc = validarDocumento({ archivo, nombreArchivo: nombre_archivo });
  if (!doc.ok) return res.status(400).json({ ok: false, mensaje: doc.mensaje });

  const id = `rec_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const nombreGuardado = `${id}${doc.extension}`;
  const rutaDestino = rutaSegura(nombreGuardado);
  // El nombre original solo se muestra y se usa en la descarga.
  const nombreOriginal = path.basename(String(nombre_archivo)).slice(0, 255);

  try {
    fs.mkdirSync(DIR_RECURSOS, { recursive: true });
    fs.writeFileSync(rutaDestino, doc.buffer);
  } catch (err) {
    console.error("Error al guardar recurso:", err);
    return res
      .status(500)
      .json({ ok: false, mensaje: "No se pudo guardar el archivo." });
  }

  try {
    await db.execute(
      `INSERT INTO recursos
         (id, titulo, descripcion, rol_destino, nombre_archivo, ruta_archivo, mime, tamano, subido_por)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        id,
        titulo,
        descripcion || null,
        rolDestino,
        nombreOriginal,
        nombreGuardado,
        doc.mime,
        doc.buffer.length,
        req.user.id,
      ],
    );
    const [rows] = await db.execute(
      `SELECT r.*, CONCAT(u.nombre,' ',u.apellidos) AS subido_por_nombre
       FROM recursos r LEFT JOIN usuarios u ON r.subido_por = u.id
       WHERE r.id = ?`,
      [id],
    );
    return res.json({
      ok: true,
      recurso: aRespuesta(rows[0]),
      mensaje: "Recurso publicado.",
    });
  } catch (err) {
    fs.rm(rutaDestino, { force: true }, () => {});
    console.error("Error en POST /recursos:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ── DELETE /api/recursos/:id ──────────────────────────────────────────────────
router.delete("/:id", ...soloJefe, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT ruta_archivo FROM recursos WHERE id = ?",
      [req.params.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ ok: false, mensaje: "El recurso ya no existe." });

    await db.execute("DELETE FROM recursos WHERE id = ?", [req.params.id]);
    fs.rm(rutaSegura(rows[0].ruta_archivo), { force: true }, (err) => {
      if (err) console.error("No se pudo borrar el archivo del recurso:", err);
    });
    return res.json({ ok: true, mensaje: "Recurso eliminado." });
  } catch (err) {
    console.error("Error en DELETE /recursos/:id:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ── GET /api/recursos/:id/archivo ─────────────────────────────────────────────
// Antes de enviar un recurso se comprueba que la audiencia del documento incluya a la cuenta.
router.get("/:id/archivo", auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT rol_destino, nombre_archivo, ruta_archivo, mime FROM recursos WHERE id = ?",
      [req.params.id],
    );
    if (!rows.length || !puedeVer(req.user.rol, rows[0].rol_destino))
      return res
        .status(404)
        .json({ ok: false, mensaje: "Recurso no encontrado." });

    const r = rows[0];
    const ruta = rutaSegura(r.ruta_archivo);
    if (!fs.existsSync(ruta))
      return res
        .status(404)
        .json({ ok: false, mensaje: "El archivo del recurso no está disponible." });

    const nombre = r.nombre_archivo || path.basename(ruta);
    const nombreAscii = nombre.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
    res.setHeader("Content-Type", r.mime || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${nombreAscii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
    );
    return res.sendFile(ruta);
  } catch (err) {
    console.error("Error en GET /recursos/:id/archivo:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

module.exports = router;
