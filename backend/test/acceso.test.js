/** Prueba descargas, sesiones de Socket.IO y la reversión de una entrega usando dobles de MySQL. */

const assert = require("node:assert/strict");
const { once, EventEmitter } = require("node:events");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");
const descargas = require("../routes/descargas");
const { configurarSocketSesion } = require("../utils/socketSesion");

const secret = "solo-para-pruebas-locales";
process.env.JWT_SECRET = secret;

test("la descarga consulta el expediente con la identidad y el rol vigentes", async (t) => {
  const consultas = t.mock.method(db, "execute", async (sql) => {
    if (sql.includes("FROM usuarios")) return [[{ id: "alumna", rol: "residente" }]];
    return [[]];
  });
  const app = express();
  app.use("/uploads", descargas);
  const server = app.listen(0, "127.0.0.1");
  t.after(() => server.close());
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/uploads`;
  const token = jwt.sign({ id: "alumna", rol: "residente" }, secret, { expiresIn: "1h" });

  const sinSesion = await fetch(`${base}/reporte.pdf`);
  assert.equal(sinSesion.status, 401);
  await sinSesion.arrayBuffer();
  assert.equal(consultas.mock.callCount(), 0);

  const respuesta = await fetch(`${base}/reporte.pdf`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(respuesta.status, 404);
  assert.equal((await respuesta.json()).mensaje, "Archivo no disponible.");
  const [sql, valores] = consultas.mock.calls[1].arguments;
  assert.match(sql, /BINARY r\.archivo_url = \?/);
  assert.deepEqual(valores, ["/uploads/reporte.pdf", "residente", "alumna", "residente", "alumna", "residente"]);
});

test("las salas provienen de la cuenta activa y el socket cierra cuando vence la sesión", async (t) => {
  t.mock.method(db, "execute", async () => [[{ id: "docente", rol: "asesor" }]]);
  const io = new EventEmitter();
  let validar;
  io.use = (middleware) => { validar = middleware; };
  configurarSocketSesion(io);

  const sinSesion = await new Promise((resolve) => validar({ handshake: {}, data: {} }, resolve));
  assert.match(sinSesion.message, /Sesión no válida/);

  const socket = new EventEmitter();
  socket.data = {};
  socket.handshake = { auth: { token: jwt.sign({ id: "docente", rol: "asesor" }, secret, { expiresIn: "1h" }) } };
  socket.join = t.mock.fn();
  socket.disconnect = t.mock.fn();
  assert.equal(await new Promise((resolve) => validar(socket, resolve)), undefined);
  socket.data.expira = Date.now();
  io.emit("connection", socket);
  assert.deepEqual(socket.join.mock.calls[0].arguments, [["user_docente", "role_asesor"]]);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(socket.disconnect.mock.calls[0].arguments, [true]);
  socket.emit("disconnect");
});

test("una entrega fallida revierte el registro y limpia el archivo nuevo", async (t) => {
  const fs = require("node:fs");
  const residentes = require("../routes/residente");
  t.mock.method(db, "execute", async () => [[{ id: "residente-demo" }]]);
  const limpiar = t.mock.method(fs.promises, "unlink", async () => {});
  const escribir = t.mock.method(fs.promises, "writeFile", async () => {});
  const conexion = {
    beginTransaction: t.mock.fn(async () => {}),
    execute: async (sql) => {
      if (sql.startsWith("INSERT")) throw new Error("Fallo simulado de MySQL");
      if (sql.includes("FOR UPDATE")) return [[{ id: "residente-demo" }]];
      return [[]];
    },
    rollback: t.mock.fn(async () => {}),
    release: t.mock.fn(),
  };
  t.mock.method(db, "getConnection", async () => conexion);
  t.mock.method(console, "error", () => {});
  const app = express();
  app.use(express.json());
  app.use("/api/residente", residentes);
  const server = app.listen(0, "127.0.0.1");
  t.after(() => server.close());
  await once(server, "listening");
  const token = jwt.sign({ id: "alumna", rol: "residente" }, secret, { expiresIn: "1h" });
  const respuesta = await fetch(`http://127.0.0.1:${server.address().port}/api/residente/reportes/final`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ archivo: Buffer.from("%PDF-1.7").toString("base64"), nombre_archivo: "reporte.pdf" }),
  });
  assert.equal(respuesta.status, 500);
  assert.equal((await respuesta.json()).mensaje, "No pudimos actualizar el reporte. Intenta de nuevo.");
  assert.equal(conexion.rollback.mock.callCount(), 1);
  assert.equal(conexion.release.mock.callCount(), 1);
  assert.deepEqual(limpiar.mock.calls[0].arguments, [escribir.mock.calls[0].arguments[0]]);
});

test("un reporte autorizado se sirve como PDF y sin caché", async (t) => {
  const fs = require("node:fs/promises");
  const path = require("node:path");
  const { randomUUID } = require("node:crypto");
  const filename = `prueba-${randomUUID()}.pdf`;
  const uploads = path.join(__dirname, "..", "uploads");
  const archivo = path.join(uploads, filename);
  await fs.mkdir(uploads, { recursive: true });
  await fs.writeFile(archivo, "%PDF-1.7", { flag: "wx" });
  t.after(() => fs.unlink(archivo));
  t.mock.method(db, "execute", async (sql) => {
    if (sql.includes("FROM usuarios")) return [[{ id: "docente", rol: "asesor" }]];
    return [[{ autorizado: 1 }]];
  });

  const app = express();
  app.use("/uploads", descargas);
  const server = app.listen(0, "127.0.0.1");
  t.after(() => server.close());
  await once(server, "listening");
  const token = jwt.sign({ id: "docente", rol: "asesor" }, secret, { expiresIn: "1h" });
  const respuesta = await fetch(`http://127.0.0.1:${server.address().port}/uploads/${filename}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.headers.get("content-type"), "application/pdf");
  assert.equal(respuesta.headers.get("cache-control"), "private, no-store");
  assert.equal(await respuesta.text(), "%PDF-1.7");
});
