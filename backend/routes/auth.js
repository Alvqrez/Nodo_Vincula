const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { auth } = require("../middleware");

const router = express.Router();

// ── Helper: datos del usuario que recibe el frontend ──────────────────────────
// Lo usan /login y /me para que ambos devuelvan exactamente la misma forma:
// residente → asesorInfo + jefeInfo; asesor → residentesInfo.
async function buildUsuarioResponse(user) {
  const usuarioResponse = {
    id: user.id,
    nombre: user.nombre,
    apellidos: user.apellidos,
    correo: user.correo,
    rol: user.rol,
  };

  if (user.rol === "residente") {
    try {
      const [asesorRows] = await db.execute(
        `SELECT u.id AS usuarioId, u.nombre, u.apellidos, u.correo, a.departamento, a.num_empleado
         FROM residentes r
         JOIN asesores a ON r.asesor_id = a.id
         JOIN usuarios u ON a.usuario_id = u.id
         WHERE r.usuario_id = ?`,
        [user.id],
      );
      if (asesorRows.length > 0) {
        const a = asesorRows[0];
        usuarioResponse.asesorInfo = {
          usuarioId: String(a.usuarioId),
          nombre: `${a.nombre} ${a.apellidos}`,
          correo: a.correo,
          departamento: a.departamento || "Ciencias Básicas",
          numEmpleado: a.num_empleado || "—",
        };
      }
    } catch (_) {
      /* sin asesor asignado */
    }

    try {
      const [jefeRows] = await db.execute(
        `SELECT u.id AS usuarioId, u.nombre, u.apellidos, u.correo
         FROM jefes_vinculacion j
         JOIN usuarios u ON j.usuario_id = u.id
         LIMIT 1`,
      );
      if (jefeRows.length > 0) {
        const j = jefeRows[0];
        usuarioResponse.jefeInfo = {
          usuarioId: String(j.usuarioId),
          nombre: `${j.nombre} ${j.apellidos}`,
          correo: j.correo,
        };
      }
    } catch (_) {
      /* sin jefe */
    }
  }

  if (user.rol === "asesor") {
    try {
      const [resRows] = await db.execute(
        `SELECT u.id AS usuarioId, u.nombre, u.apellidos, u.correo,
                r.num_control, r.carrera, r.horas_completadas, r.horas_requeridas,
                e.nombre AS empresaNombre
         FROM asesores a
         JOIN residentes r  ON r.asesor_id = a.id
         JOIN usuarios u    ON r.usuario_id = u.id
         LEFT JOIN empresas e ON r.empresa_id = e.id
         WHERE a.usuario_id = ? AND r.estado = 'activo'`,
        [user.id],
      );
      usuarioResponse.residentesInfo = resRows.map((r) => ({
        usuarioId: String(r.usuarioId),
        nombre: `${r.nombre} ${r.apellidos}`,
        correo: r.correo,
        numControl: r.num_control,
        carrera: r.carrera,
        horasCompletadas: r.horas_completadas,
        horasRequeridas: r.horas_requeridas,
        empresa: r.empresaNombre || "—",
      }));
    } catch (_) {
      /* sin residentes */
    }
  }

  return usuarioResponse;
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { correo, password } = req.body;
  if (!correo || !password)
    return res
      .status(400)
      .json({ ok: false, mensaje: "Correo y contraseña requeridos." });

  try {
    const [rows] = await db.execute(
      "SELECT id, nombre, apellidos, correo, password_hash, rol, activo FROM usuarios WHERE correo = ?",
      [correo.toLowerCase().trim()],
    );

    if (rows.length === 0)
      return res
        .status(401)
        .json({ ok: false, mensaje: "Correo no encontrado." });

    const user = rows[0];

    if (!user.activo)
      return res
        .status(403)
        .json({ ok: false, mensaje: "Cuenta inactiva. Contacta soporte." });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res
        .status(401)
        .json({ ok: false, mensaje: "Contraseña incorrecta." });

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ ok: false, mensaje: "JWT_SECRET no está configurado en el servidor." });
    }
    const token = jwt.sign(
      { id: user.id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    const usuarioResponse = await buildUsuarioResponse(user);

    return res.json({ ok: true, token, usuario: usuarioResponse });
  } catch (err) {
    console.error("Error en login:", err);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
// Devuelve el mismo usuario que /login (lo usa el frontend para restaurar la
// sesión al recargar). Una cuenta desactivada no puede restaurar sesión, igual
// que no puede iniciarla.
router.get("/me", auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, nombre, apellidos, correo, rol, activo FROM usuarios WHERE id = ?",
      [req.user.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ ok: false, mensaje: "Usuario no encontrado." });

    if (!rows[0].activo)
      return res
        .status(403)
        .json({ ok: false, mensaje: "Cuenta inactiva. Contacta soporte." });

    const usuario = await buildUsuarioResponse(rows[0]);
    return res.json({ ok: true, usuario });
  } catch (err) {
    console.error("Error en /auth/me:", err);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
});

