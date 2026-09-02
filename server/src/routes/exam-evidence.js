import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { config } from "../config.js";
import { query, queryOne } from "../db.js";
import { requireAdmin } from "../session.js";
import { asBool, asyncHandler, badRequest, notFound } from "../util.js";

export const examEvidenceRouter = Router();

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
              COALESCE(emp.full_name, a.signature_name, a.matricula, 'Colaborador') AS employee_name,
              COALESCE(emp.sector, '—') AS employee_sector
         FROM exam_attempts a
         JOIN exams e ON e.id = a.exam_id
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
        formally_issued: Boolean(asBool(row.passed) && row.certificate_code && asBool(row.signature_agreed) && row.signature_path && row.signed_at),
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
      `SELECT id, signature_path, signature_agreed, signed_at
         FROM exam_attempts
        WHERE signature_path = ?
        LIMIT 1`,
      [requested],
    );
    if (!evidence || !asBool(evidence.signature_agreed) || !evidence.signed_at) {
      throw notFound("Assinatura não encontrada");
    }

    const storageRoot = path.resolve(config.storage.path);
    const absolutePath = path.resolve(storageRoot, requested);
    if (!absolutePath.startsWith(`${storageRoot}${path.sep}`)) throw badRequest("Caminho de assinatura inválido");

    try {
      const bytes = await fs.readFile(absolutePath);
      if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
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