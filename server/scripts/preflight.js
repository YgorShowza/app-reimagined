import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "../src/config.js";
import { pool, query, queryOne } from "../src/db.js";

function fail(message) {
  throw new Error(`[preflight] ${message}`);
}

function parseMajor(version) {
  const match = String(version ?? "").match(/^(\d+)\./);
  return match ? Number(match[1]) : null;
}

async function checkDatabase() {
  const info = await queryOne(
    `SELECT VERSION() AS version,
            DATABASE() AS database_name,
            @@hostname AS server_hostname,
            @@port AS server_port`,
  );
  if (!info) fail("MySQL não retornou informações da conexão");

  const major = parseMajor(info.version);
  if (major === null || major < 8) fail(`MySQL 8+ obrigatório; detectado: ${info.version || "desconhecido"}`);
  if (String(info.database_name || "") !== String(config.db.database)) {
    fail(`database selecionado (${info.database_name || "nenhum"}) difere de MYSQL_DATABASE (${config.db.database})`);
  }

  const sslRows = await query("SHOW STATUS LIKE 'Ssl_cipher'");
  const sslCipher = String(sslRows?.[0]?.Value ?? sslRows?.[0]?.value ?? "").trim();
  if (config.db.ssl && !sslCipher) fail("MYSQL_SSL=true, mas a conexão MySQL não negociou TLS");

  return {
    version: String(info.version),
    database: String(info.database_name),
    server: `${info.server_hostname}:${info.server_port}`,
    tls: sslCipher ? `on (${sslCipher})` : "off",
  };
}

async function checkStorage() {
  const root = path.resolve(config.storage.path);
  const stat = await fs.stat(root);
  if (!stat.isDirectory()) fail(`SEGEMPAT_STORAGE_PATH não é diretório: ${root}`);

  const token = crypto.randomBytes(16).toString("hex");
  const probePath = path.join(root, `.segempat-preflight-${process.pid}-${Date.now()}`);
  try {
    await fs.writeFile(probePath, token, { encoding: "utf8", mode: 0o600, flag: "wx" });
    const readBack = await fs.readFile(probePath, "utf8");
    if (readBack !== token) fail("storage escreveu conteúdo diferente do esperado");
  } finally {
    await fs.unlink(probePath).catch(() => {});
  }
  return root;
}

async function main() {
  try {
    const database = await checkDatabase();
    const storage = await checkStorage();
    console.log("[preflight] OK");
    console.log(`[preflight] node_env=${config.nodeEnv}`);
    console.log(`[preflight] mysql=${database.version} database=${database.database} server=${database.server} tls=${database.tls}`);
    console.log(`[preflight] storage=${storage}`);
    console.log(`[preflight] cors_origins=${config.allowedOrigins.length}`);
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
