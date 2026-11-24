/** Valida el token al conectar y deriva las salas de la cuenta activa. */

const jwt = require("jsonwebtoken");
const { usuarioActivo } = require("./accesoExpediente");

function configurarSocketSesion(io) {
  // La verificación ocurre durante el saludo de conexión, antes de permitir que el socket reciba avisos.
  io.use(async (socket, next) => {
    try {
      const { id, exp } = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
      if (typeof id !== "string" || !Number.isFinite(exp)) {
        return next(new Error("Sesión no válida."));
      }
      const usuario = await usuarioActivo(id);
      if (!usuario || exp * 1000 <= Date.now()) return next(new Error("Sesión no válida."));
      socket.data.usuario = usuario;
      socket.data.expira = exp * 1000;
      next();
    } catch {
      next(new Error("Sesión no válida."));
    }
  });

  io.on("connection", (socket) => {
    const { id, rol } = socket.data.usuario;
    // Las salas se derivan de la cuenta consultada en MySQL.
    socket.join([`user_${id}`, `role_${rol}`]);

    // La conexión se cierra cuando vence el token, aunque el cliente mantenga la pestaña abierta.
    const expiracion = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, socket.data.expira - Date.now()),
    );
    socket.once("disconnect", () => clearTimeout(expiracion));
  });
}

module.exports = { configurarSocketSesion };
