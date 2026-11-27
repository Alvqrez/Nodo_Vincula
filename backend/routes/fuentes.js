/** Gestiona las declaraciones del residente sobre el origen de su proyecto. */

/**
 * Fuente del proyecto de residencia (lado del residente).
 * El residente declara de dónde proviene su proyecto (propuesta propia, banco
 * de proyectos o empresa) y el Jefe de Vinculación la valida o rechaza desde
 * GET/PUT /api/jefe/fuentes.
 */
const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { auth, requireRol } = require("../middleware");
const { notificarSinBloquear } = require("../utils/notificacionPersistente");

const router = express.Router();
const soloResidente = [auth, requireRol("residente")];

const TIPOS = ["propia", "banco", "empresa"];
const TIPO_LABEL = {
  propia: "propuesta propia",
  banco: "banco de proyectos",
  empresa: "propuesta de la empresa",
};
const MAX_DESCRIPCION = 300;

function validarDatos(body) {
  const tipo = String(body?.tipo || "").trim();
  const descripcion = String(body?.descripcion || "").trim();
  if (!TIPOS.includes(tipo)) {
    return {
      error: "Elige el tipo de fuente: propuesta propia, banco de proyectos o empresa.",
    };
  }
  if (!descripcion) {
    return { error: "Describe brevemente la fuente de tu proyecto." };
  }
  if (descripcion.length > MAX_DESCRIPCION) {
    return {
      error: `La descripción admite ${MAX_DESCRIPCION} caracteres como máximo.`,
    };
  }
  return { tipo, descripcion };
}

async function obtenerResidente(usuarioId) {
  const [rows] = await db.execute(
    `SELECT r.id, CONCAT(u.nombre,' ',u.apellidos) AS nombre
     FROM residentes r JOIN usuarios u ON r.usuario_id = u.id
     WHERE r.usuario_id = ?`,
    [usuarioId],
  );
  return rows[0] || null;
}

async function avisarJefes(io, { titulo, mensaje }) {
  const [jefes] = await db.execute(
    "SELECT id FROM usuarios WHERE rol = 'jefe' AND activo = 1",
  );
  for (const j of jefes) {
    await notificarSinBloquear(io, {
      usuarioId: j.id,
      tipo: "REVISION",
      titulo,
      mensaje,
      icon: "file-text",
      iconColor: "#2196F3",
      iconBg: "#E3F2FD",
      actionScreen: "fuentes",
      actionLabel: "Revisar fuente",
      // Sin metadata: GET /api/notificaciones aún hace JSON.parse sobre un
      // objeto ya parseado por mysql2 y fallaría (ver notificaciones.js).
    });
  }
}

// ── GET /api/fuentes/mias ─────────────────────────────────────────────────────
// El residente consulta aquí los datos y el estado de sus propias declaraciones.
router.get("/mias", ...soloResidente, async (req, res) => {
  try {
    const residente = await obtenerResidente(req.user.id);
    if (!residente)
      return res
        .status(403)
        .json({ ok: false, mensaje: "El usuario no es residente." });

    const [rows] = await db.execute(
      `SELECT f.id, f.tipo, f.descripcion, f.estado, f.fecha_revision,
              f.observaciones, CONCAT(u.nombre,' ',u.apellidos) AS revisado_por
       FROM fuentes_informacion f
       LEFT JOIN usuarios u ON f.revisado_por = u.id
       WHERE f.residente_id = ?
       ORDER BY f.id DESC`,
      [residente.id],
    );

    const fuentes = rows.map((f) => ({
      id: f.id,
      tipo: f.tipo,
      descripcion: f.descripcion,
      estado: f.estado,
      observaciones: f.observaciones || null,
      revisadoPor: f.revisado_por || null,
      fechaRevision: f.fecha_revision
        ? new Date(f.fecha_revision).toISOString().split("T")[0]
        : null,
    }));

    return res.json({ ok: true, fuentes });
  } catch (err) {
    console.error("Error en GET /fuentes/mias:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ── POST /api/fuentes ─────────────────────────────────────────────────────────
router.post("/", ...soloResidente, async (req, res) => {
  const datos = validarDatos(req.body);
  if (datos.error)
    return res.status(400).json({ ok: false, mensaje: datos.error });

  try {
    const residente = await obtenerResidente(req.user.id);
    if (!residente)
      return res
        .status(403)
        .json({ ok: false, mensaje: "El usuario no es residente." });

    const [activas] = await db.execute(
      `SELECT estado FROM fuentes_informacion
       WHERE residente_id = ? AND estado IN ('Pendiente','Validada') LIMIT 1`,
      [residente.id],
    );
    if (activas.length) {
      const mensaje =
        activas[0].estado === "Validada"
          ? "Tu fuente ya fue validada; no puedes registrar otra."
          : "Ya registraste una fuente y está pendiente de validación. Puedes editarla mientras no la revisen.";
      return res.status(409).json({ ok: false, mensaje });
    }

    const id = `fte_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    await db.execute(
      `INSERT INTO fuentes_informacion (id, residente_id, tipo, descripcion, estado)
       VALUES (?,?,?,?,'Pendiente')`,
      [id, residente.id, datos.tipo, datos.descripcion],
    );

    await avisarJefes(req.app.get("io"), {
      titulo: "Nueva fuente de proyecto por validar",
      mensaje: `${residente.nombre} registró su fuente: ${TIPO_LABEL[datos.tipo]}.`,
    });

    return res.json({
      ok: true,
      id,
      mensaje: "Fuente registrada. Vinculación la revisará.",
    });
  } catch (err) {
    console.error("Error en POST /fuentes:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ── PUT /api/fuentes/:id ──────────────────────────────────────────────────────
// Corrige una fuente propia que está Pendiente o Rechazada; vuelve a Pendiente.
router.put("/:id", ...soloResidente, async (req, res) => {
  const datos = validarDatos(req.body);
  if (datos.error)
    return res.status(400).json({ ok: false, mensaje: datos.error });

  try {
    const residente = await obtenerResidente(req.user.id);
    if (!residente)
      return res
        .status(403)
        .json({ ok: false, mensaje: "El usuario no es residente." });

    const [rows] = await db.execute(
      "SELECT id, estado FROM fuentes_informacion WHERE id = ? AND residente_id = ?",
      [req.params.id, residente.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ ok: false, mensaje: "No se encontró esa fuente." });
    if (rows[0].estado === "Validada")
      return res.status(409).json({
        ok: false,
        mensaje: "Tu fuente ya fue validada; ya no se puede modificar.",
      });

    const estabaRechazada = rows[0].estado === "Rechazada";
    await db.execute(
      `UPDATE fuentes_informacion
       SET tipo = ?, descripcion = ?, estado = 'Pendiente',
           revisado_por = NULL, fecha_revision = NULL, observaciones = NULL
       WHERE id = ?`,
      [datos.tipo, datos.descripcion, req.params.id],
    );

    if (estabaRechazada) {
      await avisarJefes(req.app.get("io"), {
        titulo: "Fuente corregida por validar",
        mensaje: `${residente.nombre} corrigió su fuente: ${TIPO_LABEL[datos.tipo]}.`,
      });
    }

    return res.json({
      ok: true,
      mensaje: estabaRechazada
        ? "Fuente corregida. Vinculación la revisará de nuevo."
        : "Fuente actualizada.",
    });
  } catch (err) {
    console.error("Error en PUT /fuentes/:id:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

module.exports = router;
