import fs from "node:fs/promises";
import mysql from "mysql2/promise";
import { config } from "../src/config.js";

const EXPECTED_TABLE_COLLATION = "utf8mb4_unicode_ci";
const EXPECTED_COLUMNS = new Map([
  ["version", { dataType: "varchar", maxLength: 32, nullable: false, characterSet: "utf8mb4", collation: EXPECTED_TABLE_COLLATION }],
  ["file_name", { dataType: "varchar", maxLength: 255, nullable: false, characterSet: "utf8mb4", collation: EXPECTED_TABLE_COLLATION }],
  ["checksum_sha256", { dataType: "char", maxLength: 64, nullable: false, characterSet: "utf8mb4", collation: EXPECTED_TABLE_COLLATION }],
  ["applied_at", { dataType: "datetime", precision: 3, nullable: false, defaultValue: "current_timestamp(3)" }],
]);

async function sslOptions() {
  if (!config.db.ssl) return undefined;
  if (!config.db.caPath) return { rejectUnauthorized: true };
  const ca = await fs.readFile(config.db.caPath, "utf8");
  return { ca, rejectUnauthorized: true };
}

function normalizeDefault(value) {
  if (value == null) return null;
  return String(value).trim().replace(/\s+/g, "").toLowerCase();
}

function validateColumns(rows) {
  const byName = new Map(rows.map((row) => [String(row.column_name), row]));
  const problems = [];

  const unexpectedColumns = [...byName.keys()].filter((columnName) => !EXPECTED_COLUMNS.has(columnName));
  if (unexpectedColumns.length > 0) {
    problems.push(`colunas inesperadas [${unexpectedColumns.join(", ")}]`);
  }

  for (const [columnName, expected] of EXPECTED_COLUMNS) {
    const actual = byName.get(columnName);
    if (!actual) {
      problems.push(`${columnName}: ausente`);
      continue;
    }

    const dataType = String(actual.data_type || "").toLowerCase();
    if (dataType !== expected.dataType) {
      problems.push(`${columnName}: tipo=${dataType || "desconhecido"}; esperado ${expected.dataType}`);
    }

    if (expected.maxLength != null && Number(actual.character_maximum_length) !== expected.maxLength) {
      problems.push(
        `${columnName}: tamanho=${actual.character_maximum_length ?? "desconhecido"}; esperado ${expected.maxLength}`,
      );
    }

    if (expected.precision != null && Number(actual.datetime_precision) !== expected.precision) {
      problems.push(
        `${columnName}: precisão temporal=${actual.datetime_precision ?? "desconhecida"}; esperado ${expected.precision}`,
      );
    }

    const nullable = String(actual.is_nullable || "").toUpperCase() === "YES";
    if (nullable !== expected.nullable) {
      problems.push(`${columnName}: nullable=${nullable}; esperado ${expected.nullable}`);
    }

    if (expected.characterSet != null) {
      const characterSet = String(actual.character_set_name || "").toLowerCase();
      if (characterSet !== expected.characterSet) {
        problems.push(
          `${columnName}: charset=${characterSet || "desconhecido"}; esperado ${expected.characterSet}`,
        );
      }
    }

    if (expected.collation != null) {
      const collation = String(actual.collation_name || "").toLowerCase();
      if (collation !== expected.collation) {
        problems.push(
          `${columnName}: collation=${collation || "desconhecida"}; esperado ${expected.collation}`,
        );
      }
    }

    if (Object.hasOwn(expected, "defaultValue")) {
      const actualDefault = normalizeDefault(actual.column_default);
      if (actualDefault !== expected.defaultValue) {
        problems.push(
          `${columnName}: default=${actualDefault ?? "NULL"}; esperado ${expected.defaultValue}`,
        );
      }
    } else if (actual.column_default !== null) {
      problems.push(`${columnName}: possui default inesperado ${actual.column_default}`);
    }

    const extra = String(actual.extra || "").toLowerCase();
    if (/\bon update\b/i.test(extra)) {
      problems.push(`${columnName}: possui ON UPDATE inesperado`);
    }
    if (extra.includes("generated") && !extra.includes("default_generated")) {
      problems.push(`${columnName}: possui atributo GENERATED inesperado (${actual.extra})`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`schema_migrations possui colunas incompatíveis: ${problems.join("; ")}`);
  }
}

function groupIndexes(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const name = String(row.index_name);
    if (!grouped.has(name)) {
      grouped.set(name, { nonUnique: Number(row.non_unique), columns: [] });
    }
    grouped.get(name).columns.push({
      name: String(row.column_name),
      sequence: Number(row.seq_in_index),
      prefixLength: row.sub_part == null ? null : Number(row.sub_part),
    });
  }

  for (const index of grouped.values()) {
    index.columns.sort((a, b) => a.sequence - b.sequence);
  }
  return grouped;
}

function validateIndex(indexes, indexName, expectedColumns) {
  const actual = indexes.get(indexName);
  if (!actual) throw new Error(`schema_migrations não possui o índice obrigatório ${indexName}`);
  if (actual.nonUnique !== 0) throw new Error(`schema_migrations.${indexName} não é UNIQUE`);

  const actualColumns = actual.columns.map((column) => column.name);
  const exact =
    actualColumns.length === expectedColumns.length &&
    actualColumns.every((columnName, index) => columnName === expectedColumns[index]);
  if (!exact) {
    throw new Error(
      `schema_migrations.${indexName} possui colunas [${actualColumns.join(",")}]; esperado [${expectedColumns.join(",")}]`,
    );
  }

  const prefixed = actual.columns.filter((column) => column.prefixLength !== null);
  if (prefixed.length > 0) {
    throw new Error(`schema_migrations.${indexName} usa prefixo parcial de coluna`);
  }
}

async function main() {
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
    const [tableRows] = await connection.execute(
      `SELECT engine, table_collation
         FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'schema_migrations'
        LIMIT 1`,
    );
    const table = tableRows?.[0];
    if (!table) throw new Error("schema_migrations não existe após ensureMigrationTable");

    if (String(table.engine || "").toUpperCase() !== "INNODB") {
      throw new Error(`schema_migrations exige InnoDB; detectado ${table.engine || "desconhecido"}`);
    }
    const tableCollation = String(table.table_collation || "").toLowerCase();
    if (tableCollation !== EXPECTED_TABLE_COLLATION) {
      throw new Error(
        `schema_migrations exige collation ${EXPECTED_TABLE_COLLATION}; detectado ${table.table_collation || "desconhecida"}`,
      );
    }

    const [columnRows] = await connection.execute(
      `SELECT column_name,
              data_type,
              character_maximum_length,
              datetime_precision,
              is_nullable,
              column_default,
              character_set_name,
              collation_name,
              extra
         FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'schema_migrations'
        ORDER BY ordinal_position`,
    );
    validateColumns(columnRows);

    const [indexRows] = await connection.execute(
      `SELECT index_name, non_unique, seq_in_index, column_name, sub_part
         FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'schema_migrations'
        ORDER BY index_name, seq_in_index`,
    );
    const indexes = groupIndexes(indexRows);
    validateIndex(indexes, "PRIMARY", ["version"]);
    validateIndex(indexes, "schema_migrations_file_name_key", ["file_name"]);

    console.log(
      "[segempat-api] schema_migrations validada: storage, colunas exatas, defaults, charset/collation, PK e índice UNIQUE corretos",
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[segempat-api] validação de schema_migrations falhou", error?.message || error);
  process.exit(1);
});
