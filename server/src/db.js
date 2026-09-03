import fs from "node:fs";
import mysql from "mysql2/promise";
import { config } from "./config.js";

function sslOptions() {
  if (!config.db.ssl) return undefined;
  if (config.db.caPath) {
    if (!fs.existsSync(config.db.caPath)) {
      throw new Error(`[segempat-api] certificado CA do MySQL não encontrado: ${config.db.caPath}`);
    }
    return { ca: fs.readFileSync(config.db.caPath, "utf8"), rejectUnauthorized: true };
  }
  return { rejectUnauthorized: true };
}

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  ssl: sslOptions(),
  waitForConnections: true,
  connectionLimit: config.db.poolSize,
  queueLimit: 0,
  timezone: "Z",
  dateStrings: ["DATE"],
  namedPlaceholders: false,
  charset: "utf8mb4_general_ci",
});

// Cada conexão física nova do pool recebe as invariantes usadas pelo SEGEMPAT.
// `timezone: "Z"` controla conversão no driver, mas não substitui o timezone da sessão MySQL,
// que também afeta CURRENT_TIMESTAMP e outros valores gerados pelo próprio banco.
pool.on("connection", (connection) => {
  connection.query(
    "SET SESSION time_zone = '+00:00', SESSION foreign_key_checks = 1",
    (error) => {
      if (!error) return;
      console.error("[segempat-api] falha ao inicializar sessão MySQL", error?.message || error);
      connection.destroy();
    },
  );
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

/** Executa um callback dentro de uma transação com rollback automático. */
export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      /* conexão já perdida */
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function healthcheck() {
  await query("SELECT 1");
  return true;
}
