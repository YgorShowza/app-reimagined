import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "../src/config.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(here, "../../database/mysql/001_schema.sql");

async function main() {
  const schema = await fs.readFile(schemaPath, "utf8");
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    ssl: config.db.ssl ? { rejectUnauthorized: true } : undefined,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  try {
    await connection.query(schema);
    console.log("[segempat-api] schema MySQL aplicado com sucesso");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[segempat-api] falha ao aplicar schema", error?.message || error);
  process.exit(1);
});
