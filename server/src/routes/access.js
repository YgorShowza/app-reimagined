import { Router } from "express";
import bcrypt from "bcryptjs";
import { execute, query, queryOne } from "../db.js";
import { audit } from "../audit.js";
import { requireAdmin } from "../session.js";
import { asyncHandler, badRequest, conflict, notFound, numericCode, uuid } from "../util.js";

export const accessRouter = Router();

const CODE_TTL_HOURS = 24;

accessRouter.get(
  "/activation-codes",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    // Nunca retorna o código puro — somente estado do convite.
    const rows = await query(
      `SELECT r.employee_id, e.full_name, e.matricula, e.sector,
              r.expires_at, r.used_at, r.created_at,
              (SELECT COUNT(*) FROM app_users u WHERE LOWER(TRIM(u.matricula)) = LOWER(TRIM(e.matricula))) AS has_account
         FROM registration_activation_codes r
         JOIN employees e ON e.id = r.employee_id
        ORDER BY r.created_at DESC`,
    );
    res.json(
      rows.map((row) => ({
        employee_id: row.employee_id,
        employee_name: row.full_name,
        matricula: row.matricula,
        sector: row.sector,
        expires_at: row.expires_at,
        used_at: row.used_at,
        created_at: row.created_at,
        has_account: Number(row.has_account) > 0,
        expired: !row.used_at && new Date(row.expires_at).getTime() < Date.now(),
      })),
    );
  }),
);

accessRouter.post(
  "/activation-codes/:employeeId",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const employee = await queryOne(`SELECT * FROM employees WHERE id = ? AND status = 'Ativo'`, [req.params.employeeId]);
    if (!employee) throw notFound("Colaborador ativo não encontrado");

    const account = await queryOne(`SELECT id FROM app_users WHERE LOWER(TRIM(matricula)) = LOWER(TRIM(?))`, [employee.matricula]);
    if (account) throw conflict("Esta matrícula já possui acesso cadastrado");

    const code = numericCode(8);
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + CODE_TTL_HOURS * 3600_000);

    await execute(
      `INSERT INTO registration_activation_codes (employee_id, code_hash, expires_at, used_at, created_by, created_at)
       VALUES (?, ?, ?, NULL, ?, UTC_TIMESTAMP(3))
       ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), expires_at = VALUES(expires_at),
                               used_at = NULL, created_by = VALUES(created_by), created_at = UTC_TIMESTAMP(3)`,
      [employee.id, codeHash, expiresAt, req.user.id],
    );
    await audit(req.user.id, "ISSUE_ACTIVATION_CODE", "registration_activation_codes", employee.id, {
      matricula: employee.matricula,
    });

    // Código puro devolvido uma única vez; o banco guarda apenas o hash.
    res.status(201).json({
      code,
      employee_id: employee.id,
      employee_name: employee.full_name,
      matricula: employee.matricula,
      expires_at: expiresAt.toISOString(),
    });
  }),
);

accessRouter.delete(
  "/activation-codes/:employeeId",
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!req.params.employeeId) throw badRequest("Colaborador não informado");
    await execute(`DELETE FROM registration_activation_codes WHERE employee_id = ?`, [req.params.employeeId]);
    await audit(req.user.id, "REVOKE_ACTIVATION_CODE", "registration_activation_codes", req.params.employeeId);
    res.status(204).end();
  }),
);

accessRouter.get(
  "/audit",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query["limit"] || 100), 500);
    const offset = Math.max(Number(req.query["offset"] || 0), 0);
    const rows = await query(
      `SELECT a.id, a.actor_id, p.nome AS actor_name, a.action, a.entity, a.entity_id, a.created_at
         FROM audit_logs a
         LEFT JOIN profiles p ON p.id = a.actor_id
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?`,
      [String(limit), String(offset)],
    );
    res.json({ items: rows, nextOffset: rows.length === limit ? offset + limit : null });
  }),
);
