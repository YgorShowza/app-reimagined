import { pool, query, queryOne } from "../src/db.js";

const EXPECTED_COLUMNS = new Map([
  ["min_approval_score", { dataType: "decimal", nullable: "NO" }],
  ["template_id", { dataType: "char", nullable: "YES", length: 36 }],
  ["template_slot", { dataType: "varchar", nullable: "YES", length: 64 }],
]);

async function loadIndex(indexName) {
  return query(
    `SELECT index_name, non_unique, seq_in_index, column_name, sub_part
       FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'practical_evaluations'
        AND index_name = ?
      ORDER BY seq_in_index`,
    [indexName],
  );
}

function validateIndex(rows, indexName, expectedColumns, { unique }) {
  if (rows.length !== expectedColumns.length) {
    throw new Error(`${indexName}: definição ausente/incompleta; esperadas ${expectedColumns.length} coluna(s), encontradas ${rows.length}`);
  }
  const actual = rows.map((row) => String(row.column_name));
  if (!actual.every((column, index) => column === expectedColumns[index])) {
    throw new Error(`${indexName}: colunas [${actual.join(",")}] divergentes; esperado [${expectedColumns.join(",")}]`);
  }
  const expectedNonUnique = unique ? 0 : 1;
  if (rows.some((row) => Number(row.non_unique) !== expectedNonUnique)) {
    throw new Error(`${indexName}: unicidade divergente; esperado ${unique ? "UNIQUE" : "INDEX não-UNIQUE"}`);
  }
  if (rows.some((row) => row.sub_part != null)) {
    throw new Error(`${indexName}: não pode usar prefixo parcial de coluna`);
  }
}

async function main() {
  try {
    const columns = await query(
      `SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
         FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'practical_evaluations'
          AND column_name IN ('min_approval_score','template_id','template_slot')`,
    );
    const byName = new Map(columns.map((row) => [String(row.column_name), row]));

    for (const [name, expected] of EXPECTED_COLUMNS) {
      const row = byName.get(name);
      if (!row) throw new Error(`practical_evaluations.${name}: coluna ausente`);
      if (String(row.data_type).toLowerCase() !== expected.dataType) {
        throw new Error(`practical_evaluations.${name}: tipo ${row.data_type}; esperado ${expected.dataType}`);
      }
      if (String(row.is_nullable).toUpperCase() !== expected.nullable) {
        throw new Error(`practical_evaluations.${name}: nullable=${row.is_nullable}; esperado ${expected.nullable}`);
      }
      if (expected.length && Number(row.character_maximum_length) !== expected.length) {
        throw new Error(`practical_evaluations.${name}: tamanho ${row.character_maximum_length}; esperado ${expected.length}`);
      }
    }

    const minApproval = byName.get("min_approval_score");
    if (Number(minApproval?.column_default) !== 7) {
      throw new Error(`practical_evaluations.min_approval_score: default ${minApproval?.column_default}; esperado 7`);
    }

    validateIndex(
      await loadIndex("practical_evaluations_template_slot_unique_idx"),
      "practical_evaluations_template_slot_unique_idx",
      ["employee_id", "template_id", "template_slot"],
      { unique: true },
    );
    validateIndex(
      await loadIndex("practical_evaluations_template_idx"),
      "practical_evaluations_template_idx",
      ["template_id", "evaluation_date"],
      { unique: false },
    );

    const foreignKey = await queryOne(
      `SELECT kcu.table_name,
              kcu.column_name,
              kcu.referenced_table_name,
              kcu.referenced_column_name,
              rc.delete_rule,
              rc.update_rule
         FROM information_schema.key_column_usage AS kcu
         JOIN information_schema.referential_constraints AS rc
           ON rc.constraint_schema = kcu.constraint_schema
          AND rc.constraint_name = kcu.constraint_name
          AND rc.table_name = kcu.table_name
        WHERE kcu.constraint_schema = DATABASE()
          AND kcu.constraint_name = 'practical_evaluations_template_fk'
          AND kcu.table_name = 'practical_evaluations'
        LIMIT 1`,
    );
    if (!foreignKey) throw new Error("practical_evaluations_template_fk: foreign key ausente");
    if (
      String(foreignKey.column_name) !== "template_id" ||
      String(foreignKey.referenced_table_name) !== "practical_eval_templates" ||
      String(foreignKey.referenced_column_name) !== "id" ||
      String(foreignKey.delete_rule).toUpperCase() !== "RESTRICT" ||
      String(foreignKey.update_rule).toUpperCase() !== "RESTRICT"
    ) {
      throw new Error("practical_evaluations_template_fk: definição ou regras referenciais divergentes da migration 004");
    }

    const inconsistentPair = await queryOne(
      `SELECT COUNT(*) AS total
         FROM practical_evaluations
        WHERE (template_id IS NULL AND template_slot IS NOT NULL)
           OR (template_id IS NOT NULL AND template_slot IS NULL)`,
    );
    if (Number(inconsistentPair?.total ?? 0) > 0) {
      throw new Error(`Avaliações com vínculo de modelo incompleto: ${inconsistentPair.total}`);
    }

    const invalidThreshold = await queryOne(
      `SELECT COUNT(*) AS total
         FROM practical_evaluations
        WHERE min_approval_score < 0 OR min_approval_score > 10`,
    );
    if (Number(invalidThreshold?.total ?? 0) > 0) {
      throw new Error(`Avaliações com nota mínima fora de 0..10: ${invalidThreshold.total}`);
    }

    const invalidSlots = await queryOne(
      `SELECT COUNT(*) AS total
         FROM practical_evaluations
        WHERE template_id IS NOT NULL
          AND template_slot <> 'once'
          AND template_slot NOT REGEXP '^[0-9]{4}-(0[1-9]|1[0-2]):[0-9]{2}$'`,
    );
    if (Number(invalidSlots?.total ?? 0) > 0) {
      throw new Error(`Avaliações recorrentes com template_slot inválido: ${invalidSlots.total}`);
    }

    const wrongMonth = await queryOne(
      `SELECT COUNT(*) AS total
         FROM practical_evaluations
        WHERE template_id IS NOT NULL
          AND template_slot <> 'once'
          AND evaluation_date IS NOT NULL
          AND DATE_FORMAT(evaluation_date, '%Y-%m') <> LEFT(template_slot, 7)`,
    );
    if (Number(wrongMonth?.total ?? 0) > 0) {
      throw new Error(`Avaliações recorrentes com data fora do mês do slot: ${wrongMonth.total}`);
    }

    const duplicateSlots = await queryOne(
      `SELECT COUNT(*) AS total
         FROM (
           SELECT employee_id, template_id, template_slot
             FROM practical_evaluations
            WHERE template_id IS NOT NULL AND template_slot IS NOT NULL
            GROUP BY employee_id, template_id, template_slot
           HAVING COUNT(*) > 1
         ) AS duplicated`,
    );
    if (Number(duplicateSlots?.total ?? 0) > 0) {
      throw new Error(`Slots recorrentes duplicados encontrados: ${duplicateSlots.total}`);
    }

    console.log(
      "[segempat-api] geração recorrente de Avaliação Prática OK; migrations 003/004, colunas, índices, FK, slots, período e nota mínima auditados",
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[segempat-api] auditoria da geração recorrente de Avaliação Prática falhou", error?.message || error);
  process.exit(1);
});