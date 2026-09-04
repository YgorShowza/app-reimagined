import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "../src/config.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const baselinePath = path.resolve(here, "../../database/mysql/001_schema.sql");

function splitTopLevelDefinitions(body) {
  const parts = [];
  let start = 0;
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\" && quote !== "`") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (char === "," && depth === 0) {
      parts.push(body.slice(start, index).trim());
      start = index + 1;
    }
  }

  const tail = body.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function extractBaselineColumns(sql) {
  const tables = new Map();
  const tablePattern = /\bCREATE\s+TABLE\s+([A-Za-z0-9_]+)\s*\(([\s\S]*?)\)\s*ENGINE\s*=/gi;
  const nonColumnPrefixes = /^(PRIMARY\s+KEY|UNIQUE\s+KEY|KEY\s+|CONSTRAINT\s+|CHECK\s*\()/i;

  for (const match of sql.matchAll(tablePattern)) {
    const tableName = String(match[1]);
    if (tableName === "schema_migrations") continue;

    const columns = [];
    for (const definition of splitTopLevelDefinitions(String(match[2]))) {
      const normalized = definition.trim();
      if (!normalized || nonColumnPrefixes.test(normalized)) continue;

      const columnMatch = /^(?:`([^`]+)`|([A-Za-z0-9_]+))\s+/i.exec(normalized);
      if (!columnMatch) {
        throw new Error(`Não foi possível interpretar uma definição de coluna em ${tableName}: ${normalized}`);
      }
      columns.push(columnMatch[1] || columnMatch[2]);
    }

    if (columns.length === 0) {
      throw new Error(`Nenhuma coluna foi extraída do baseline para a tabela ${tableName}`);
    }
    tables.set(tableName, [...new Set(columns)]);
  }

  return tables;
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
  const expectedByTable = extractBaselineColumns(sql);
  if (expectedByTable.size === 0) {
    throw new Error("Não foi possível extrair as colunas do baseline 001_schema.sql");
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
        console.log("[segempat-api] histórico de migrations já existe; validação de colunas do baseline legado dispensada");
        return;
      }
    }

    const tableNames = [...expectedByTable.keys()];
    const placeholders = tableNames.map(() => "?").join(",");
    const [rows] = await connection.execute(
      `SELECT table_name, column_name
         FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name IN (${placeholders})
        ORDER BY table_name, ordinal_position`,
      tableNames,
    );

    if (rows.length === 0) {
      console.log("[segempat-api] banco novo detectado; não há baseline legado para validar");
      return;
    }

    const actualByTable = new Map();
    for (const row of rows) {
      const tableName = String(row.table_name);
      if (!actualByTable.has(tableName)) actualByTable.set(tableName, new Set());
      actualByTable.get(tableName).add(String(row.column_name));
    }

    const problems = [];
    let expectedColumnCount = 0;
    for (const [tableName, expectedColumns] of expectedByTable) {
      expectedColumnCount += expectedColumns.length;
      const actualColumns = actualByTable.get(tableName);
      if (!actualColumns) {
        problems.push(`${tableName}: tabela ausente`);
        continue;
      }

      const missing = expectedColumns.filter((columnName) => !actualColumns.has(columnName));
      if (missing.length > 0) {
        problems.push(`${tableName}: colunas ausentes [${missing.join(", ")}]`);
      }
    }

    if (problems.length > 0) {
      throw new Error(
        `Baseline MySQL legado não possui todas as colunas exigidas pelo 001_schema.sql: ${problems.join("; ")}. ` +
        "O runner não deve registrar o baseline automaticamente nesse estado.",
      );
    }

    console.log(
      `[segempat-api] colunas do baseline legado OK; ${expectedByTable.size} tabelas e ${expectedColumnCount} colunas obrigatórias presentes`,
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[segempat-api] validação de colunas do baseline legado falhou", error?.message || error);
  process.exit(1);
});
