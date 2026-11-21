const express = require("express");
const db = require("../db");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("node:crypto");
const { auth, requireRol } = require("../middleware");

const router = express.Router();

// ── SEGURIDAD FIX #5: Validación de tipo de archivo ──────────────────────────
// Extensiones permitidas para reportes
const EXTENSIONES_PERMITIDAS = [".pdf", ".docx"];

// Magic bytes (firma hexadecimal) de los tipos de archivo permitidos
// PDF: empieza con %PDF → 25 50 44 46
// DOCX: es un ZIP → 50 4B 03 04
function validarTipoArchivo(buffer, extension) {
  if (extension === ".pdf") {
    // Los PDF empiezan con %PDF
    return buffer[0] === 0x25 &&
           buffer[1] === 0x50 &&
           buffer[2] === 0x44 &&
           buffer[3] === 0x46;
  }
  if (extension === ".docx") {
    // Los DOCX son ZIP internamente, empiezan con PK
    return buffer[0] === 0x50 &&
           buffer[1] === 0x4B &&
           buffer[2] === 0x03 &&
           buffer[3] === 0x04;
  }
  return false;
}

const TIPO_TO_ID = {
  preliminar: "preliminar", parcial1: 1, parcial2: 2, parcial3: 3, final: "final",
};
const TIPO_TO_TITLE = {
  preliminar: "Reporte Preliminar", parcial1: "Reporte Parcial 1",
  parcial2: "Reporte Parcial 2", parcial3: "Reporte Parcial 3", final: "Reporte Final",
};
const TIPO_TO_SUBTITLE = {
  preliminar: "Diagnóstico inicial del proyecto", parcial1: "Semana 1–4 · Diagnóstico inicial",
  parcial2: "Semana 5–8 · Desarrollo", parcial3: "Semana 9–12 · Integración",
  final: "Semana 13–16 · Cierre",
};
const ESTADO_TO_STATUS = {
  Pendiente: "Pendiente", Entregado: "Pendiente",
  "En Revisión": "En Revisión", Aprobado: "Aceptado", Rechazado: "Por corregir",
};

