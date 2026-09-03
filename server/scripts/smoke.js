import { healthcheck, queryOne, pool } from "../src/db.js";

const REQUIRED_TABLES = [
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
  "schema_migrations",
];

function mysqlMajor(versionText) {
  const match = /^(\d+)/.exec(String(versionText || ""));
  return match ? Number(match[1]) : NaN;
}

async function main() {
  try {
    await healthcheck();

    const version = await queryOne(`SELECT VERSION() AS version`);
    const database = await queryOne(`SELECT DATABASE() AS database_name`);
    const tables = await queryOne(
      `SELECT COUNT(*) AS total
         FROM information_schema.tables
        WHERE table_schema = DATABASE()`,
    );

    if (mysqlMajor(version?.version) < 8) {
      throw new Error(`Versão MySQL não suportada: ${version?.version || "desconhecida"}. O SEGEMPAT requer MySQL 8.0+`);
    }
    if (!database?.database_name) {
      throw new Error("Nenhum database MySQL foi selecionado para o SEGEMPAT");
    }

    const missing = [];
    for (const table of REQUIRED_TABLES) {
      const row = await queryOne(
        `SELECT COUNT(*) AS total
           FROM information_schema.tables
          WHERE table_schema = DATABASE() AND table_name = ?`,
        [table],
      );
      if (Number(row?.total ?? 0) !== 1) missing.push(table);
    }

    if (missing.length) {
      throw new Error(`Tabelas obrigatórias ausentes: ${missing.join(", ")}`);
    }

    const baseline = await queryOne(
      `SELECT version, file_name, applied_at
         FROM schema_migrations
        WHERE CAST(version AS UNSIGNED) = 1
        ORDER BY applied_at ASC
        LIMIT 1`,
    );
    if (!baseline) {
      throw new Error("Migration baseline 001 não está registrada em schema_migrations");
    }

    const latestMigration = await queryOne(
      `SELECT version, file_name, applied_at
         FROM schema_migrations
        ORDER BY CAST(version AS UNSIGNED) DESC, applied_at DESC
        LIMIT 1`,
    );
    if (!latestMigration) {
      throw new Error("Nenhuma migration MySQL está registrada");
    }

    const placeholders = REQUIRED_TABLES.map(() => "?").join(",");
    const engineRows = await queryOne(
      `SELECT COUNT(*) AS invalid_count
         FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name IN (${placeholders})
          AND engine <> 'InnoDB'`,
      REQUIRED_TABLES,
    );
    if (Number(engineRows?.invalid_count ?? 0) > 0) {
      throw new Error("Uma ou mais tabelas obrigatórias não estão usando InnoDB");
    }

    const charsetRows = await queryOne(
      `SELECT COUNT(*) AS invalid_count
         FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name IN (${placeholders})
          AND (table_collation IS NULL OR table_collation NOT LIKE 'utf8mb4%')`,
      REQUIRED_TABLES,
    );
    if (Number(charsetRows?.invalid_count ?? 0) > 0) {
      throw new Error("Uma ou mais tabelas obrigatórias não estão usando collation utf8mb4");
    }

    const fkRows = await queryOne(
      `SELECT COUNT(*) AS invalid_count
         FROM information_schema.referential_constraints
        WHERE constraint_schema = DATABASE()
          AND (referenced_table_name IS NULL OR referenced_table_name = '')`,
    );
    if (Number(fkRows?.invalid_count ?? 0) > 0) {
      throw new Error("Foram encontradas constraints referenciais inválidas no schema MySQL");
    }

    console.log(
      `[segempat-api] MySQL OK; banco=${database.database_name}; versão=${version.version}; ` +
      `${Number(tables?.total ?? 0)} tabela(s); baseline=${baseline.version}:${baseline.file_name}; ` +
      `latest=${latestMigration.version}:${latestMigration.file_name}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[segempat-api] smoke test falhou", error?.message || error);
  process.exit(1);
});
