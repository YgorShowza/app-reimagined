import { Router } from "express";
import { execute, query, queryOne, withTransaction } from "../db.js";
import { audit } from "../audit.js";
import { requireAdmin, requireAuth } from "../session.js";
import { asBool, asyncHandler, badRequest, conflict, notFound, requireOneOf, requireText, uuid } from "../util.js";

export const employeesRouter = Router();

const SECTORS = ["CFTV", "Vigilância", "Portaria", "Ronda", "Administrativo"];
const PROFILES = ["Inspetor", "Operacional"];
const STATUSES = ["Ativo", "Inativo"];

function mapEmployee(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    matricula: row.matricula,
    sector: row.sector,
    access_profile: row.access_profile,
    status: row.status,
    level: Number(row.level ?? 1),
    points: Number(row.points ?? 0),
    first_access: asBool(row.first_access),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

employeesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = req.user.isAdmin
      ? await query(`SELECT * FROM employees ORDER BY full_name ASC`)
      : await query(
          `SELECT * FROM employees WHERE status = 'Ativo' AND (sector = ? OR sector = 'Todos') ORDER BY full_name ASC`,
          [req.user.setor ?? ""],
        );
    res.json(rows.map(mapEmployee));
  }),
);

employeesRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const employee = await queryOne(
      `SELECT * FROM employees WHERE id = ? AND status = 'Ativo' LIMIT 1`,
      [req.user.employeeId],
    );
    if (!employee) throw notFound("Colaborador não encontrado");
    res.json(mapEmployee(employee));
  }),
);

function readEmployeeInput(body, { partial = false } = {}) {
  const input = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);

  if (!partial || has("full_name")) input.full_name = requireText(body?.full_name, "Nome completo");
  if (!partial || has("matricula")) input.matricula = requireText(body?.matricula, "Matrícula");
  if (!partial || has("sector")) input.sector = requireOneOf(body?.sector, SECTORS, "Setor");
  if (!partial || has("access_profile")) input.access_profile = requireOneOf(body?.access_profile, PROFILES, "Perfil de acesso", "Operacional");
  if (!partial || has("status")) input.status = requireOneOf(body?.status, STATUSES, "Situação", "Ativo");

  if (partial && Object.keys(input).length === 0) throw badRequest("Nenhum campo para atualizar");
  return input;
}

async function hasAccountOrHistory(employee) {
  const row = await queryOne(
    `SELECT
       (SELECT COUNT(*) FROM app_users u WHERE LOWER(TRIM(u.matricula)) = LOWER(TRIM(?))) AS accounts,
       (SELECT COUNT(*) FROM cronograma_entries WHERE employee_id = ?) AS cronograma,
       (SELECT COUNT(*) FROM occurrences WHERE employee_id = ?) AS occurrences,
       (SELECT COUNT(*) FROM practical_evaluations WHERE employee_id = ?) AS practical,
       (SELECT COUNT(*) FROM training_activity_attempts WHERE employee_id = ?) AS training,
       (SELECT COUNT(*) FROM exam_attempts WHERE LOWER(TRIM(COALESCE(matricula,''))) = LOWER(TRIM(?))) AS attempts`,
    [employee.matricula, employee.id, employee.id, employee.id, employee.id, employee.matricula],
  );
  return Object.values(row).some((value) => Number(value) > 0);
}

employeesRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const input = readEmployeeInput(req.body);
    const duplicate = await queryOne(`SELECT id FROM employees WHERE LOWER(TRIM(matricula)) = LOWER(TRIM(?))`, [input.matricula]);
    if (duplicate) throw conflict("Já existe colaborador com esta matrícula");

    const id = uuid();
    await withTransaction(async (connection) => {
      await connection.execute(
        `INSERT INTO employees (id, full_name, matricula, sector, access_profile, status, level, points, first_access, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 0, 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
        [id, input.full_name, input.matricula, input.sector, input.access_profile, input.status],
      );
      await audit(req.user.id, "INSERT", "employees", id, { new: { ...input, id } }, connection);
    });
    res.status(201).json({ id });
  }),
);

employeesRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const input = readEmployeeInput(req.body, { partial: true });
    const employee = await queryOne(`SELECT * FROM employees WHERE id = ?`, [req.params.id]);
    if (!employee) throw notFound("Colaborador não encontrado");

    if (input.matricula && input.matricula.trim().toLowerCase() !== String(employee.matricula).trim().toLowerCase()) {
      if (await hasAccountOrHistory(employee)) {
        throw conflict("Matrícula de colaborador com conta ou histórico não pode ser alterada. Inative o cadastro.");
      }
    }

    const fields = Object.keys(input);
    await withTransaction(async (connection) => {
      const [lockedRows] = await connection.execute(`SELECT * FROM employees WHERE id = ? FOR UPDATE`, [employee.id]);
      const lockedEmployee = lockedRows[0];
      if (!lockedEmployee) throw notFound("Colaborador não encontrado");

      await connection.execute(
        `UPDATE employees SET ${fields.map((field) => `${field} = ?`).join(", ")}, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`,
        [...fields.map((field) => input[field]), lockedEmployee.id],
      );

      if (input.access_profile || input.status) {
        const [accounts] = await connection.execute(
          `SELECT id FROM app_users WHERE LOWER(TRIM(matricula)) = LOWER(TRIM(?)) LIMIT 1 FOR UPDATE`,
          [lockedEmployee.matricula],
        );
        const account = accounts[0];
        if (account) {
          const profile = input.access_profile ?? lockedEmployee.access_profile;
          const status = input.status ?? lockedEmployee.status;
          if (profile === "Inspetor" && status === "Ativo") {
            await connection.execute(`INSERT IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')`, [uuid(), account.id]);
          } else {
            await connection.execute(`DELETE FROM user_roles WHERE user_id = ? AND role = 'admin'`, [account.id]);
          }
        }
      }

      await audit(req.user.id, "UPDATE", "employees", lockedEmployee.id, { old: lockedEmployee, new: input, role_sync_atomic: true }, connection);
    });
    res.status(204).end();
  }),
);

employeesRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const employee = await queryOne(`SELECT * FROM employees WHERE id = ?`, [req.params.id]);
    if (!employee) throw notFound("Colaborador não encontrado");
    if (await hasAccountOrHistory(employee)) {
      throw conflict("Colaborador possui conta ou histórico operacional. Inative o cadastro em vez de excluir.");
    }
    await withTransaction(async (connection) => {
      const [lockedRows] = await connection.execute(`SELECT * FROM employees WHERE id = ? FOR UPDATE`, [employee.id]);
      const lockedEmployee = lockedRows[0];
      if (!lockedEmployee) throw notFound("Colaborador não encontrado");
      await connection.execute(`DELETE FROM employees WHERE id = ?`, [lockedEmployee.id]);
      await audit(req.user.id, "DELETE", "employees", lockedEmployee.id, { old: lockedEmployee }, connection);
    });
    res.status(204).end();
  }),
);
