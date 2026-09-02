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
        WHERE version = '001'
        LIMIT 1`,
    );
    if (!baseline) {
      throw new Error("Migration baseline 001 não está registrada em schema_migrations");
    }

    const engineRows = await queryOne(
      `SELECT COUNT(*) AS invalid_count
         FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name IN (${REQUIRED_TABLES.filter((name) => name !== "schema_migrations").map(() => "?").join(",")})
          AND engine <> 'InnoDB'`,
      REQUIRED_TABLES.filter((name) => name !== "schema_migrations"),
    );
    if (Number(engineRows?.invalid_count ?? 0) > 0) {
      throw new Error("Uma ou mais tabelas operacionais não estão usando InnoDB");
    }

    console.log(
      `[segempat-api] MySQL OK; banco=${database?.database_name}; versão=${version?.version}; ` +
      `${Number(tables?.total ?? 0)} tabela(s); migration=${baseline.version}:${baseline.file_name}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[segempat-api] smoke test falhou", error?.message || error);
  process.exit(1);
});
