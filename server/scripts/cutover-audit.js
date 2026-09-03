import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../src/config.js";
import { pool, query, queryOne } from "../src/db.js";

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

async function scalar(sql, params = []) {
  const row = await queryOne(sql, params);
  return Number(row?.total ?? 0);
}

async function checkIdentity() {
  const employees = await scalar(`SELECT COUNT(*) AS total FROM employees`);
  const activeEmployees = await scalar(`SELECT COUNT(*) AS total FROM employees WHERE status = 'Ativo'`);
  const users = await scalar(`SELECT COUNT(*) AS total FROM app_users`);
  const orphanUsers = await scalar(
    `SELECT COUNT(*) AS total
       FROM app_users u
       LEFT JOIN employees e ON LOWER(TRIM(e.matricula)) = LOWER(TRIM(u.matricula))
      WHERE e.id IS NULL`,
  );
  const missingProfiles = await scalar(
    `SELECT COUNT(*) AS total
       FROM app_users u
       LEFT JOIN profiles p ON p.id = u.id
      WHERE p.id IS NULL`,
  );
  const profileMatriculaMismatch = await scalar(
    `SELECT COUNT(*) AS total
       FROM app_users u
       JOIN profiles p ON p.id = u.id
      WHERE LOWER(TRIM(p.matricula)) <> LOWER(TRIM(u.matricula))`,
  );
  const adminOutsideInspector = await scalar(
    `SELECT COUNT(DISTINCT u.id) AS total
       FROM app_users u
       JOIN user_roles r ON r.user_id = u.id AND r.role = 'admin'
       LEFT JOIN employees e ON LOWER(TRIM(e.matricula)) = LOWER(TRIM(u.matricula))
      WHERE e.id IS NULL OR e.access_profile <> 'Inspetor'`,
  );
  const activeUsersWithInactiveEmployee = await scalar(
    `SELECT COUNT(*) AS total
       FROM app_users u
       JOIN employees e ON LOWER(TRIM(e.matricula)) = LOWER(TRIM(u.matricula))
      WHERE u.status = 'Ativo' AND e.status <> 'Ativo'`,
  );

  if (employees === 0) fail("nenhum colaborador foi migrado");
  if (activeEmployees === 0) fail("não há colaborador ativo no banco migrado");
  if (orphanUsers > 0) fail(`${orphanUsers} conta(s) não possuem colaborador correspondente por matrícula`);
  if (missingProfiles > 0) fail(`${missingProfiles} conta(s) não possuem profile correspondente`);
  if (profileMatriculaMismatch > 0) fail(`${profileMatriculaMismatch} profile(s) possuem matrícula divergente da conta`);
  if (adminOutsideInspector > 0) fail(`${adminOutsideInspector} conta(s) com role admin não pertencem a colaborador Inspetor`);
  if (activeUsersWithInactiveEmployee > 0) warn(`${activeUsersWithInactiveEmployee} conta(s) ativas pertencem a colaborador inativo; o login será bloqueado pela API`);

  console.log(`[cutover] identidade employees=${employees} active_employees=${activeEmployees} users=${users}`);
}

async function checkTrainingQuestionCoverage() {
  const sectors = await query(
    `SELECT DISTINCT sector
       FROM employees
      WHERE status = 'Ativo' AND access_profile <> 'Inspetor'
      ORDER BY sector`,
  );
  if (sectors.length === 0) {
    warn("não há setores operacionais ativos para validar cobertura de treinamento");
    return;
  }

  const difficulties = ["Básico", "Intermediário", "Avançado"];
  for (const row of sectors) {
    const sector = String(row.sector);
    const quick = await scalar(
      `SELECT COUNT(*) AS total
         FROM question_bank
        WHERE active = 1
          AND JSON_LENGTH(options) >= 2
          AND (target_sector = 'Todos' OR target_sector = ?)`,
      [sector],
    );
    const daily = await scalar(
      `SELECT COUNT(*) AS total
         FROM question_bank
        WHERE active = 1
          AND bank_type = 'treinamento_dinamico'
          AND JSON_LENGTH(options) >= 2
          AND (target_sector = 'Todos' OR target_sector = ?)`,
      [sector],
    );
    const stress = await scalar(
      `SELECT COUNT(*) AS total
         FROM question_bank
        WHERE active = 1
          AND bank_type = 'simulacoes'
          AND JSON_LENGTH(options) >= 2
          AND (target_sector = 'Todos' OR target_sector = ?)`,
      [sector],
    );

    if (quick < 5) fail(`setor ${sector}: Teste Rápido exige ao menos 5 questões compatíveis; encontradas ${quick}`);
    if (daily < 3) fail(`setor ${sector}: Desafio Diário exige ao menos 3 questões treinamento_dinamico; encontradas ${daily}`);
    if (stress < 1) fail(`setor ${sector}: não há questões simulacoes para Simulador/Stress Test`);

    for (const difficulty of difficulties) {
      const count = await scalar(
        `SELECT COUNT(*) AS total
           FROM question_bank
          WHERE active = 1
            AND bank_type = 'simulacoes'
            AND difficulty = ?
            AND JSON_LENGTH(options) >= 2
            AND (target_sector = 'Todos' OR target_sector = ?)`,
        [difficulty, sector],
      );
      if (count < 1) fail(`setor ${sector}: Simulador sem cenário ativo na dificuldade ${difficulty}`);
    }

    console.log(`[cutover] questões sector=${sector} quick=${quick} daily=${daily} simulations=${stress}`);
  }
}

