/** Configura el pool de conexiones MySQL que comparten las rutas y los servicios. */

const mysql = require("mysql2/promise");
require("dotenv").config();

// El pool reutiliza conexiones para las consultas y las abre contra la base seleccionada por DB_NAME.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "vinculatec",
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
});

// Los módulos que importan db comparten este pool en el mismo proceso de Node.
module.exports = pool;
