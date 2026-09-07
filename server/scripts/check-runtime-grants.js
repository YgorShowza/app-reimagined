import { config } from "../src/config.js";
import { pool, query, queryOne } from "../src/db.js";

const ALLOWED_DATA_PRIVILEGES = new Set(["SELECT", "INSERT", "UPDATE", "DELETE"]);

function normalizeIdentifier(value) {
  return String(value || "").replace(/`/g, "").trim().toLowerCase();
}

function grantText(row) {
  return Object.values(row ?? {}).map((value) => String(value ?? "")).find(Boolean) || "";
}

function parsePrivilegeList(grant) {
  const match = /^GRANT\s+(.+?)\s+ON\s+/i.exec(grant);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
}

function parseScope(grant) {
  const match = /\sON\s+(.+?)\s+TO\s+/i.exec(grant);
  return match ? normalizeIdentifier(match[1]) : null;
}

async function main() {
  const currentRole = await queryOne("SELECT CURRENT_ROLE() AS current_role");
  const roles = String(currentRole?.current_role || "NONE").trim();
  const usingClause = roles && roles.toUpperCase() !== "NONE" ? ` USING ${roles}` : "";
  const rows = await query(`SHOW GRANTS FOR CURRENT_USER${usingClause}`);
  const grants = rows.map(grantText).filter(Boolean);
  const problems = [];
  const expectedDatabase = normalizeIdentifier(config.db.database);

  for (const grant of grants) {
    const upper = grant.toUpperCase();

    if (upper.includes("WITH GRANT OPTION")) {
      problems.push("GRANT OPTION não é permitido para MYSQL_USER de runtime");
      continue;
    }

    const scope = parseScope(grant);
    if (!scope) {
      // Linhas sem ON normalmente representam atribuição de role. Quando há role
      // ativa, SHOW GRANTS ... USING expande seus privilégios efetivos nas demais linhas.
      continue;
    }

    const privileges = parsePrivilegeList(grant);
    const usageOnly = privileges.length === 1 && privileges[0] === "USAGE";
    if (scope === "*.*") {
      if (!usageOnly) problems.push(`privilégio global não permitido: ${grant}`);
      continue;
    }

    const scopeInsideDatabase = scope === `${expectedDatabase}.*` || scope.startsWith(`${expectedDatabase}.`);
    if (!scopeInsideDatabase) {
      problems.push(`acesso fora do database ${config.db.database} não permitido: ${grant}`);
      continue;
    }

    for (const privilege of privileges) {
      if (!ALLOWED_DATA_PRIVILEGES.has(privilege)) {
        problems.push(`privilégio de runtime não permitido no SEGEMPAT: ${privilege}`);
      }
    }
  }

  if (grants.length === 0) {
    problems.push("SHOW GRANTS não retornou privilégios para MYSQL_USER");
  }

  if (problems.length) {
    throw new Error(`MYSQL_USER não está em menor privilégio: ${[...new Set(problems)].join("; ")}`);
  }

  console.log(
    `[segempat-api] grants de runtime OK; database=${config.db.database}; privilégios permitidos=SELECT,INSERT,UPDATE,DELETE; roles=${roles}`,
  );
}

main()
  .catch((error) => {
    console.error("[segempat-api] validação de grants de runtime falhou", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
