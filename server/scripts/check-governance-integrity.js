import { pool, query } from "../src/db.js";

async function main() {
  const problems = [];

  const columns = await query(
    `SELECT column_name, column_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'app_users'
        AND column_name = 'session_epoch'`,
  );
  const epoch = columns[0];
  if (!epoch) {
    problems.push("app_users.session_epoch ausente");
  } else {
    if (String(epoch.column_type).toLowerCase() !== "bigint unsigned") {
      problems.push(`app_users.session_epoch tipo=${epoch.column_type}; esperado bigint unsigned`);
    }
    if (String(epoch.is_nullable).toUpperCase() !== "NO") {
      problems.push("app_users.session_epoch deve ser NOT NULL");
    }
    if (Number(epoch.column_default) !== 0) {
      problems.push(`app_users.session_epoch default=${epoch.column_default}; esperado 0`);
    }
  }

  const triggers = await query(
    `SELECT trigger_name, action_timing, event_manipulation
       FROM information_schema.triggers
      WHERE trigger_schema = DATABASE()
        AND event_object_table = 'audit_logs'
        AND trigger_name IN ('audit_logs_block_update', 'audit_logs_block_delete')`,
  );
  const byName = new Map(triggers.map((row) => [String(row.trigger_name), row]));
  const expectedTriggers = [
    ["audit_logs_block_update", "BEFORE", "UPDATE"],
    ["audit_logs_block_delete", "BEFORE", "DELETE"],
  ];
  for (const [name, timing, event] of expectedTriggers) {
    const row = byName.get(name);
    if (!row) {
      problems.push(`trigger ${name} ausente`);
      continue;
    }
    if (String(row.action_timing).toUpperCase() !== timing || String(row.event_manipulation).toUpperCase() !== event) {
      problems.push(`trigger ${name} divergente: ${row.action_timing} ${row.event_manipulation}; esperado ${timing} ${event}`);
    }
  }

  const constraints = await query(
    `SELECT rc.constraint_name, rc.update_rule, rc.delete_rule
       FROM information_schema.referential_constraints rc
      WHERE rc.constraint_schema = DATABASE()
        AND rc.table_name = 'audit_logs'
        AND rc.constraint_name = 'audit_logs_actor_fk'`,
  );
  const actorFk = constraints[0];
  if (!actorFk) {
    problems.push("audit_logs_actor_fk ausente");
  } else {
    const updateRule = String(actorFk.update_rule).toUpperCase();
    const deleteRule = String(actorFk.delete_rule).toUpperCase();
    if (!new Set(["RESTRICT", "NO ACTION"]).has(updateRule)) {
      problems.push(`audit_logs_actor_fk update_rule=${updateRule}; esperado RESTRICT/NO ACTION`);
    }
    if (!new Set(["RESTRICT", "NO ACTION"]).has(deleteRule)) {
      problems.push(`audit_logs_actor_fk delete_rule=${deleteRule}; esperado RESTRICT/NO ACTION`);
    }
  }

  if (problems.length) {
    throw new Error(`Governança MySQL divergente: ${problems.join("; ")}`);
  }

  console.log("[segempat-api] governança MySQL OK: auditoria append-only, ator preservado e session_epoch ativo");
}

main()
  .catch((error) => {
    console.error("[segempat-api] validação de governança falhou", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
