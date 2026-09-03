import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "../src/config.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, "../../database/mysql");
const MIGRATION_LOCK_NAME = "segempat:migrations";
const BASELINE_TABLES = [
  "app_users",
  "employees",
  "profiles",
  "user_roles",
  "registration_activation_codes",
  "exams",
  "exam_attempts",
  "certificates",
  "cronograma_entries",
  "cronograma_recurring_models",
  "cronograma_suspensions",
  "knowledge_items",
  "question_bank",
  "training_modules",
  "training_activity_attempts",
  "training_schedules",
  "practical_eval_templates",
  "practical_evaluations",
  "occurrences",
  "audit_logs",
];

function migrationVersion(fileName) {
  const match = /^(\d{3,})_.+\.sql$/i.exec(fileName);
  return match ? match[1] : null;
}

function numericVersion(version) {
  return BigInt(version);
}

function checksum(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

async function migrationSslOptions() {
  if (!config.db.ssl) return undefined;
  if (!config.db.caPath) return { rejectUnauthorized: true };
  try {
    const ca = await fs.readFile(config.db.caPath, "utf8");
    return { ca, rejectUnauthorized: true };
  } catch (error) {
    throw new Error(`Certificado CA do MySQL não pôde ser lido em ${config.db.caPath}: ${error?.message || error}`);
  }
}

async function acquireMigrationLock(connection) {
  const [rows] = await connection.execute(`SELECT GET_LOCK(?, 30) AS acquired`, [MIGRATION_LOCK_NAME]);
  if (Number(rows?.[0]?.acquired) !== 1) {
    throw new Error("Não foi possível obter o lock exclusivo de migrations em até 30 segundos. Verifique se outro deploy está migrando o banco.");
  }
}

async function releaseMigrationLock(connection) {
  const [rows] = await connection.execute(`SELECT RELEASE_LOCK(?) AS released`, [MIGRATION_LOCK_NAME]);
  const released = rows?.[0]?.released;
  if (released !== null && Number(released) !== 1) {
    console.warn("[segempat-api] aviso: lock de migrations não foi liberado explicitamente");
  }
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

async function existingTables(connection, tableNames) {
  if (!tableNames.length) return new Set();
  const placeholders = tableNames.map(() => "?").join(",");
  const [rows] = await connection.execute(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name IN (${placeholders})`,
    tableNames,
  );
  return new Set(rows.map((row) => String(row.table_name)));
}

async function detectPreRunnerBaseline(connection) {
  const found = await existingTables(connection, BASELINE_TABLES);
  if (found.size === 0) return { state: "empty", missing: BASELINE_TABLES };
  const missing = BASELINE_TABLES.filter((table) => !found.has(table));
  if (missing.length) return { state: "partial", missing };
  return { state: "complete", missing: [] };
}

async function loadMigrationFiles() {
  const parsed = (await fs.readdir(migrationsDir))
    .map((fileName) => ({ fileName, version: migrationVersion(fileName) }))
    .filter((entry) => entry.version)
    .map((entry) => ({ ...entry, numeric: numericVersion(entry.version) }))
    .sort((a, b) => a.numeric < b.numeric ? -1 : a.numeric > b.numeric ? 1 : a.fileName.localeCompare(b.fileName, "en"));

  const rawVersions = new Set();
  const numericVersions = new Map();
  const migrations = [];
  for (const { fileName, version, numeric } of parsed) {
    if (rawVersions.has(version)) throw new Error(`Versão de migration duplicada: ${version}`);
    rawVersions.add(version);

    const numericKey = numeric.toString();
    const existingNumeric = numericVersions.get(numericKey);
    if (existingNumeric) {
      throw new Error(
        `Versões de migration numericamente duplicadas: ${existingNumeric.version} (${existingNumeric.fileName}) e ${version} (${fileName})`,
      );
    }
    numericVersions.set(numericKey, { version, fileName });

    const filePath = path.join(migrationsDir, fileName);
    const sql = await fs.readFile(filePath, "utf8");
    migrations.push({ version, numeric, fileName, sql, checksum: checksum(sql) });
  }
  if (!migrations.length) throw new Error("Nenhuma migration MySQL encontrada em database/mysql");
  if (migrations[0].numeric !== 1n) throw new Error(`A primeira migration MySQL deve ser a versão 001; encontrada ${migrations[0].version}`);
  return migrations;
}

function validateAppliedHistory(migrations, applied) {
  if (applied.size === 0) return;

  const byNumeric = new Map(migrations.map((migration) => [migration.numeric.toString(), migration]));
  let highestAppliedIndex = -1;

  for (const [version, row] of applied) {
    if (!/^\d+$/.test(version)) {
      throw new Error(`Histórico de migrations contém versão inválida: ${version}`);
    }

    const numericKey = numericVersion(version).toString();
    const migration = byNumeric.get(numericKey);
    if (!migration) {
      throw new Error(`Histórico de migrations contém versão ${version} que não existe no código atual`);
    }
    if (migration.version !== version) {
      throw new Error(
        `Histórico de migrations usa versão ${version}, mas o arquivo atual equivalente é ${migration.version} (${migration.fileName})`,
      );
    }
    if (row.file_name !== migration.fileName) {
      throw new Error(`Migration ${version} já aplicada com outro nome: ${row.file_name}`);
    }
    if (row.checksum_sha256 !== migration.checksum) {
      throw new Error(`Migration ${migration.fileName} foi alterada após ser aplicada. Crie uma nova migration em vez de editar a anterior.`);
    }

    const index = migrations.findIndex((item) => item.version === version);
    if (index > highestAppliedIndex) highestAppliedIndex = index;
  }

  for (let index = 0; index <= highestAppliedIndex; index += 1) {
    const migration = migrations[index];
    if (!applied.has(migration.version)) {
      throw new Error(
        `Histórico de migrations está fora de ordem: ${migration.fileName} está ausente, mas existe migration posterior registrada. ` +
        "Corrija schema_migrations antes de continuar.",
      );
    }
  }
}

async function main() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    ssl: await migrationSslOptions(),
    multipleStatements: true,
    charset: "utf8mb4",
    timezone: "Z",
  });

  let lockAcquired = false;
  try {
    await connection.query("SET NAMES utf8mb4");
    await connection.query("SET time_zone = '+00:00'");
    await acquireMigrationLock(connection);
    lockAcquired = true;
    await ensureMigrationTable(connection);

    const migrations = await loadMigrationFiles();
    const [appliedRows] = await connection.query(
      `SELECT version, file_name, checksum_sha256 FROM schema_migrations ORDER BY CAST(version AS UNSIGNED) ASC, version ASC`,
    );
    const applied = new Map(appliedRows.map((row) => [String(row.version), row]));

    // Compatibilidade com instalações que receberam o 001_schema.sql antes do runner versionado.
    // O baseline só é registrado automaticamente quando todas as tabelas do schema 001 estão presentes.
    if (applied.size === 0 && migrations[0]?.numeric === 1n) {
      const baselineState = await detectPreRunnerBaseline(connection);
      if (baselineState.state === "partial") {
        throw new Error(
          `Banco MySQL aparenta ter um baseline 001 incompleto. Tabelas ausentes: ${baselineState.missing.join(", ")}. ` +
          "Não é seguro registrar nem reaplicar automaticamente o 001; corrija o schema antes de continuar.",
        );
      }
      if (baselineState.state === "complete") {
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
        console.log(`[segempat-api] baseline existente validado e registrado: ${baseline.fileName}`);
      }
    }

    validateAppliedHistory(migrations, applied);

    let appliedCount = 0;
    for (const migration of migrations) {
      if (applied.has(migration.version)) continue;

      console.log(`[segempat-api] aplicando ${migration.fileName}`);
      await connection.query(migration.sql);
      await connection.execute(
        `INSERT INTO schema_migrations (version, file_name, checksum_sha256, applied_at)
         VALUES (?, ?, ?, UTC_TIMESTAMP(3))`,
        [migration.version, migration.fileName, migration.checksum],
      );
      applied.set(migration.version, {
        version: migration.version,
        file_name: migration.fileName,
        checksum_sha256: migration.checksum,
      });
      appliedCount += 1;
    }

    if (appliedCount === 0) console.log("[segempat-api] schema MySQL já está atualizado");
    else console.log(`[segempat-api] ${appliedCount} migration(s) MySQL aplicada(s) com sucesso`);
  } finally {
    if (lockAcquired) await releaseMigrationLock(connection).catch((error) => {
      console.warn(`[segempat-api] aviso ao liberar lock de migrations: ${error?.message || error}`);
    });
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[segempat-api] falha ao aplicar migrations", error?.message || error);
  process.exit(1);
});
