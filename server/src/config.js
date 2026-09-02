const required = ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD", "SEGEMPAT_SESSION_SECRET"];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[segempat-api] Variáveis de ambiente obrigatórias ausentes: ${missing.join(", ")}`);
  process.exit(1);
}

export const config = {
  port: Number(process.env["PORT"] || 8787),
  nodeEnv: process.env["NODE_ENV"] || "production",
  db: {
    host: process.env["MYSQL_HOST"],
    port: Number(process.env["MYSQL_PORT"] || 3306),
    database: process.env["MYSQL_DATABASE"],
    user: process.env["MYSQL_USER"],
    password: process.env["MYSQL_PASSWORD"],
    ssl: String(process.env["MYSQL_SSL"] || "false") === "true",
    caPath: process.env["MYSQL_SSL_CA_PATH"] || null,
    poolSize: Number(process.env["MYSQL_POOL_SIZE"] || 10),
  },
  session: {
    secret: process.env["SEGEMPAT_SESSION_SECRET"],
    cookieName: process.env["SEGEMPAT_SESSION_COOKIE"] || "segempat_session",
    ttlHours: Number(process.env["SEGEMPAT_SESSION_TTL_HOURS"] || 12),
    sameSite: process.env["SEGEMPAT_SESSION_SAMESITE"] || "lax",
    secure: String(process.env["SEGEMPAT_SESSION_SECURE"] || "true") === "true",
  },
  storage: {
    driver: process.env["SEGEMPAT_STORAGE_DRIVER"] || "filesystem",
    path: process.env["SEGEMPAT_STORAGE_PATH"] || "./storage",
  },
  // Origens do frontend autorizadas a enviar cookie de sessão.
  allowedOrigins: String(process.env["SEGEMPAT_ALLOWED_ORIGINS"] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  timezone: process.env["SEGEMPAT_TIMEZONE"] || "America/Maceio",
};
