import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { config } from "../config.js";
import { query } from "../db.js";
import { requireAdmin } from "../session.js";
import { asBool, asyncHandler, badRequest, notFound } from "../util.js";

export const examEvidenceRouter = Router();

examEvidenceRouter.get(
  "/exam-attempts",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT a.id, a.exam_id, a.user_id, a.matricula, a.score, a.passed, a.certificate_code,
              a.signature_path, a.signature_name, a.signature_agreed, a.signed_at, a.finished_at, a.created_at,
              e.title AS exam_title, e.exam_type,
              COALESCE(emp.full_name, a.signature_name, a.matricula, 'Colaborador') AS employee_name,
              COALESCE(emp.sector, '—') AS employee_sector
         FROM exam_attempts a
         JOIN exams e ON e.id = a.exam_id
         LEFT JOIN employees emp ON LOWER(TRIM(emp.matricula)) = LOWER(TRIM(a.matricula))
        ORDER BY a.finished_at DESC`,
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
    const requested = String(req.query["path"] || "");
    if (!requested || requested.includes("..") || !requested.startsWith("exam-signatures/")) {
      throw badRequest("Caminho de assinatura inválido");
    }

    const storageRoot = path.resolve(config.storage.path);
    const absolutePath = path.resolve(storageRoot, requested);
    if (!absolutePath.startsWith(`${storageRoot}${path.sep}`)) throw badRequest("Caminho de assinatura inválido");

    try {
      const bytes = await fs.readFile(absolutePath);
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
