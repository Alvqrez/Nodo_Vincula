/** Arranca Express, conecta las rutas, configura CORS y enlaza Socket.IO al mismo servidor HTTP. */

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const citasRoutes = require("./routes/citas");
const asesorRoutes = require("./routes/asesor");
const residenteRoutes = require("./routes/residente");
const jefeRoutes = require("./routes/jefe");
const notificacionesRoutes = require("./routes/notificaciones");
const fotosRoutes = require("./routes/fotos");
const reportesRoutes = require("./routes/reportes");
const fuentesRoutes = require("./routes/fuentes");
const recursosRoutes = require("./routes/recursos");

const descargas = require("./routes/descargas");
const { configurarSocketSesion } = require("./utils/socketSesion");

// Express atiende las peticiones HTTP. El mismo servidor recibe las conexiones de Socket.IO.
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== "production";

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : isDev
    ? [
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:3000",
        "http://localhost:8082",
      ]
    : [];

// La configuración distingue los orígenes de desarrollo de los autorizados explícitamente en producción.
function isOriginAllowed(origin) {
  if (!origin) return true; // Peticiones sin origin (móvil nativo, Postman)
  if (isDev) {
    if (origin.includes("localhost")) return true;
    if (origin.includes("127.0.0.1")) return true;
    if (origin.includes("ngrok-free.dev")) return true;
    if (origin.includes("ngrok.io")) return true;
    // Permitir cualquier IP privada en desarrollo (192.168.x.x, 10.x.x.x, 172.x.x.x)
    if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin))
      return true;
  }
  return allowedOrigins.includes(origin);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      console.warn(`[CORS] Origen rechazado: ${origin}`);
      callback(new Error(`CORS: origen no permitido → ${origin}`));
    },
    credentials: true,
  }),
);

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      callback(new Error(`CORS WebSocket: origen no permitido → ${origin}`));
    },
    credentials: true,
  },
  // Configuración de transports para mayor compatibilidad en LAN
  transports: ["websocket", "polling"],
  pingInterval: 25000,
  pingTimeout: 10000,
});

// Los reportes llegan en base64 dentro del JSON (+33 %): 15 MB de cuerpo permiten
// archivos de hasta 10 MB; ese límite real se valida en routes/residente.js.
app.use(express.json({ limit: "15mb" }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // aumentado de 200 → 300 para equipos de trabajo
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, mensaje: "Demasiadas peticiones, intenta más tarde." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // aumentado de 10 → 20 (varios compañeros hacen login a la vez)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    mensaje: "Demasiados intentos de inicio de sesión. Espera 15 minutos.",
  },
});

// El acceso tiene un límite adicional al global porque recibe los intentos de inicio de sesión.
app.use(globalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/nodo", authLimiter);

// Los documentos de residencia pasan por la ruta que verifica el acceso al expediente.
app.use("/uploads", descargas);

configurarSocketSesion(io);

// Las rutas recuperan esta instancia para emitir avisos después de guardar un cambio.
app.set("io", io);

// ── Rutas ─────────────────────────────────────────────────────────────────────
// Cada prefijo dirige la petición al archivo que implementa ese conjunto de operaciones.
app.use("/api/auth", authRoutes);
app.use("/api/citas", citasRoutes);
app.use("/api/asesor", asesorRoutes);
app.use("/api/residente", residenteRoutes);
app.use("/api/jefe", jefeRoutes);
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/fotos", fotosRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/fuentes", fuentesRoutes);
app.use("/api/recursos", recursosRoutes);

app.get("/api/health", (_, res) =>
  res.json({ ok: true, mensaje: "VinculaTec API corriendo 🚀" }),
);

// Con las rutas montadas, el proceso empieza a escuchar peticiones en el puerto configurado.
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅  Servidor corriendo en http://0.0.0.0:${PORT}`);
  console.log(`🌐  Modo: ${isDev ? "desarrollo" : "producción"}`);
  console.log(`🔌  WebSockets habilitados`);
  if (isDev) {
    // Mostrar la IP de red local para que los compañeros sepan qué poner en .env.local
    const { networkInterfaces } = require("os");
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === "IPv4" && !net.internal) {
          console.log(
            `🖥️  IP local: http://${net.address}:${PORT}/api  ← usa esta en .env.local`,
          );
        }
      }
    }
  }
});
