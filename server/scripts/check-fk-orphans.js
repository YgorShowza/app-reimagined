import { pool, query, queryOne } from "../src/db.js";

const REQUIRED_FOREIGN_KEYS = [
  "profiles_user_fk",
  "profiles_employee_matricula_fk",
  "user_roles_user_fk",
  "registration_activation_employee_fk",
  "registration_activation_creator_fk",
  "exams_creator_fk",
  "exam_attempts_exam_fk",
  "exam_attempts_user_fk",
  "certificates_attempt_fk",
  "certificates_exam_fk",
  "certificates_user_fk",
  "cronograma_entries_employee_fk",
  "cronograma_entries_exam_fk",
  "cronograma_entries_creator_fk",
  "cronograma_recurring_creator_fk",
  "cronograma_suspensions_employee_fk",
  "cronograma_suspensions_creator_fk",
  "knowledge_items_creator_fk",
  "question_bank_creator_fk",
  "training_modules_creator_fk",
  "training_activity_user_fk",
  "training_activity_employee_fk",
  "training_schedules_employee_fk",
  "training_schedules_creator_fk",
  "practical_eval_templates_creator_fk",
  "practical_evaluations_employee_fk",
  "practical_evaluations_evaluator_fk",
  "occurrences_employee_fk",
  "occurrences_creator_fk",
  "audit_logs_actor_fk",
];

function quoteIdentifier(value) {
  return `\`${String(value).replaceAll("`", "``")}\``;
}

function groupForeignKeys(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.constraint_name}\u0000${row.table_name}\u0000${row.referenced_table_name}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        constraintName: String(row.constraint_name),
        tableName: String(row.table_name),
        referencedTableName: String(row.referenced_table_name),
        columns: [],
      });
    }
    grouped.get(key).columns.push({
      columnName: String(row.column_name),
      referencedColumnName: String(row.referenced_column_name),
      ordinalPosition: Number(row.ordinal_position),
    });
  }

  return [...grouped.values()].map((foreignKey) => ({
    ...foreignKey,
    columns: foreignKey.columns.sort((a, b) => a.ordinalPosition - b.ordinalPosition),
  }));
}

async function main() {
  try {
    const rows = await query(
      `SELECT constraint_name,
              table_name,
              column_name,
              referenced_table_name,
              referenced_column_name,
              ordinal_position
         FROM information_schema.key_column_usage
        WHERE constraint_schema = DATABASE()
          AND referenced_table_name IS NOT NULL
        ORDER BY constraint_name, ordinal_position`,
    );

    const foreignKeys = groupForeignKeys(rows);
    if (foreignKeys.length === 0) {
      throw new Error("Nenhuma foreign key foi encontrada no schema MySQL do SEGEMPAT");
    }

    const foundNames = new Set(foreignKeys.map((foreignKey) => foreignKey.constraintName));
    const missingForeignKeys = REQUIRED_FOREIGN_KEYS.filter((constraintName) => !foundNames.has(constraintName));
    if (missingForeignKeys.length > 0) {
      throw new Error(
        `Auditoria de órfãos não pode prosseguir: foreign keys críticas ausentes: ${missingForeignKeys.join(", ")}`,
      );
    }

    const orphaned = [];
    for (const foreignKey of foreignKeys) {
      const childTable = quoteIdentifier(foreignKey.tableName);
      const parentTable = quoteIdentifier(foreignKey.referencedTableName);
      const joinCondition = foreignKey.columns
        .map(({ columnName, referencedColumnName }) =>
          `child.${quoteIdentifier(columnName)} = parent.${quoteIdentifier(referencedColumnName)}`,
        )
        .join(" AND ");
      const populatedChildColumns = foreignKey.columns
        .map(({ columnName }) => `child.${quoteIdentifier(columnName)} IS NOT NULL`)
        .join(" AND ");
      const parentProbe = `parent.${quoteIdentifier(foreignKey.columns[0].referencedColumnName)} IS NULL`;

      const result = await queryOne(
        `SELECT COUNT(*) AS total
           FROM ${childTable} AS child
           LEFT JOIN ${parentTable} AS parent
             ON ${joinCondition}
          WHERE ${populatedChildColumns}
            AND ${parentProbe}`,
      );
      const total = Number(result?.total ?? 0);
      if (total > 0) {
        orphaned.push(`${foreignKey.constraintName}=${total}`);
      }
    }

    if (orphaned.length > 0) {
      throw new Error(
        `Foram encontrados registros órfãos em foreign keys do SEGEMPAT: ${orphaned.join(", ")}. ` +
        "Corrija os dados importados antes da homologação/cutover.",
      );
    }

    console.log(
      `[segempat-api] integridade referencial OK; ${foreignKeys.length} foreign key(s) auditada(s); ` +
      `${REQUIRED_FOREIGN_KEYS.length} foreign key(s) crítica(s) presentes; nenhum registro órfão`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[segempat-api] auditoria de órfãos falhou", error?.message || error);
  process.exit(1);
});
