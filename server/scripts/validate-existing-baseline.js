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

function extractBaselineForeignKeys(sql) {
  return [...new Set(
    [...sql.matchAll(/\bCONSTRAINT\s+([A-Za-z0-9_]+)\s+FOREIGN\s+KEY\b/gi)]
      .map((match) => String(match[1])),
  )];
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

async function existingNames(connection, query, names) {
  if (names.length === 0) return new Set();
  const placeholders = names.map(() => "?").join(",");
  const [rows] = await connection.execute(query.replace("__NAMES__", placeholders), names);
  return new Set(rows.map((row) => String(row.name)));
}

async function main() {
  const sql = await fs.readFile(baselinePath, "utf8");
  const baselineTables = extractBaselineTableNames(sql);
  const baselineForeignKeys = extractBaselineForeignKeys(sql);

  if (baselineTables.length === 0) {
    throw new Error("Não foi possível extrair as tabelas do baseline 001_schema.sql");
  }
  if (baselineForeignKeys.length === 0) {
    throw new Error("Não foi possível extrair as foreign keys do baseline 001_schema.sql");
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
        console.log("[segempat-api] histórico de migrations já existe; validação de baseline legado dispensada");
        return;
      }
    }

    const foundTables = await existingNames(
      connection,
      `SELECT table_name AS name
         FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name IN (__NAMES__)`,
      baselineTables,
    );

    if (foundTables.size === 0) {
      console.log("[segempat-api] banco novo detectado; não há baseline legado para validar");
      return;
    }

    const missingTables = baselineTables.filter((name) => !foundTables.has(name));
    if (missingTables.length > 0) {
      throw new Error(
        `Baseline MySQL legado está incompleto; tabelas ausentes: ${missingTables.join(", ")}`,
      );
    }

    const foundForeignKeys = await existingNames(
      connection,
      `SELECT DISTINCT constraint_name AS name
         FROM information_schema.key_column_usage
        WHERE constraint_schema = DATABASE()
          AND referenced_table_name IS NOT NULL
          AND constraint_name IN (__NAMES__)`,
      baselineForeignKeys,
    );
    const missingForeignKeys = baselineForeignKeys.filter((name) => !foundForeignKeys.has(name));
    if (missingForeignKeys.length > 0) {
      throw new Error(
        `Baseline MySQL legado possui tabelas completas, mas foreign keys críticas ausentes: ${missingForeignKeys.join(", ")}. ` +
        "O runner não deve registrar 001_schema.sql automaticamente nesse estado.",
      );
    }

    console.log(
      `[segempat-api] baseline legado pré-validado: ${baselineTables.length} tabelas e ${baselineForeignKeys.length} foreign keys presentes`,
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[segempat-api] validação do baseline legado falhou", error?.message || error);
  process.exit(1);
});