// ── GET /api/residente/reportes ───────────────────────────────────────────────
router.get("/reportes", auth, async (req, res) => {
  try {
    const [resRows] = await db.execute(
      "SELECT r.id, r.asesor_id FROM residentes r WHERE r.usuario_id = ?",
      [req.user.id],
    );
    if (!resRows.length)
      return res.status(403).json({ ok: false, mensaje: "El usuario no es residente." });

    const residenteId = resRows[0].id;
    const asesorId = resRows[0].asesor_id;

    let asesorNombre = "Asesor";
    if (asesorId) {
      const [asesorRows] = await db.execute(
        "SELECT u.nombre, u.apellidos FROM usuarios u JOIN asesores a ON a.usuario_id = u.id WHERE a.id = ?",
        [asesorId],
      );
      if (asesorRows.length)
        asesorNombre = `${asesorRows[0].nombre} ${asesorRows[0].apellidos}`;
    }

    const [rows] = await db.execute(
      `SELECT tipo, estado, fecha_entrega, fecha_limite, feedback, calificacion, archivo_url, nombre_archivo
       FROM reportes WHERE residente_id = ? ORDER BY FIELD(tipo,'preliminar','parcial1','parcial2','parcial3','final')`,
      [residenteId],
    );

    const TIPOS = ["preliminar", "parcial1", "parcial2", "parcial3", "final"];
    const reportes = TIPOS.map((tipo) => {
      const row = rows.find((r) => r.tipo === tipo);
      const fechaEntrega = row?.fecha_entrega
        ? new Date(row.fecha_entrega).toLocaleDateString("es-MX", {
            day: "2-digit", month: "short", year: "numeric",
          })
        : null;
      // fecha_limite como yyyy-mm-dd (sin desfase de zona horaria) o null
      let fechaLimite = null;
      if (row?.fecha_limite) {
        const d = new Date(row.fecha_limite);
        if (!Number.isNaN(d.getTime())) {
          fechaLimite = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
      }
      const estadoNormalizado = row?.estado?.trim() || "";
      const status = row ? ESTADO_TO_STATUS[estadoNormalizado] || "Pendiente" : "Pendiente";
      return {
        id: TIPO_TO_ID[tipo], title: TIPO_TO_TITLE[tipo],
        subtitle: TIPO_TO_SUBTITLE[tipo], status, submitted: fechaEntrega,
        fecha_limite: fechaLimite,
        reviewer: asesorNombre, feedback: row?.feedback || null,
        // DECIMAL llega como string desde mysql2; null si el asesor no ha calificado
        calificacion:
          row?.calificacion !== null && row?.calificacion !== undefined
            ? Number(row.calificacion)
            : null,
        archivo_url: row?.archivo_url || null, nombre_archivo: row?.nombre_archivo || null,
        items: [],
      };
    });

    return res.json({ ok: true, reportes });
  } catch (err) {
    console.error("Error en /residente/reportes:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ── PUT /api/residente/reportes/:tipo ─────────────────────────────────────────
router.put("/reportes/:tipo", auth, requireRol("residente"), async (req, res) => {
  const tiposValidos = ["preliminar", "parcial1", "parcial2", "parcial3", "final"];
  const { tipo } = req.params;
  if (!tiposValidos.includes(tipo))
    return res.status(400).json({ ok: false, mensaje: "Tipo de reporte inválido." });

  let archivoNuevo;
  let commitIniciado = false;
  try {
    const [resRows] = await db.execute(
      "SELECT id FROM residentes WHERE usuario_id = ?",
      [req.user.id],
    );
    if (!resRows.length)
      return res.status(403).json({ ok: false, mensaje: "El usuario no es residente." });

    const residenteId = resRows[0].id;
    const today = new Date().toISOString().split("T")[0];
    const { archivo, nombre_archivo } = req.body || {};

    const retirar = archivo === null;
    if (!retirar && (typeof archivo !== "string" || !archivo || typeof nombre_archivo !== "string" || !nombre_archivo)) {
      return res.status(400).json({ ok: false, mensaje: "Selecciona un archivo para entregar." });
    }

    let archivoUrl = null;

    if (!retirar) {
      // SEGURIDAD FIX #5: Validar extensión del archivo
      const extension = path.extname(nombre_archivo).toLowerCase();
      if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
        return res.status(400).json({
          ok: false,
          mensaje: `Tipo de archivo no permitido. Solo se aceptan: ${EXTENSIONES_PERMITIDAS.join(", ")}`,
        });
      }

      try {
        const uploadsDir = path.join(__dirname, "..", "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const base64Data = archivo.includes(",") ? archivo.split(",")[1] : archivo;
        const buffer = Buffer.from(base64Data, "base64");

        // SEGURIDAD FIX #5: Validar magic bytes del archivo
        // Verifica que el contenido real coincida con la extensión declarada
        if (!validarTipoArchivo(buffer, extension)) {
          return res.status(400).json({
            ok: false,
            mensaje: "El contenido del archivo no corresponde a su extensión. Archivo rechazado.",
          });
        }

        // Tamaño máximo: 10MB
        if (buffer.length > 10 * 1024 * 1024) {
          return res.status(400).json({
            ok: false,
            mensaje: "El archivo excede el tamaño máximo permitido (10MB).",
          });
        }

        const nombreUnico = `${randomUUID()}${extension}`;
        const rutaArchivo = path.join(uploadsDir, nombreUnico);
        await fs.promises.writeFile(rutaArchivo, buffer, { flag: "wx" });
        archivoNuevo = rutaArchivo;
        archivoUrl = `/uploads/${nombreUnico}`;
      } catch (error) {
        console.error("Error al guardar el reporte:", error);
        return res.status(500).json({ ok: false, mensaje: "No se pudo guardar el archivo. Intenta de nuevo." });
      }
    }

    const conexion = await db.getConnection();
    try {
      await conexion.beginTransaction();
      // Serializa entregas del mismo residente, incluso cuando aún no existe el reporte.
      const [residentes] = await conexion.execute(
        "SELECT id FROM residentes WHERE id = ? AND usuario_id = ? FOR UPDATE",
        [residenteId, req.user.id],
      );
      if (!residentes.length) {
        throw new Error("El residente dejó de estar disponible.");
      }

      const [existing] = await conexion.execute(
        "SELECT id FROM reportes WHERE residente_id = ? AND tipo = ?",
        [residenteId, tipo],
      );

      if (retirar && !existing.length) {
        await conexion.rollback();
        return res.status(404).json({ ok: false, mensaje: "Reporte no encontrado." });
      }

      if (existing.length) {
        await conexion.execute(
          `UPDATE reportes SET estado = ?, fecha_entrega = ?, archivo_url = ?, nombre_archivo = ?
           WHERE residente_id = ? AND tipo = ?`,
          [retirar ? "Pendiente" : "En Revisión", retirar ? null : today, archivoUrl, retirar ? null : nombre_archivo, residenteId, tipo],
        );
      } else {
        await conexion.execute(
          `INSERT INTO reportes (id, residente_id, tipo, estado, fecha_entrega, archivo_url, nombre_archivo)
           VALUES (?, ?, ?, 'En Revisión', ?, ?, ?)`,
          [`r_${randomUUID()}`, residenteId, tipo, today, archivoUrl, nombre_archivo],
        );
      }

      commitIniciado = true;
      await conexion.commit();
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }

    const io = req.app.get("io");
    try {
      if (io && !retirar) {
        // Obtener asesor del residente para enviar notificación solo al asesor
        const [asesorRows] = await db.execute(
          `SELECT r.asesor_id, a.usuario_id AS asesor_usuario_id
           FROM residentes r
           JOIN asesores a ON a.id = r.asesor_id
           WHERE r.id = ?`,
          [residenteId]
        );

        if (asesorRows.length > 0 && asesorRows[0].asesor_usuario_id) {
          // Emitir solo al asesor, no al residente
          io.to(`user_${asesorRows[0].asesor_usuario_id}`).emit("reporte_actualizado", {
            residente_id: residenteId, tipo, estado: "En Revisión",
            archivo_url: archivoUrl, nombre_archivo,
          });
        }
      }
    } catch (err) {
      console.error("No se pudo avisar al asesor:", err);
    }

    return res.json({ ok: true, archivo_url: archivoUrl, nombre_archivo: retirar ? null : nombre_archivo });
  } catch (err) {
    // Si se perdió la conexión al confirmar, el archivo podría estar ya referenciado.
    if (archivoNuevo && !commitIniciado) {
      await fs.promises.unlink(archivoNuevo).catch((error) => console.error("No se pudo limpiar el archivo:", error));
    }
    console.error("Error en PUT /residente/reportes/:tipo:", err);
    return res.status(500).json({ ok: false, mensaje: "No pudimos actualizar el reporte. Intenta de nuevo." });
  }
});

// ── GET /api/residente/asesor ─────────────────────────────────────────────────
router.get("/asesor", auth, async (req, res) => {
  try {
    const [resRows] = await db.execute(
      "SELECT asesor_id FROM residentes WHERE usuario_id = ?",
      [req.user.id],
    );
    if (!resRows.length)
      return res.status(403).json({ ok: false, mensaje: "El usuario no es residente." });

    const asesorId = resRows[0].asesor_id;
    if (!asesorId) return res.json({ ok: true, asesor: null });

    const [rows] = await db.execute(
      `SELECT u.nombre, u.apellidos, u.correo, a.departamento, a.num_empleado
       FROM asesores a JOIN usuarios u ON a.usuario_id = u.id WHERE a.id = ?`,
      [asesorId],
    );
    if (!rows.length) return res.json({ ok: true, asesor: null });

    const a = rows[0];
    return res.json({
      ok: true,
      asesor: {
        nombre: `${a.nombre} ${a.apellidos}`,
        iniciales: `${a.nombre.charAt(0)}${a.apellidos.charAt(0)}`,
        correo: a.correo,
        departamento: a.departamento || "",
        extension: a.num_empleado || "",
      },
    });
  } catch (err) {
    console.error("Error en /residente/asesor:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ── GET /api/residente/proyecto ───────────────────────────────────────────────
router.get("/proyecto", auth, async (req, res) => {
  try {
    const [resRows] = await db.execute(
      "SELECT id FROM residentes WHERE usuario_id = ?",
      [req.user.id],
    );
    if (!resRows.length)
      return res.status(403).json({ ok: false, mensaje: "El usuario no es residente." });

    const residenteId = resRows[0].id;
    const [rows] = await db.execute(
      `SELECT p.id, p.titulo, p.descripcion, p.estado, p.prioridad, p.tecnologias,
              p.progreso, p.created_at,
              e.id AS empresa_id, e.nombre AS empresa_nombre, e.estado AS empresa_estado,
              a.id AS asesor_id, CONCAT(u.nombre, ' ', u.apellidos) AS asesor_nombre,
              a.departamento AS asesor_departamento
       FROM proyectos p
       LEFT JOIN empresas e ON p.empresa_id = e.id
       LEFT JOIN asesores a ON p.asesor_id = a.id
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       WHERE p.residente_id = ?`,
      [residenteId],
    );

    if (!rows.length) return res.json({ ok: true, proyecto: null });
    const p = rows[0];
    return res.json({
      ok: true,
      proyecto: {
        id: p.id, titulo: p.titulo, descripcion: p.descripcion,
        estado: p.estado, prioridad: p.prioridad, tecnologias: p.tecnologias,
        progreso: p.progreso, created_at: p.created_at,
        empresa: { id: p.empresa_id, nombre: p.empresa_nombre, estado: p.empresa_estado },
        asesor: { id: p.asesor_id, nombre: p.asesor_nombre, departamento: p.asesor_departamento },
      },
    });
  } catch (err) {
    console.error("Error en /residente/proyecto:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ── GET /api/residente/empresas ───────────────────────────────────────────────
router.get("/empresas", auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, nombre, estado FROM empresas WHERE estado != 'Inactiva' ORDER BY nombre ASC",
    );
    return res.json({ ok: true, empresas: rows });
  } catch (err) {
    console.error("Error en /residente/empresas:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

module.exports = router;