async function checkStoredSignatureFiles() {
  const storageRoot = path.resolve(config.storage.path);
  const rows = await query(
    `SELECT id, signature_path
       FROM exam_attempts
      WHERE signature_agreed = 1
        AND signed_at IS NOT NULL
        AND signature_path IS NOT NULL`,
  );

  let missing = 0;
  let invalidPath = 0;
  let invalidPng = 0;
  for (const row of rows) {
    const relativePath = String(row.signature_path || "").trim();
    const absolutePath = path.resolve(storageRoot, relativePath);
    if (!relativePath || !absolutePath.startsWith(`${storageRoot}${path.sep}`)) {
      invalidPath += 1;
      continue;
    }
    try {
      const handle = await fs.open(absolutePath, "r");
      try {
        const header = Buffer.alloc(8);
        const { bytesRead } = await handle.read(header, 0, 8, 0);
        if (bytesRead < 8 || header[0] !== 0x89 || header[1] !== 0x50 || header[2] !== 0x4e || header[3] !== 0x47) {
          invalidPng += 1;
        }
      } finally {
        await handle.close();
      }
    } catch (error) {
      if (error?.code === "ENOENT") missing += 1;
      else throw error;
    }
  }

  if (invalidPath > 0) fail(`${invalidPath} assinatura(s) possuem caminho inválido fora do storage configurado`);
  if (missing > 0) fail(`${missing} arquivo(s) de assinatura registrados no MySQL não existem no storage`);
  if (invalidPng > 0) fail(`${invalidPng} arquivo(s) de assinatura registrados não possuem cabeçalho PNG válido`);
  console.log(`[cutover] evidências assinaturas_registradas=${rows.length}`);
}

async function checkExamEvidence() {
  const malformedCertificates = await scalar(
    `SELECT COUNT(*) AS total
       FROM certificates c
       JOIN exam_attempts a ON a.id = c.attempt_id
      WHERE a.passed <> 1
         OR a.signature_agreed <> 1
         OR a.signed_at IS NULL
         OR a.signature_path IS NULL
         OR c.verification_code <> a.certificate_code`,
  );
  const signedWithoutCertificate = await scalar(
    `SELECT COUNT(*) AS total
       FROM exam_attempts a
       LEFT JOIN certificates c ON c.attempt_id = a.id
      WHERE a.passed = 1
        AND a.signature_agreed = 1
        AND a.signed_at IS NOT NULL
        AND a.signature_path IS NOT NULL
        AND a.certificate_code IS NOT NULL
        AND c.id IS NULL`,
  );
  const malformedRevocation = await scalar(
    `SELECT COUNT(*) AS total
       FROM certificates
      WHERE (revoked = 1 AND revoked_at IS NULL)
         OR (revoked = 0 AND revoked_at IS NOT NULL)`,
  );

  if (malformedCertificates > 0) fail(`${malformedCertificates} certificado(s) divergem da tentativa assinada/aprovada`);
  if (signedWithoutCertificate > 0) fail(`${signedWithoutCertificate} tentativa(s) aprovadas e assinadas estão sem certificado correspondente`);
  if (malformedRevocation > 0) fail(`${malformedRevocation} certificado(s) possuem estado de revogação inconsistente`);
  await checkStoredSignatureFiles();
}

async function checkForeignKeySession() {
  const row = await queryOne(`SELECT @@FOREIGN_KEY_CHECKS AS enabled`);
  if (Number(row?.enabled) !== 1) fail("FOREIGN_KEY_CHECKS está desabilitado na sessão de auditoria");
}

async function main() {
  try {
    await checkForeignKeySession();
    await checkIdentity();
    await checkTrainingQuestionCoverage();
    await checkExamEvidence();

    for (const message of warnings) console.warn(`[cutover][AVISO] ${message}`);
    if (failures.length > 0) {
      for (const message of failures) console.error(`[cutover][FALHA] ${message}`);
      throw new Error(`[cutover] auditoria reprovada com ${failures.length} pendência(s)`);
    }
    console.log(`[cutover] OK — integridade funcional mínima aprovada${warnings.length ? ` com ${warnings.length} aviso(s)` : ""}`);
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
