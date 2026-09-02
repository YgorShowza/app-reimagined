import { healthcheck, queryOne, pool } from "../src/db.js";

async function main() {
  try {
    await healthcheck();
    const tables = await queryOne(
      `SELECT COUNT(*) AS total
         FROM information_schema.tables
        WHERE table_schema = DATABASE()`,
    );

    const required = ["app_users", "employees", "exams", "cronograma_entries", "audit_logs"];
    const missing = [];
    for (const table of required) {
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

    console.log(`[segempat-api] MySQL OK; ${Number(tables?.total ?? 0)} tabelas encontradas`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[segempat-api] smoke test falhou", error?.message || error);
  process.exit(1);
});
