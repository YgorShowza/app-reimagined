const required = ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD", "SEGEMPAT_SESSION_SECRET"];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[segempat-api] Variáveis de ambiente obrigatórias ausentes: ${missing.join(", ")}`);
  process.exit(1);
}

function positiveInteger(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < min || value > max) {
    console.error(`[segempat-api] ${name} inválido: esperado inteiro entre ${min} e ${max}`);
    process.exit(1);
  }
  return value;
}

function sameSiteValue() {
  const value = String(process.env["SEGEMPAT_SESSION_SAMESITE"] || "lax").trim().toLowerCase();
  if (!["lax", "strict", "none"].includes(value)) {
    console.error("[segempat-api] SEGEMPAT_SESSION_SAMESITE deve ser lax, strict ou none");
    process.exit(1);
  }
  return value;
}

function allowedOrigins() {
  const origins = String(process.env["SEGEMPAT_ALLOWED_ORIGINS"] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  for (const origin of origins) {
    if (origin === "*") {
      console.error("[segempat-api] SEGEMPAT_ALLOWED_ORIGINS não pode usar * quando cookies de sessão estão habilitados");
      process.exit(1);
    }
    try {
      const parsed = new URL(origin);
      if (!/^https?:$/.test(parsed.protocol) || parsed.origin !== origin.replace(/\/$/, "")) throw new Error("invalid origin");
    } catch {
      console.error(`[segempat-api] Origem CORS inválida: ${origin}`);
      process.exit(1);
    }
  }
  return origins.map((origin) => origin.replace(/\/$/, ""));
}

const secureSession = String(process.env["SEGEMPAT_SESSION_SECURE"] || "true") === "true";
const sessionSameSite = sameSiteValue();
if (sessionSameSite === "none" && !secureSession) {
  console.error("[segempat-api] SameSite=None exige SEGEMPAT_SESSION_SECURE=true");
  process.exit(1);
}

export const config = {
  port: positiveInteger("PORT", 8787, { min: 1, max: 65535 }),
  nodeEnv: process.env["NODE_ENV"] || "production",
  db: {
    host: process.env["MYSQL_HOST"],
    port: positiveInteger("MYSQL_PORT", 3306, { min: 1, max: 65535 }),
    database: process.env["MYSQL_DATABASE"],
    user: process.env["MYSQL_USER"],
    password: process.env["MYSQL_PASSWORD"],
    ssl: String(process.env["MYSQL_SSL"] || "false") === "true",
    caPath: process.env["MYSQL_SSL_CA_PATH"] || null,
    poolSize: positiveInteger("MYSQL_POOL_SIZE", 10, { min: 1, max: 100 }),
  },
  session: {
    secret: process.env["SEGEMPAT_SESSION_SECRET"],
    cookieName: process.env["SEGEMPAT_SESSION_COOKIE"] || "segempat_session",
    ttlHours: positiveInteger("SEGEMPAT_SESSION_TTL_HOURS", 12, { min: 1, max: 720 }),
    sameSite: sessionSameSite,
    secure: secureSession,
  },
  storage: {
    driver: process.env["SEGEMPAT_STORAGE_DRIVER"] || "filesystem",
    path: process.env["SEGEMPAT_STORAGE_PATH"] || "./storage",
  },
  // Origens do frontend autorizadas a enviar cookie de sessão.
  allowedOrigins: allowedOrigins(),
  timezone: process.env["SEGEMPAT_TIMEZONE"] || "America/Maceio",
};
