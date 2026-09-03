import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { config } from "../config.js";
import { query, queryOne } from "../db.js";
import { requireAdmin } from "../session.js";
import { asBool, asyncHandler, badRequest, notFound } from "../util.js";

export const examEvidenceRouter = Router();

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MIN_SIGNATURE_BYTES = 100;
const MAX_SIGNATURE_BYTES = 1_500_000;

examEvidenceRouter.get(
  "/exam-attempts",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const yearRaw = req.query["year"];
    let where = "";
    let params = [];
    if (yearRaw !== undefined) {
      const year = Number(yearRaw);
      if (!Number.isInteger(year) || year < 2000 || year > 2200) throw badRequest("Ano inválido");
      where = "WHERE a.finished_at >= ? AND a.finished_at < ?";
      params = [`${year}-01-01 00:00:00`, `${year + 1}-01-01 00:00:00`];
    }

    const rows = await query(
      `SELECT a.id, a.exam_id, a.user_id, a.matricula, a.score, a.passed, a.certificate_code,
              a.signature_path, a.signature_name, a.signature_agreed, a.signed_at, a.finished_at, a.created_at,
              e.title AS exam_title, e.exam_type,
              c.id AS certificate_id, c.verification_code, c.revoked, c.revoked_at, c.revoked_reason,
              COALESCE(emp.full_name, a.signature_name, a.matricula, 'Colaborador') AS employee_name,
              COALESCE(emp.sector, '—') AS employee_sector
         FROM exam_attempts a
         JOIN exams e ON e.id = a.exam_id
         LEFT JOIN certificates c ON c.attempt_id = a.id
         LEFT JOIN employees emp ON LOWER(TRIM(emp.matricula)) = LOWER(TRIM(a.matricula))
         ${where}
        ORDER BY a.finished_at DESC`,
      params,
    );
    res.json(
      rows.map((row) => ({
        ...row,
        score: Number(row.score ?? 0),
        passed: asBool(row.passed),
        signature_agreed: asBool(row.signature_agreed),
        certificate_revoked: asBool(row.revoked),
        formally_issued: Boolean(
          asBool(row.passed)
          && row.certificate_code
          && asBool(row.signature_agreed)
          && row.signature_path
          && row.signed_at
          && row.certificate_id
          && row.verification_code === row.certificate_code
        ),
      })),
    );
  }),
);

examEvidenceRouter.get(
  "/exam-signatures",
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (config.storage.driver !== "filesystem") throw badRequest("Driver de armazenamento ainda não suportado nesta API");
    const requested = String(req.query["path"] || "").trim();
    if (!requested || requested.includes("..") || !requested.startsWith("exam-signatures/") || !requested.endsWith(".png")) {
      throw badRequest("Caminho de assinatura inválido");
    }

    const evidence = await queryOne(
      `SELECT a.id, a.signature_path, a.signature_agreed, a.signed_at
         FROM exam_attempts a
         JOIN certificates c ON c.attempt_id = a.id
        WHERE a.signature_path = ?
          AND a.passed = 1
          AND a.signature_agreed = 1
          AND a.signed_at IS NOT NULL
          AND a.certificate_code IS NOT NULL
          AND c.verification_code = a.certificate_code
        LIMIT 1`,
      [requested],
    );
    if (!evidence || !asBool(evidence.signature_agreed) || !evidence.signed_at) {
      throw notFound("Assinatura não encontrada");
    }

    const storageRoot = path.resolve(config.storage.path);
    const candidatePath = path.resolve(storageRoot, requested);
    if (!candidatePath.startsWith(`${storageRoot}${path.sep}`)) throw badRequest("Caminho de assinatura inválido");

    try {
      const [storageRootReal, absolutePath] = await Promise.all([
        fs.realpath(storageRoot),
        fs.realpath(candidatePath),
      ]);
      if (!absolutePath.startsWith(`${storageRootReal}${path.sep}`)) throw badRequest("Caminho de assinatura inválido");

      const stat = await fs.stat(absolutePath);
      if (!stat.isFile() || stat.size < MIN_SIGNATURE_BYTES || stat.size > MAX_SIGNATURE_BYTES) {
        throw notFound("Assinatura não encontrada");
      }

      const bytes = await fs.readFile(absolutePath);
      if (bytes.length < PNG_SIGNATURE.length || !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
        throw notFound("Assinatura não encontrada");
      }
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.setHeader("Content-Disposition", "inline; filename=assinatura.png");
      res.send(bytes);
    } catch (error) {
      if (error?.code === "ENOENT") throw notFound("Assinatura não encontrada");
      throw error;
    }
  }),
);