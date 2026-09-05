import { Router } from "express";
import bcrypt from "bcryptjs";
import { queryOne, withTransaction } from "../db.js";
import { audit } from "../audit.js";
import { clearSessionCookie, loadAuthContext, requireAuth, setSessionCookie, toSessionUser } from "../session.js";
import { HttpError, asyncHandler, badRequest, forbidden, requireText, unauthorized, uuid } from "../util.js";

export const authRouter = Router();

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;
const MAX_MATRICULA = 80;
const AUTH_WINDOW_MS = 15 * 60_000;
const AUTH_BUCKET_LIMIT = 5_000;
const authAttempts = new Map();
let lastAuthSweepAt = 0;

function normalizeMatricula(value) {
  const matricula = requireText(value, "Matrícula").trim().toLowerCase();
  if (matricula.length > MAX_MATRICULA) throw badRequest("Matrícula inválida");
  return matricula;
}

function passwordText(value, label = "Senha") {
  const text = String(value ?? "");
  if (text.length > MAX_PASSWORD) throw badRequest(`${label} excede o limite permitido`);
  return text;
}

function assertStrongPassword(password) {
  const text = passwordText(password, "Senha");
  if (text.length < MIN_PASSWORD) throw badRequest(`A senha deve ter ao menos ${MIN_PASSWORD} caracteres`);
  return text;
}

function sweepAuthAttempts(now) {
  if (now - lastAuthSweepAt < 60_000 && authAttempts.size < AUTH_BUCKET_LIMIT) return;
  lastAuthSweepAt = now;
  for (const [key, bucket] of authAttempts) {
    if (bucket.resetAt <= now) authAttempts.delete(key);
  }
  while (authAttempts.size > AUTH_BUCKET_LIMIT) {
    const firstKey = authAttempts.keys().next().value;
    if (!firstKey) break;
    authAttempts.delete(firstKey);
  }
}

function authAttemptKey(req, action, matricula) {
  const ip = String(req.ip || req.socket?.remoteAddress || "unknown").slice(0, 120);
  return `${action}:${ip}:${matricula}`;
}

function consumeAuthAttempt(req, action, matricula, maxAttempts) {
  const now = Date.now();
  sweepAuthAttempts(now);
  const key = authAttemptKey(req, action, matricula);
  const current = authAttempts.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + AUTH_WINDOW_MS }
    : current;

  bucket.count += 1;
  authAttempts.set(key, bucket);
  if (bucket.count > maxAttempts) {
    throw new HttpError(429, "Muitas tentativas. Aguarde alguns minutos e tente novamente.", "RATE_LIMITED");
  }
  return key;
}

function clearAuthAttempts(key) {
  if (key) authAttempts.delete(key);
}

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const matricula = normalizeMatricula(req.body?.matricula);
    const password = passwordText(req.body?.password);
    const rateKey = consumeAuthAttempt(req, "login", matricula, 12);

    const account = await queryOne(
      `SELECT id, password_hash FROM app_users
        WHERE LOWER(TRIM(matricula)) = ? AND status = 'Ativo' LIMIT 1`,
      [matricula],
    );

    const genericFailure = unauthorized("Matrícula ou senha inválida");
    if (!account) {
      // Mantém custo criptográfico semelhante ao caminho de uma matrícula existente,
      // reduzindo o sinal de enumeração de contas por tempo de resposta.
      await bcrypt.hash(password || "segempat-invalid-login", 12);
      throw genericFailure;
    }
    if (!(await bcrypt.compare(password, account.password_hash))) throw genericFailure;

    const context = await loadAuthContext(account.id);
    if (!context) throw forbidden("Cadastro funcional inativo. Procure a Inspetoria.");

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT id FROM app_users WHERE id = ? AND status = 'Ativo' LIMIT 1 FOR UPDATE`,
        [context.id],
      );
      if (!rows[0]) throw forbidden("Conta de acesso inativa");

      await connection.execute(`UPDATE app_users SET last_login_at = UTC_TIMESTAMP(3) WHERE id = ?`, [context.id]);
      await audit(context.id, "LOGIN", "app_users", context.id, { atomic: true }, connection);
    });

    clearAuthAttempts(rateKey);
    setSessionCookie(res, context);
    res.json(toSessionUser(context));
  }),
);

authRouter.post(
  "/activate",
  asyncHandler(async (req, res) => {
    const matricula = normalizeMatricula(req.body?.matricula);
    const activationCode = requireText(req.body?.activationCode, "Código de ativação");
    const password = assertStrongPassword(req.body?.password);
    const rateKey = consumeAuthAttempt(req, "activate", matricula, 8);

    if (!/^[0-9]{8}$/.test(activationCode)) throw badRequest("Código de ativação inválido");

    const userId = await withTransaction(async (connection) => {
      const [employees] = await connection.execute(
        `SELECT id, full_name, matricula, access_profile FROM employees
          WHERE LOWER(TRIM(matricula)) = ? AND status = 'Ativo' LIMIT 1 FOR UPDATE`,
        [matricula],
      );
      const employee = employees[0];
      if (!employee) throw forbidden("Matrícula não autorizada para cadastro");

      const [existing] = await connection.execute(
        `SELECT id FROM app_users WHERE LOWER(TRIM(matricula)) = ? LIMIT 1 FOR UPDATE`,
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
      await audit(id, "ACTIVATE", "app_users", id, { matricula: employee.matricula, atomic: true }, connection);
      return id;
    });

    const context = await loadAuthContext(userId);
    if (!context) throw forbidden("Cadastro funcional inativo");
    clearAuthAttempts(rateKey);
    setSessionCookie(res, context);
    res.status(201).json(toSessionUser(context));
  }),
);

authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.json(toSessionUser(req.user));
  }),
);

authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const current = passwordText(req.body?.currentPassword, "Senha atual");
    const next = assertStrongPassword(req.body?.newPassword);
    const nextHash = await bcrypt.hash(next, 12);

    await withTransaction(async (connection) => {
      const [accounts] = await connection.execute(
        `SELECT password_hash FROM app_users WHERE id = ? AND status = 'Ativo' LIMIT 1 FOR UPDATE`,
        [req.user.id],
      );
      const account = accounts[0];
      if (!account || !(await bcrypt.compare(current, account.password_hash))) {
        throw badRequest("Senha atual incorreta");
      }
      if (await bcrypt.compare(next, account.password_hash)) {
        throw badRequest("A nova senha deve ser diferente da senha atual");
      }

      await connection.execute(
        `UPDATE app_users SET password_hash = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`,
        [nextHash, req.user.id],
      );
      await audit(req.user.id, "PASSWORD_CHANGE", "app_users", req.user.id, { atomic: true, sessions_rotated: true }, connection);
    });

    const refreshed = await loadAuthContext(req.user.id);
    if (!refreshed) throw unauthorized();
    setSessionCookie(res, refreshed);
    res.status(204).end();
  }),
);

authRouter.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});
