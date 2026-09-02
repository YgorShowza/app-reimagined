import { randomUUID, randomBytes } from "node:crypto";

export class HttpError extends Error {
  constructor(status, message, code = null, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, code) => new HttpError(400, message, code || "BAD_REQUEST");
export const unauthorized = (message = "Não autenticado") => new HttpError(401, message, "UNAUTHORIZED");
export const forbidden = (message = "Acesso não autorizado") => new HttpError(403, message, "FORBIDDEN");
export const notFound = (message = "Recurso não encontrado") => new HttpError(404, message, "NOT_FOUND");
export const conflict = (message) => new HttpError(409, message, "CONFLICT");

export const uuid = () => randomUUID();

export function numericCode(digits = 8) {
  const max = 10 ** digits;
  const value = Number(BigInt(`0x${randomBytes(6).toString("hex")}`) % BigInt(max));
  return String(value).padStart(digits, "0");
}

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export function nowUtc() {
  return new Date();
}

/** Converte campos JSON do MySQL (que podem vir como string) para valor JS. */
export function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export const asBool = (value) => value === 1 || value === true || value === "1";

export function trimOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

export function requireText(value, label) {
  const text = trimOrNull(value);
  if (!text) throw badRequest(`${label} é obrigatório`);
  return text;
}

export function requireMonth(value, label = "Mês") {
  const text = requireText(value, label);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) throw badRequest(`${label} inválido (use YYYY-MM)`);
  return text;
}

export function optionalDate(value, label) {
  const text = trimOrNull(value);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw badRequest(`${label} inválida (use YYYY-MM-DD)`);
  const date = new Date(`${text}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw badRequest(`${label} inválida`);
  }
  return text;
}

export function requireOneOf(value, allowed, label, fallback = null) {
  const text = trimOrNull(value) ?? fallback;
  if (!text || !allowed.includes(text)) throw badRequest(`${label} inválido`);
  return text;
}

export function normalizeKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function monthOf(dateText) {
  return String(dateText ?? "").slice(0, 7);
}
