/**
 * Gestão de privilégio de Inspetor — execução exclusiva pela TI no servidor da API.
 *
 * Exemplos:
 *   CONFIRM_PRIVILEGED_ACCESS=SIM ACTION=GRANT MATRICULA=970 TI_OPERATOR="Nome do analista TI" \
 *     node scripts/manage-inspector-access.js
 *
 *   CONFIRM_PRIVILEGED_ACCESS=SIM ACTION=REVOKE MATRICULA=970 TI_OPERATOR="Nome do analista TI" \
 *     node scripts/manage-inspector-access.js
 *
 * O comando nunca recebe senha. Ele apenas controla o perfil funcional privilegiado
 * e a role administrativa correspondente, dentro de uma transação e com auditoria.
 */
import { randomUUID } from "node:crypto";
import { pool, withTransaction } from "../src/db.js";

const confirmation = String(process.env["CONFIRM_PRIVILEGED_ACCESS"] || "").trim().toUpperCase();
const action = String(process.env["ACTION"] || "").trim().toUpperCase();
const matricula = String(process.env["MATRICULA"] || "").trim();
const tiOperator = String(process.env["TI_OPERATOR"] || "").trim();

function fail(message) {
  console.error(`[manage-inspector-access] ${message}`);
  process.exitCode = 1;
}

if (confirmation !== "SIM") fail("operação bloqueada; defina CONFIRM_PRIVILEGED_ACCESS=SIM");
if (!new Set(["GRANT", "REVOKE"]).has(action)) fail("ACTION deve ser GRANT ou REVOKE");
if (!matricula) fail("MATRICULA é obrigatória");
if (matricula.length > 64) fail("MATRICULA excede 64 caracteres");
if (!tiOperator) fail("TI_OPERATOR é obrigatório para rastreabilidade");
if (tiOperator.length > 255) fail("TI_OPERATOR excede 255 caracteres");

if (!process.exitCode) {
  try {
    const result = await withTransaction(async (connection) => {
      const [employees] = await connection.execute(
        `SELECT id, full_name, matricula, access_profile, status
           FROM employees
          WHERE LOWER(TRIM(matricula)) = LOWER(TRIM(?))
          LIMIT 1
          FOR UPDATE`,
        [matricula],
      );
      const employee = employees[0];
      if (!employee) throw new Error("colaborador não encontrado");
      if (action === "GRANT" && employee.status !== "Ativo") {
        throw new Error("não é permitido conceder privilégio a colaborador inativo");
      }

      const [accounts] = await connection.execute(
        `SELECT id, status
           FROM app_users
          WHERE LOWER(TRIM(matricula)) = LOWER(TRIM(?))
          LIMIT 1
          FOR UPDATE`,
        [employee.matricula],
      );
      const account = accounts[0] ?? null;

      if (action === "GRANT") {
        await connection.execute(
          `UPDATE employees
              SET access_profile = 'Inspetor', updated_at = UTC_TIMESTAMP(3)
            WHERE id = ?`,
          [employee.id],
        );
        if (account) {
          await connection.execute(
            `INSERT IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')`,
            [randomUUID(), account.id],
          );
        }
      } else {
        await connection.execute(
          `UPDATE employees
              SET access_profile = 'Operacional', updated_at = UTC_TIMESTAMP(3)
            WHERE id = ?`,
          [employee.id],
        );
        if (account) {
          await connection.execute(
            `DELETE FROM user_roles WHERE user_id = ? AND role = 'admin'`,
            [account.id],
          );
        }
      }

      const auditAction = action === "GRANT" ? "TI_GRANT_INSPECTOR" : "TI_REVOKE_INSPECTOR";
      await connection.execute(
        `INSERT INTO audit_logs (id, actor_id, action, entity, entity_id, details, created_at)
         VALUES (?, NULL, ?, 'employees', ?, ?, UTC_TIMESTAMP(3))`,
        [
          randomUUID(),
          auditAction,
          employee.id,
          JSON.stringify({
            matricula: employee.matricula,
            employee_name: employee.full_name,
            previous_access_profile: employee.access_profile,
            new_access_profile: action === "GRANT" ? "Inspetor" : "Operacional",
            account_id: account?.id ?? null,
            account_status: account?.status ?? null,
            role_changed: Boolean(account),
            executed_by_ti: tiOperator,
            explicit_confirmation: true,
            via: "server/scripts/manage-inspector-access.js",
          }),
        ],
      );

      return {
        employee: employee.full_name,
        matricula: employee.matricula,
        profile: action === "GRANT" ? "Inspetor" : "Operacional",
        accountLinked: Boolean(account),
      };
    });

    console.log(
      `[manage-inspector-access] concluído: ${result.employee} (${result.matricula}) -> ${result.profile}; conta vinculada: ${result.accountLinked ? "sim" : "não"}`,
    );
  } catch (error) {
    fail(error?.message || String(error));
  } finally {
    await pool.end();
  }
}
