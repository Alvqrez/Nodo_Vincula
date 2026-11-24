/** Lee una migración SQL y la ejecuta con la conexión configurada para el backend. */

/**
 * Ejecuta un archivo .sql de migración contra la base configurada en backend/.env.
 *
 * Uso (desde backend/):
 *   node migrations/run.js migrations/<archivo>.sql
 *
 * - Usa las mismas variables que db.js (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).
 * - No imprime credenciales.
 * - Las migraciones deben ser idempotentes: este script no lleva registro de
 *   cuáles ya se aplicaron.
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function main() {
  const archivo = process.argv[2];
  if (!archivo) {
    console.error("Uso: node migrations/run.js <archivo.sql>");
    process.exit(1);
  }

  const ruta = path.resolve(process.cwd(), archivo);
  if (!fs.existsSync(ruta)) {
    console.error(`No existe el archivo: ${ruta}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(ruta, "utf8");
  // La conexión usa la base configurada para el entorno. El archivo de migración contiene las sentencias que se aplican.
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "vinculatec",
    charset: "utf8mb4",
    multipleStatements: true,
  });

  try {
    const [resultados] = await conn.query(sql);
    const lista = Array.isArray(resultados) ? resultados : [resultados];
    for (const r of lista) {
      if (Array.isArray(r) && r.length) console.log(r);
    }
    console.log(`Migración aplicada: ${path.basename(ruta)}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Error al aplicar la migración:", err.message);
  process.exit(1);
});
