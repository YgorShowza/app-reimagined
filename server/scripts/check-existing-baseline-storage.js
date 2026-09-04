import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "../src/config.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const baselinePath = path.resolve(here, "../../database/mysql/001_schema.sql");

function extractBaselineTableNames(sql) {
  const names = [];
  for (const match of sql.matchAll(/\bCREATE\s+TABLE\s+([A-Za-z0-9_]+)/gi)) {
    const name = String(match[1]);
    if (name !== "schema_migrations") names.push(name);
  }
  return [...new Set(names)];
}

async function sslOptions() {
  if (!config.db.ssl) return undefined;
  if (!config.db.caPath) return { rejectUnauthorized: true };
  const ca = await fs.readFile(config.db.caPath, "utf8");
  return { ca, rejectUnauthorized: true };
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.execute(
    `SELECT 1 AS ok
       FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = ?
      LIMIT 1`,
    [tableName],
  );
  return rows.length > 0;
}

async function main() {
  const sql = await fs.readFile(baselinePath, "utf8");
  const baselineTables = extractBaselineTableNames(sql);
  if (baselineTables.length === 0) {
    throw new Error("Não foi possível extrair as tabelas do baseline 001_schema.sql");
  }

  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    ssl: await sslOptions(),
    charset: "utf8mb4",
    timezone: "Z",
  });

  try {
    if (await tableExists(connection, "schema_migrations")) {
      const [rows] = await connection.query("SELECT COUNT(*) AS total FROM schema_migrations");
      if (Number(rows?.[0]?.total ?? 0) > 0) {
        console.log("[segempat-api] histórico de migrations já existe; validação de storage do baseline legado dispensada");
        return;
      }
    }

    const placeholders = baselineTables.map(() => "?").join(",");
    const [rows] = await connection.execute(
      `SELECT table_name, engine, table_collation
         FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name IN (${placeholders})
        ORDER BY table_name`,
      baselineTables,
    );

    if (rows.length === 0) {
      console.log("[segempat-api] banco novo detectado; não há baseline legado para validar");
      return;
    }

    const found = new Set(rows.map((row) => String(row.table_name)));
    const missing = baselineTables.filter((tableName) => !found.has(tableName));
    if (missing.length > 0) {
      throw new Error(
        `Baseline MySQL legado está incompleto; tabelas ausentes: ${missing.join(", ")}. ` +
        "O runner não deve registrar o baseline automaticamente nesse estado.",
      );
    }

    const problems = [];
    for (const row of rows) {
      const tableName = String(row.table_name);
      const engine = String(row.engine || "");
      const collation = String(row.table_collation || "");

      if (engine.toUpperCase() !== "INNODB") {
        problems.push(`${tableName}: engine=${engine || "desconhecido"}; esperado InnoDB`);
      }
      if (!collation.toLowerCase().startsWith("utf8mb4")) {
        problems.push(`${tableName}: collation=${collation || "desconhecida"}; esperado utf8mb4`);
      }
    }

    if (problems.length > 0) {
      throw new Error(
        `Baseline MySQL legado possui configuração de storage incompatível: ${problems.join("; ")}. ` +
        "O runner não deve registrar 001_schema.sql automaticamente nesse estado.",
      );
    }

    console.log(
      `[segempat-api] storage do baseline legado OK; ${baselineTables.length} tabelas em InnoDB e utf8mb4`,
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[segempat-api] validação de storage do baseline legado falhou", error?.message || error);
  process.exit(1);
});
