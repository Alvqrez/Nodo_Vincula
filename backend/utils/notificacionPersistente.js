/**
 * Crea una notificación persistente (tabla `notificaciones`) y la emite en
 * tiempo real al usuario destinatario. Mismo patrón que POST /api/notificaciones:
 * el id es INT AUTO_INCREMENT y lo asigna la base.
 */
const db = require("../db");

async function crearNotificacion(
  io,
  {
    usuarioId,
    tipo = "SISTEMA",
    titulo,
    mensaje,
    icon = "bell",
    iconColor = "#6B7280",
    iconBg = "#F3F4F6",
    actionScreen = null,
    actionLabel = null,
    metadata = null,
  },
) {
  const [result] = await db.execute(
    `INSERT INTO notificaciones
       (usuario_id, tipo_notificacion, titulo, mensaje, icon, icon_color, icon_bg,
        action_screen, action_label, metadata, is_read)
     VALUES (?,?,?,?,?,?,?,?,?,?,0)`,
    [
      usuarioId,
      tipo,
      titulo,
      mensaje,
      icon,
      iconColor,
      iconBg,
      actionScreen,
      actionLabel,
      metadata ? JSON.stringify(metadata) : null,
    ],
  );

  if (io) {
    io.to(`user_${usuarioId}`).emit("notificacion_nueva", {
      id: result.insertId,
      tipo_notificacion: tipo,
      titulo,
      mensaje,
      icon,
      icon_color: iconColor,
      icon_bg: iconBg,
      action_screen: actionScreen,
      action_label: actionLabel,
      created_at: new Date().toISOString(),
    });
  }

  return result.insertId;
}

/** Igual que crearNotificacion, pero un fallo solo se registra en consola. */
async function notificarSinBloquear(io, datos) {
  try {
    return await crearNotificacion(io, datos);
  } catch (err) {
    console.error("No se pudo crear la notificación:", err.message);
    return null;
  }
}

module.exports = { crearNotificacion, notificarSinBloquear };
