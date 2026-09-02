import { Router } from "express";
import bcrypt from "bcryptjs";
import { execute, queryOne, withTransaction } from "../db.js";
import { audit } from "../audit.js";
import { clearSessionCookie, loadAuthContext, requireAuth, setSessionCookie, toSessionUser } from "../session.js";
import { asyncHandler, badRequest, forbidden, requireText, unauthorized, uuid } from "../util.js";

export const authRouter = Router();

const MIN_PASSWORD = 8;

function normalizeMatricula(value) {
  return requireText(value, "Matrícula").trim().toLowerCase();
}

function assertStrongPassword(password) {
  const text = String(password ?? "");
  if (text.length < MIN_PASSWORD) throw badRequest(`A senha deve ter ao menos ${MIN_PASSWORD} caracteres`);
  return text;
}

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const matricula = normalizeMatricula(req.body?.matricula);
    const password = String(req.body?.password ?? "");

    const account = await queryOne(
      `SELECT id, password_hash FROM app_users
        WHERE LOWER(TRIM(matricula)) = ? AND status = 'Ativo' LIMIT 1`,
      [matricula],
    );

    const genericFailure = unauthorized("Matrícula ou senha inválida");
    if (!account) throw genericFailure;
    if (!(await bcrypt.compare(password, account.password_hash))) throw genericFailure;

    const context = await loadAuthContext(account.id);
    if (!context) throw forbidden("Cadastro funcional inativo. Procure a Inspetoria.");

    await execute(`UPDATE app_users SET last_login_at = UTC_TIMESTAMP(3) WHERE id = ?`, [context.id]);
    setSessionCookie(res, context.id);
    await audit(context.id, "LOGIN", "app_users", context.id);
    res.json(toSessionUser(context));
  }),
);

authRouter.post(
  "/activate",
  asyncHandler(async (req, res) => {
    const matricula = normalizeMatricula(req.body?.matricula);
    const activationCode = requireText(req.body?.activationCode, "Código de ativação");
    const password = assertStrongPassword(req.body?.password);

    if (!/^[0-9]{8}$/.test(activationCode)) throw badRequest("Código de ativação inválido");

    const userId = await withTransaction(async (connection) => {
      const [employees] = await connection.execute(
        `SELECT id, full_name, matricula, access_profile FROM employees
          WHERE LOWER(TRIM(matricula)) = ? AND status = 'Ativo' LIMIT 1`,
        [matricula],
      );
      const employee = employees[0];
      if (!employee) throw forbidden("Matrícula não autorizada para cadastro");

      const [existing] = await connection.execute(
        `SELECT id FROM app_users WHERE LOWER(TRIM(matricula)) = ? LIMIT 1`,
        [matricula],
      );
      if (existing[0]) throw badRequest("Esta matrícula já possui acesso cadastrado");

      const [tokens] = await connection.execute(
        `SELECT employee_id, code_hash FROM registration_activation_codes
          WHERE employee_id = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP(3)
          FOR UPDATE`,
        [employee.id],
      );
      const token = tokens[0];
      if (!token || !(await bcrypt.compare(activationCode, token.code_hash))) {
        throw badRequest("Código de ativação inválido ou expirado");
      }

      const id = uuid();
      const passwordHash = await bcrypt.hash(password, 12);

      await connection.execute(
        `INSERT INTO app_users (id, matricula, password_hash, status, created_at, updated_at)
         VALUES (?, ?, ?, 'Ativo', UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
        [id, employee.matricula, passwordHash],
      );
      await connection.execute(
        `INSERT INTO profiles (id, matricula, nome, created_at, updated_at)
         VALUES (?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
        [id, employee.matricula, employee.full_name],
      );
      if (employee.access_profile === "Inspetor") {
        await connection.execute(
          `INSERT IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')`,
          [uuid(), id],
        );
      }
      await connection.execute(
        `UPDATE registration_activation_codes SET used_at = UTC_TIMESTAMP(3) WHERE employee_id = ?`,
        [employee.id],
      );
      await audit(id, "ACTIVATE", "app_users", id, { matricula: employee.matricula }, connection);
      return id;
    });

    const context = await loadAuthContext(userId);
    if (!context) throw forbidden("Cadastro funcional inativo");
    setSessionCookie(res, context.id);
    res.status(201).json(toSessionUser(context));
  }),
);

authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json(toSessionUser(req.user));
  }),
);

authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const current = String(req.body?.currentPassword ?? "");
    const next = assertStrongPassword(req.body?.newPassword);

    const account = await queryOne(`SELECT password_hash FROM app_users WHERE id = ?`, [req.user.id]);
    if (!account || !(await bcrypt.compare(current, account.password_hash))) {
      throw badRequest("Senha atual incorreta");
    }

    await execute(`UPDATE app_users SET password_hash = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`, [
      await bcrypt.hash(next, 12),
      req.user.id,
    ]);
    await audit(req.user.id, "PASSWORD_CHANGE", "app_users", req.user.id);
    res.status(204).end();
  }),
);

authRouter.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});
