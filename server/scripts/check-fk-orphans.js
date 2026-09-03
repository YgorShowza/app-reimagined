import { pool, query, queryOne } from "../src/db.js";

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

    console.log(`[segempat-api] integridade referencial OK; ${foreignKeys.length} foreign key(s) sem registros órfãos`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[segempat-api] auditoria de órfãos falhou", error?.message || error);
  process.exit(1);
});
