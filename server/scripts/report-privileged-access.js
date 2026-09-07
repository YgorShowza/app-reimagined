import { pool, query } from "../src/db.js";

function statusFor(row) {
  if (row.access_profile === "Inspetor" && row.employee_status === "Ativo" && row.account_status === "Ativo" && row.admin_role === 1) {
    return "OK";
  }
  if (row.access_profile === "Inspetor" && !row.user_id) return "SEM_CONTA";
  if (row.access_profile === "Inspetor" && row.admin_role !== 1) return "SEM_ROLE_ADMIN";
  if (row.access_profile !== "Inspetor" && row.admin_role === 1) return "ROLE_ADMIN_INDEVIDA";
  if (row.employee_status !== "Ativo" || (row.user_id && row.account_status !== "Ativo")) return "INATIVO";
  return "REVISAR";
}

async function main() {
  const rows = await query(
    `SELECT e.id AS employee_id,
            e.full_name,
            e.matricula,
            e.access_profile,
            e.status AS employee_status,
            u.id AS user_id,
            u.status AS account_status,
            CASE WHEN r.user_id IS NULL THEN 0 ELSE 1 END AS admin_role,
            latest.action AS last_privileged_action,
            latest.created_at AS last_privileged_action_at,
            JSON_UNQUOTE(JSON_EXTRACT(latest.details, '$.executed_by_ti')) AS last_ti_operator
       FROM employees e
       LEFT JOIN app_users u
         ON LOWER(TRIM(u.matricula)) = LOWER(TRIM(e.matricula))
       LEFT JOIN user_roles r
         ON r.user_id = u.id AND r.role = 'admin'
       LEFT JOIN audit_logs latest
         ON latest.id = (
           SELECT al.id
             FROM audit_logs al
            WHERE al.entity = 'employees'
              AND al.entity_id = e.id
              AND al.action IN ('TI_GRANT_INSPECTOR', 'TI_REVOKE_INSPECTOR')
            ORDER BY al.created_at DESC, al.id DESC
            LIMIT 1
         )
      WHERE e.access_profile = 'Inspetor'
         OR r.user_id IS NOT NULL
      ORDER BY e.full_name ASC`,
  );

  const report = rows.map((row) => ({
    status: statusFor({ ...row, admin_role: Number(row.admin_role) }),
    nome: row.full_name,
    matricula: row.matricula,
    perfil: row.access_profile,
    colaborador: row.employee_status,
    conta: row.account_status ?? "Sem conta",
    admin: Number(row.admin_role) === 1 ? "sim" : "não",
    ultima_acao: row.last_privileged_action ?? "Sem registro TI",
    ultima_acao_em: row.last_privileged_action_at ?? "-",
    responsavel_ti: row.last_ti_operator ?? "-",
  }));

  const activeInspectors = report.filter((row) => row.status === "OK").length;
  const anomalies = report.filter((row) => !new Set(["OK", "SEM_CONTA", "INATIVO"]).has(row.status));

  console.log(`\nSEGEMPAT · Revisão de acessos privilegiados`);
  console.log(`Inspetores ativos e coerentes: ${activeInspectors}`);
  console.log(`Registros para revisão: ${anomalies.length}`);
  if (report.length) console.table(report);
  else console.log("Nenhum perfil/role privilegiado encontrado.");

  if (anomalies.length) {
    console.warn("[segempat-api] atenção: existem divergências de privilégio que devem ser revisadas pela TI");
    process.exitCode = 2;
  }
}

main()
  .catch((error) => {
    console.error("[segempat-api] falha ao gerar revisão de privilégios", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