// ── POST /api/auth/nodo ──────────────────────────────────────────────────────
// Entrar con la cuenta de NODO. NODO emite un código de un solo uso (60 s) y aquí
// se canjea servidor a servidor (NODO_REDEEM_URL + VINCULA_SHARED_SECRET). Solo
// residentes: se empatan por número de control. Nadie se crea aquí: si la
// Jefatura de Vinculación no registró al residente, no entra.
const NO_REGISTRADO =
  "Tu residencia aún no está registrada en NODO Vincula. La Jefatura de Vinculación da de alta a los residentes.";

router.post("/nodo", async (req, res) => {
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(code))
    return res.status(400).json({ ok: false, mensaje: "El enlace de NODO no es válido." });

  const redeemUrl = process.env.NODO_REDEEM_URL;
  const secret = process.env.VINCULA_SHARED_SECRET;
  const institucion = process.env.NODO_INSTITUTION_ID || "tecmx";
  if (!redeemUrl || !secret || !process.env.JWT_SECRET)
    return res.status(503).json({ ok: false, mensaje: "La entrada con NODO no está configurada en este servidor." });

  try {
    let r;
    try {
      r = await fetch(redeemUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-vincula-secret": secret },
        body: JSON.stringify({ code }),
        signal: AbortSignal.timeout(8000),
      });
    } catch (e) {
      console.error("[auth/nodo] NODO no respondió:", e.name);
      return res.status(502).json({ ok: false, mensaje: "No pudimos comunicarnos con NODO. Intenta de nuevo en un momento." });
    }

    if (r.status === 410 || r.status === 400)
      return res.status(401).json({ ok: false, mensaje: "El enlace de NODO venció o ya se usó. Vuelve a entrar desde NODO." });
    if (!r.ok) {
      console.error("[auth/nodo] canje rechazado por NODO:", r.status);
      return res.status(502).json({ ok: false, mensaje: "NODO no pudo confirmar tu cuenta. Intenta de nuevo." });
    }

    const nodo = await r.json().catch(() => null);
    const identificador = typeof nodo?.identifier === "string" ? nodo.identifier.trim() : "";
    if (!identificador || nodo.institution_id !== institucion)
      return res.status(403).json({ ok: false, mensaje: NO_REGISTRADO });

    const [rows] = await db.execute(
      `SELECT u.id, u.nombre, u.apellidos, u.correo, u.rol, u.activo
         FROM residentes r JOIN usuarios u ON u.id = r.usuario_id
        WHERE r.num_control = ? AND u.rol = 'residente'`,
      [identificador],
    );
    if (!rows.length) return res.status(404).json({ ok: false, mensaje: NO_REGISTRADO, codigo: "no_registrado" });

    const user = rows[0];
    if (!user.activo)
      return res.status(403).json({ ok: false, mensaje: "Cuenta inactiva. Contacta soporte." });

    const token = jwt.sign({ id: user.id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: "8h" });
    const usuario = await buildUsuarioResponse(user);
    return res.json({ ok: true, token, usuario });
  } catch (err) {
    console.error("Error en /auth/nodo:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno del servidor." });
  }
});

module.exports = router;
