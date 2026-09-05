import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { queryOne, query } from "./db.js";
import { forbidden, unauthorized } from "./util.js";

const MAX_SESSION_TOKEN_LENGTH = 2048;

function sign(payload) {
  return createHmac("sha256", config.session.secret).update(payload).digest("base64url");
}

/** Sessão stateless assinada: payload base64url + HMAC-SHA256. */
export function createSessionToken(user) {
  const expiresAt = Date.now() + config.session.ttlHours * 3600_000;
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    exp: expiresAt,
    ver: user.sessionVersion,
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token) {
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_SESSION_TOKEN_LENGTH) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data?.sub || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    if (!Number.isFinite(data.ver)) return null;
    return data;
  } catch {
    return null;
  }
}

export function setSessionCookie(res, user) {
  res.cookie(config.session.cookieName, createSessionToken(user), {
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
 * Reconstrói o contexto de autorização a cada requisição. Conta e colaborador
 * precisam permanecer ativos mesmo quando o cookie de sessão ainda é válido.
 */
export async function loadAuthContext(userId) {
  const row = await queryOne(
    `SELECT u.id, u.matricula, u.status AS account_status, u.updated_at AS account_updated_at, p.nome,
            e.id AS employee_id, e.full_name, e.sector, e.access_profile,
            e.status AS employee_status
       FROM app_users u
       LEFT JOIN profiles p ON p.id = u.id
       LEFT JOIN employees e ON LOWER(TRIM(e.matricula)) = LOWER(TRIM(u.matricula))
      WHERE u.id = ?
      LIMIT 1`,
    [userId],
  );
  if (!row) return null;
  if (row.account_status !== "Ativo" || row.employee_status !== "Ativo") return null;

  const roles = await query(`SELECT role FROM user_roles WHERE user_id = ?`, [userId]);
  const hasAdminRole = roles.some((entry) => entry.role === "admin");
  const isAdmin = hasAdminRole && row.access_profile === "Inspetor";
  const sessionVersion = new Date(row.account_updated_at).getTime();
  if (!Number.isFinite(sessionVersion)) return null;

  return {
    id: row.id,
    matricula: row.matricula,
    nome: row.nome || row.full_name || row.matricula,
    setor: row.sector ?? null,
    employeeId: row.employee_id ?? null,
    accessProfile: row.access_profile ?? null,
    isAdmin,
    sessionVersion,
  };
}

export async function attachUser(req, _res, next) {
  try {
    const session = readSessionToken(req.cookies?.[config.session.cookieName]);
    if (!session) {
      req.user = null;
      return next();
    }

    const user = await loadAuthContext(session.sub);
    req.user = user && user.sessionVersion === session.ver ? user : null;
    return next();
  } catch (error) {
    return next(error);
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
