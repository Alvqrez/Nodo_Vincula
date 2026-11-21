const jwt = require("jsonwebtoken");
const { usuarioActivo } = require("./accesoExpediente");

function configurarSocketSesion(io) {
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
    socket.join([`user_${id}`, `role_${rol}`]);

    const expiracion = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, socket.data.expira - Date.now()),
    );
    socket.once("disconnect", () => clearTimeout(expiracion));
  });
}

module.exports = { configurarSocketSesion };
