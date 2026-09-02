import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "../src/config.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, "../../database/mysql");

function migrationVersion(fileName) {
  const match = /^(\d{3,})_.+\.sql$/i.exec(fileName);
  return match ? match[1] : null;
}

function checksum(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

async function ensureMigrationTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(32) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      checksum_sha256 CHAR(64) NOT NULL,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (version),
      UNIQUE KEY schema_migrations_file_name_key (file_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.execute(
    `SELECT 1 AS found
       FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = ?
      LIMIT 1`,
    [tableName],
  );
  return rows.length > 0;
}

async function loadMigrationFiles() {
  const names = (await fs.readdir(migrationsDir))
    .filter((name) => migrationVersion(name))
    .sort((a, b) => a.localeCompare(b, "en"));

  const versions = new Set();
  const migrations = [];
  for (const fileName of names) {
    const version = migrationVersion(fileName);
    if (versions.has(version)) throw new Error(`Versão de migration duplicada: ${version}`);
    versions.add(version);
    const filePath = path.join(migrationsDir, fileName);
    const sql = await fs.readFile(filePath, "utf8");
    migrations.push({ version, fileName, sql, checksum: checksum(sql) });
  }
  if (!migrations.length) throw new Error("Nenhuma migration MySQL encontrada em database/mysql");
  return migrations;
}

async function main() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    ssl: config.db.ssl ? { rejectUnauthorized: true } : undefined,
    multipleStatements: true,
    charset: "utf8mb4",
    timezone: "Z",
  });

  try {
    await connection.query("SET NAMES utf8mb4");
    await connection.query("SET time_zone = '+00:00'");
    await ensureMigrationTable(connection);

    const migrations = await loadMigrationFiles();
    const [appliedRows] = await connection.query(
      `SELECT version, file_name, checksum_sha256 FROM schema_migrations ORDER BY version ASC`,
    );
    const applied = new Map(appliedRows.map((row) => [String(row.version), row]));

    // Compatibilidade com instalações que receberam o 001_schema.sql antes do runner versionado.
    // Se o banco já possui o núcleo do SEGEMPAT e ainda não há histórico, assume o baseline 001 como aplicado.
    if (applied.size === 0 && migrations[0]?.version === "001" && await tableExists(connection, "app_users")) {
      const baseline = migrations[0];
      await connection.execute(
        `INSERT INTO schema_migrations (version, file_name, checksum_sha256, applied_at)
         VALUES (?, ?, ?, UTC_TIMESTAMP(3))`,
        [baseline.version, baseline.fileName, baseline.checksum],
      );
      applied.set(baseline.version, {
        version: baseline.version,
        file_name: baseline.fileName,
        checksum_sha256: baseline.checksum,
      });
      console.log(`[segempat-api] baseline existente registrado: ${baseline.fileName}`);
    }

    let appliedCount = 0;
    for (const migration of migrations) {
      const previous = applied.get(migration.version);
      if (previous) {
        if (previous.file_name !== migration.fileName) {
          throw new Error(`Migration ${migration.version} já aplicada com outro nome: ${previous.file_name}`);
        }
        if (previous.checksum_sha256 !== migration.checksum) {
          throw new Error(`Migration ${migration.fileName} foi alterada após ser aplicada. Crie uma nova migration em vez de editar a anterior.`);
        }
        continue;
      }

      console.log(`[segempat-api] aplicando ${migration.fileName}`);
      await connection.query(migration.sql);
      await connection.execute(
        `INSERT INTO schema_migrations (version, file_name, checksum_sha256, applied_at)
         VALUES (?, ?, ?, UTC_TIMESTAMP(3))`,
        [migration.version, migration.fileName, migration.checksum],
      );
      appliedCount += 1;
    }

    if (appliedCount === 0) console.log("[segempat-api] schema MySQL já está atualizado");
    else console.log(`[segempat-api] ${appliedCount} migration(s) MySQL aplicada(s) com sucesso`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[segempat-api] falha ao aplicar migrations", error?.message || error);
  process.exit(1);
});
