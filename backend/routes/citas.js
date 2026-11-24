/** Gestiona la agenda de los participantes y notifica los cambios de cada cita. */

const express = require("express");
const db = require("../db");
const { auth } = require("../middleware");

const router = express.Router();

// ── Catálogos ─────────────────────────────────────────────────────────────────
// Valores del ENUM citas.tipo en la BD (los dos últimos los agrega la
// migración 20261116_04_citas_tipos_reunion.sql).
const TIPOS_BD = [
  "Asesoría",
  "Revisión",
  "Evaluación",
  "Entrega",
  "Otro",
  "Reunión con empresa",
  "Reunión con vinculación",
];

// Tipos del formulario que equivalen a uno existente; se traducen siempre igual.
const TIPO_UI_A_BD = {
  "Revisión de avances": "Revisión",
  "Reunión con residente": "Asesoría",
};

const MODALIDADES = ["Presencial", "Virtual"];
const ESTADOS = ["Confirmada", "Cancelada", "Pendiente"];

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function normalizarTipo(tipo) {
  if (!tipo) return "Otro";
  if (TIPOS_BD.includes(tipo)) return tipo;
  return TIPO_UI_A_BD[tipo] || null;
}

// "2026-11-20 10:30:00" o Date → "20 nov 2026, 10:30" (sin conversión de zona horaria)
function formatearFechaHora(valor) {
  if (valor instanceof Date) {
    const d = valor;
    return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return String(valor);
  return `${Number(m[3])} ${MESES[Number(m[2]) - 1]} ${m[1]}, ${m[4]}:${m[5]}`;
}

// ── Personas con las que el usuario puede agendar una cita ───────────────────
// residente → su asesor · asesor → sus residentes · jefe → asesores y residentes activos.
// La relación asesor–residente se resuelve por las tres vías que usa el sistema:
// residentes.asesor_id, proyectos.asesor_id y proyecto_asesores.
async function participantesPermitidos(user) {
  if (user.rol === "residente") {
    const [rows] = await db.execute(
      `SELECT DISTINCT u.id, u.nombre, u.apellidos, a.departamento
       FROM residentes r
       JOIN asesores a ON (
         a.id = r.asesor_id
         OR a.id IN (SELECT p.asesor_id FROM proyectos p WHERE p.residente_id = r.id)
         OR a.id IN (
           SELECT pa.asesor_id FROM proyectos p
           JOIN proyecto_asesores pa ON pa.proyecto_id = p.id
           WHERE p.residente_id = r.id
         )
       )
       JOIN usuarios u ON u.id = a.usuario_id
       WHERE r.usuario_id = ? AND u.activo = 1
       ORDER BY u.nombre, u.apellidos`,
      [user.id],
    );
    return rows.map((r) => ({
      id: String(r.id),
      nombre: `${r.nombre} ${r.apellidos}`,
      rol: "asesor",
      contexto: r.departamento ? `Asesor · ${r.departamento}` : "Asesor",
    }));
  }

  if (user.rol === "asesor") {
    const [rows] = await db.execute(
      `SELECT DISTINCT u.id, u.nombre, u.apellidos, res.carrera, res.num_control
       FROM asesores a
       JOIN residentes res ON (
         res.asesor_id = a.id
         OR EXISTS (
           SELECT 1 FROM proyectos p
           WHERE p.residente_id = res.id AND p.asesor_id = a.id
         )
         OR EXISTS (
           SELECT 1 FROM proyectos p
           JOIN proyecto_asesores pa ON pa.proyecto_id = p.id
           WHERE p.residente_id = res.id AND pa.asesor_id = a.id
         )
       )
       JOIN usuarios u ON u.id = res.usuario_id
       WHERE a.usuario_id = ? AND u.activo = 1 AND res.estado <> 'baja'
       ORDER BY u.nombre, u.apellidos`,
      [user.id],
    );
    return rows.map((r) => ({
      id: String(r.id),
      nombre: `${r.nombre} ${r.apellidos}`,
      rol: "residente",
      contexto: [r.carrera, r.num_control].filter(Boolean).join(" · ") || "Residente",
    }));
  }

  if (user.rol === "jefe") {
    const [rows] = await db.execute(
      `SELECT u.id, u.nombre, u.apellidos, u.rol,
              a.departamento, r.carrera, r.num_control
       FROM usuarios u
       LEFT JOIN asesores a   ON a.usuario_id = u.id
       LEFT JOIN residentes r ON r.usuario_id = u.id
       WHERE u.activo = 1
         AND u.rol IN ('asesor', 'residente')
         AND (r.id IS NULL OR r.estado <> 'baja')
       ORDER BY u.rol, u.nombre, u.apellidos`,
    );
    return rows.map((r) => ({
      id: String(r.id),
      nombre: `${r.nombre} ${r.apellidos}`,
      rol: r.rol,
      contexto:
        r.rol === "asesor"
          ? r.departamento ? `Asesor · ${r.departamento}` : "Asesor"
          : [r.carrera, r.num_control].filter(Boolean).join(" · ") || "Residente",
    }));
  }

  return [];
}

// ── Notificación persistente + tiempo real para la otra persona ──────────────
// Nota: no se guarda `metadata` porque GET /api/notificaciones hace JSON.parse
// sobre una columna JSON que mysql2 ya entrega como objeto y responde 500.
async function notificar(req, usuarioId, { titulo, mensaje, evento, datosEvento }) {
  try {
    const [result] = await db.execute(
      `INSERT INTO notificaciones
         (usuario_id, tipo_notificacion, titulo, mensaje, icon, icon_color, icon_bg,
          action_screen, action_label, is_read)
       VALUES (?, 'SISTEMA', ?, ?, 'calendar', '#0D9488', '#CCFBF1',
               'calendario', 'Ver calendario', false)`,
      [usuarioId, titulo, mensaje],
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${usuarioId}`).emit(evento, datosEvento);
      io.to(`user_${usuarioId}`).emit("notificacion_nueva", {
        id: result.insertId,
        tipo_notificacion: "SISTEMA",
        titulo,
        mensaje,
        icon: "calendar",
        icon_color: "#0D9488",
        icon_bg: "#CCFBF1",
        action_screen: "calendario",
        action_label: "Ver calendario",
        created_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    // La cita ya quedó guardada; un fallo al avisar no la revierte.
    console.error("Error al notificar cita:", err);
  }
}

async function nombreDe(usuarioId) {
  const [rows] = await db.execute(
    "SELECT nombre, apellidos FROM usuarios WHERE id = ?",
    [usuarioId],
  );
  return rows.length ? `${rows[0].nombre} ${rows[0].apellidos}` : "Un usuario";
}

// ── GET /api/citas/participantes ─────────────────────────────────────────────
router.get("/participantes", auth, async (req, res) => {
  try {
    const participantes = await participantesPermitidos(req.user);
    return res.json({ ok: true, participantes });
  } catch (err) {
    console.error("Error al obtener participantes:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ── POST /api/citas ───────────────────────────────────────────────────────────
router.post("/", auth, async (req, res) => {
  const { participante_id, tipo, motivo, notas, fecha_hora, lugar, modalidad } =
    req.body;

  if (!fecha_hora)
    return res.status(400).json({ ok: false, mensaje: "fecha_hora es requerida." });

  const fechaCita = new Date(fecha_hora);
  if (Number.isNaN(fechaCita.getTime()))
    return res.status(400).json({ ok: false, mensaje: "La fecha de la cita no es válida." });

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (fechaCita < hoy) {
    return res.status(400).json({ ok: false, mensaje: "No puedes agendar citas en fechas pasadas." });
  }

  const tipoBD = normalizarTipo(tipo);
  if (!tipoBD)
    return res.status(400).json({ ok: false, mensaje: "Tipo de cita no válido." });

  const modalidadFinal = modalidad || "Presencial";
  if (!MODALIDADES.includes(modalidadFinal))
    return res.status(400).json({ ok: false, mensaje: "La modalidad debe ser Presencial o Virtual." });

  if (motivo && String(motivo).length > 200)
    return res.status(400).json({ ok: false, mensaje: "El concepto admite máximo 200 caracteres." });

  if (lugar && String(lugar).length > 150)
    return res.status(400).json({ ok: false, mensaje: "El lugar admite máximo 150 caracteres." });

  const solicitanteId = String(req.user.id);
  const participanteId = participante_id ? String(participante_id) : solicitanteId;
  const compartida = participanteId !== solicitanteId;

  try {
    if (compartida) {
      const permitidos = await participantesPermitidos(req.user);
      if (!permitidos.some((p) => p.id === participanteId)) {
        return res.status(403).json({
          ok: false,
          mensaje: "No puedes agendar una cita con esa persona.",
        });
      }
    }

    const [result] = await db.execute(
      `INSERT INTO citas
         (solicitante_id, participante_id, tipo, motivo, notas, fecha_hora, lugar, modalidad, estado)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        solicitanteId,
        participanteId,
        tipoBD,
        motivo || null,
        notas || null,
        fecha_hora,
        lugar || null,
        modalidadFinal,
        "Pendiente",
      ],
    );

    if (compartida) {
      const quien = await nombreDe(solicitanteId);
      const concepto = motivo || tipoBD;
      await notificar(req, participanteId, {
        titulo: `Nueva cita: ${concepto}`,
        mensaje: `${quien} te invitó a una cita (${tipoBD}, ${modalidadFinal}) el ${formatearFechaHora(fecha_hora)}. Confírmala o cancélala desde el calendario.`,
        evento: "cita_nueva",
        datosEvento: { id: result.insertId },
      });
    }

    return res.json({ ok: true, id: result.insertId, tipo: tipoBD });
  } catch (err) {
    console.error("Error al guardar cita:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ── GET /api/citas/mis-citas ──────────────────────────────────────────────────
// La agenda se construye con citas en las que la cuenta es solicitante o participante.
router.get("/mis-citas", auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT c.*,
          u1.nombre    AS solicitante_nombre,
          u1.apellidos AS solicitante_apellidos,
          u1.rol       AS solicitante_rol,
          u2.nombre    AS participante_nombre,
          u2.apellidos AS participante_apellidos,
          u2.rol       AS participante_rol,
          (c.solicitante_id = ?)  AS soy_solicitante,
          (c.participante_id = ?) AS soy_participante
        FROM citas c
        LEFT JOIN usuarios u1 ON u1.id = c.solicitante_id
        LEFT JOIN usuarios u2 ON u2.id = c.participante_id
        WHERE c.solicitante_id = ? OR c.participante_id = ?
        ORDER BY c.fecha_hora ASC`,
      [req.user.id, req.user.id, req.user.id, req.user.id],
    );
    const citas = rows.map((c) => ({
      ...c,
      soy_solicitante: Boolean(c.soy_solicitante),
      soy_participante: Boolean(c.soy_participante),
      compartida: c.solicitante_id !== c.participante_id,
    }));
    return res.json({ ok: true, citas });
  } catch (err) {
    console.error("Error al obtener citas:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ── PATCH /api/citas/:id ──────────────────────────────────────────────────────
router.patch("/:id", auth, async (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS.includes(estado))
    return res.status(400).json({ ok: false, mensaje: "Estado inválido." });

  try {
    // SEGURIDAD FIX #7: Verificar que el usuario sea participante o solicitante de la cita
    // Antes: UPDATE sin verificar propiedad → cualquier usuario podía cancelar citas ajenas
    const [rows] = await db.execute(
      `SELECT id, solicitante_id, participante_id, estado, motivo, tipo, fecha_hora
       FROM citas WHERE id = ? AND (solicitante_id = ? OR participante_id = ?)`,
      [req.params.id, req.user.id, req.user.id],
    );

    if (!rows.length) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permisos para modificar esta cita.",
      });
    }

    const cita = rows[0];
    const yo = String(req.user.id);
    const compartida = String(cita.solicitante_id) !== String(cita.participante_id);

    if (cita.estado === "Cancelada" && estado !== "Cancelada") {
      return res.status(400).json({
        ok: false,
        mensaje: "La cita ya fue cancelada. Agenda una nueva si la necesitas.",
      });
    }

    if (estado === "Confirmada" && compartida && String(cita.participante_id) !== yo) {
      return res.status(403).json({
        ok: false,
        mensaje: "Solo la persona invitada puede confirmar la cita.",
      });
    }

    await db.execute("UPDATE citas SET estado=? WHERE id=?", [estado, req.params.id]);

    if (compartida && estado !== cita.estado) {
      const otra =
        String(cita.solicitante_id) === yo ? cita.participante_id : cita.solicitante_id;
      const quien = await nombreDe(yo);
      const concepto = cita.motivo || cita.tipo;
      const verbo = estado === "Confirmada" ? "confirmó" : estado === "Cancelada" ? "canceló" : "dejó pendiente";
      await notificar(req, String(otra), {
        titulo: `Cita ${estado.toLowerCase()}: ${concepto}`,
        mensaje: `${quien} ${verbo} la cita del ${formatearFechaHora(cita.fecha_hora)}.`,
        evento: "cita_actualizada",
        datosEvento: { id: cita.id, estado },
      });
    }

    return res.json({ ok: true, estado });
  } catch (err) {
    console.error("Error al actualizar cita:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

module.exports = router;
