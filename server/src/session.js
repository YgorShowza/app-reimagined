import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { queryOne, query } from "./db.js";
import { forbidden, unauthorized } from "./util.js";

function sign(payload) {
  return createHmac("sha256", config.session.secret).update(payload).digest("base64url");
}

/** Sessão stateless assinada: payload base64url + HMAC-SHA256. */
export function createSessionToken(userId) {
  const expiresAt = Date.now() + config.session.ttlHours * 3600_000;
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: expiresAt })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = sign(payload);
  const a = Buffer.from(signature ?? "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data?.sub || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function setSessionCookie(res, userId) {
  res.cookie(config.session.cookieName, createSessionToken(userId), {
    httpOnly: true,
    secure: config.session.secure,
    sameSite: config.session.sameSite,
    maxAge: config.session.ttlHours * 3600_000,
    path: "/",
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(config.session.cookieName, {
    httpOnly: true,
    secure: config.session.secure,
    sameSite: config.session.sameSite,
    path: "/",
  });
}

/**
 * Reconstrói o contexto de autorização a cada requisição — equivalente ao que a
 * RLS fazia no banco anterior. Colaborador inativo perde acesso mesmo com
 * cookie de sessão válido.
 */
export async function loadAuthContext(userId) {
  const row = await queryOne(
    `SELECT u.id, u.matricula, p.nome,
            e.id AS employee_id, e.full_name, e.sector, e.access_profile, e.status
       FROM app_users u
       LEFT JOIN profiles p ON p.id = u.id
       LEFT JOIN employees e ON LOWER(TRIM(e.matricula)) = LOWER(TRIM(u.matricula))
      WHERE u.id = ? AND u.disabled_at IS NULL
      LIMIT 1`,
    [userId],
  );
  if (!row) return null;
  if (row.status !== "Ativo") return null;

  const roles = await query(`SELECT role FROM user_roles WHERE user_id = ?`, [userId]);
  const isAdmin = roles.some((entry) => entry.role === "admin");

  return {
    id: row.id,
    matricula: row.matricula,
    nome: row.nome || row.full_name || row.matricula,
    setor: row.sector ?? null,
    employeeId: row.employee_id ?? null,
    accessProfile: row.access_profile ?? null,
    isAdmin,
  };
}

export async function attachUser(req, _res, next) {
  try {
    const session = readSessionToken(req.cookies?.[config.session.cookieName]);
    req.user = session ? await loadAuthContext(session.sub) : null;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(unauthorized());
  if (!req.user.isAdmin) return next(forbidden("Acesso restrito à Inspetoria"));
  next();
}

export function toSessionUser(user) {
  return {
    id: user.id,
    matricula: user.matricula,
    nome: user.nome,
    setor: user.setor,
    isAdmin: user.isAdmin,
  };
}
