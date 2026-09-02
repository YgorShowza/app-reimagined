import { Router } from "express";
import { execute, query, queryOne } from "../db.js";
import { audit } from "../audit.js";
import { requireAdmin, requireAuth } from "../session.js";
import {
  asBool,
  asyncHandler,
  badRequest,
  notFound,
  optionalDate,
  parseJson,
  requireMonth,
  requireOneOf,
  requireText,
  trimOrNull,
  uuid,
} from "../util.js";

export const cronogramaRouter = Router();

const STATUSES = ["Pendente", "Realizado", "Justificado"];
const TYPES = ["Planejado", "Realizado"];
const TARGET_SECTORS = ["Todos", "CFTV", "Vigilância", "Portaria", "Ronda", "Administrativo"];
const SUSPENSION_TYPES = ["mes_suspenso", "ausencia_operador"];

function mapEntry(row) {
  return { ...row, question_bank_ids: parseJson(row.question_bank_ids, []) };
}

function mapRecurring(row) {
  return { ...row, active: asBool(row.active) };
}

function readEntryInput(body, { partial = false } = {}) {
  const input = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);
  if (!partial || has("month")) input.month = requireMonth(body?.month);
  if (!partial || has("employee_id")) input.employee_id = requireText(body?.employee_id, "Colaborador");
  if (!partial || has("employee_name")) input.employee_name = requireText(body?.employee_name, "Nome do colaborador");
  if (!partial || has("employee_matricula")) input.employee_matricula = requireText(body?.employee_matricula, "Matrícula");
  if (!partial || has("employee_sector")) input.employee_sector = requireOneOf(body?.employee_sector, TARGET_SECTORS.filter((v) => v !== "Todos"), "Setor");
  if (!partial || has("theme")) input.theme = requireText(body?.theme, "Tema");
  if (!partial || has("exam_id")) input.exam_id = trimOrNull(body?.exam_id);
  if (!partial || has("exam_title")) input.exam_title = trimOrNull(body?.exam_title);
  if (!partial || has("type")) input.type = requireOneOf(body?.type, TYPES, "Tipo", "Planejado");
  if (!partial || has("status")) input.status = requireOneOf(body?.status, STATUSES, "Situação", "Pendente");
  if (!partial || has("justification")) input.justification = trimOrNull(body?.justification);
  if (!partial || has("planned_date")) input.planned_date = optionalDate(body?.planned_date, "Data planejada");
  if (!partial || has("completion_date")) input.completion_date = optionalDate(body?.completion_date, "Data de conclusão");
  if (!partial || has("notes")) input.notes = trimOrNull(body?.notes);
  if (!partial || has("question_bank_ids")) input.question_bank_ids = Array.isArray(body?.question_bank_ids) ? body.question_bank_ids.map(String) : [];
  if (partial && Object.keys(input).length === 0) throw badRequest("Nenhum campo para atualizar");
  return input;
}

function entryVisibilityClause(req) {
  if (req.user.isAdmin) return { sql: "", params: [] };
  return { sql: " AND LOWER(TRIM(employee_matricula)) = LOWER(TRIM(?))", params: [req.user.matricula] };
}

cronogramaRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const month = requireMonth(req.query["month"]);
    const visible = entryVisibilityClause(req);
    const rows = await query(
      `SELECT * FROM cronograma_entries WHERE month = ?${visible.sql}
       ORDER BY planned_date IS NULL, planned_date ASC, employee_name ASC`,
      [month, ...visible.params],
    );
    res.json(rows.map(mapEntry));
  }),
);

cronogramaRouter.get(
  "/year/:year",
  requireAuth,
  asyncHandler(async (req, res) => {
    const year = Number(req.params.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2200) throw badRequest("Ano inválido");
    const visible = entryVisibilityClause(req);
    const rows = await query(
      `SELECT * FROM cronograma_entries WHERE month >= ? AND month <= ?${visible.sql}
       ORDER BY month ASC, employee_name ASC`,
      [`${year}-01`, `${year}-12`, ...visible.params],
    );
    res.json(rows.map(mapEntry));
  }),
);

cronogramaRouter.post(
  "/bulk",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    if (!entries.length) return res.status(204).end();
    if (entries.length > 1000) throw badRequest("Limite de 1000 lançamentos por operação");
    const created = [];
    for (const raw of entries) {
      const input = readEntryInput(raw);
      const id = uuid();
      await execute(
        `INSERT INTO cronograma_entries
         (id, month, employee_id, employee_name, employee_matricula, employee_sector, theme, exam_id, exam_title, type, status,
          justification, planned_date, completion_date, notes, question_bank_ids, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
        [id, input.month, input.employee_id, input.employee_name, input.employee_matricula, input.employee_sector, input.theme,
          input.exam_id, input.exam_title, input.type, input.status, input.justification, input.planned_date, input.completion_date,
          input.notes, JSON.stringify(input.question_bank_ids), req.user.id],
      );
      created.push(id);
    }
    await audit(req.user.id, "BULK_INSERT", "cronograma_entries", created[0] ?? "", { count: created.length });
    res.status(201).json({ ids: created, count: created.length });
  }),
);

cronogramaRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const input = readEntryInput(req.body);
    const id = uuid();
    await execute(
      `INSERT INTO cronograma_entries
       (id, month, employee_id, employee_name, employee_matricula, employee_sector, theme, exam_id, exam_title, type, status,
        justification, planned_date, completion_date, notes, question_bank_ids, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
      [id, input.month, input.employee_id, input.employee_name, input.employee_matricula, input.employee_sector, input.theme,
        input.exam_id, input.exam_title, input.type, input.status, input.justification, input.planned_date, input.completion_date,
        input.notes, JSON.stringify(input.question_bank_ids), req.user.id],
    );
    await audit(req.user.id, "INSERT", "cronograma_entries", id, { month: input.month, employee_id: input.employee_id });
    res.status(201).json({ id });
  }),
);

cronogramaRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await queryOne(`SELECT id FROM cronograma_entries WHERE id = ?`, [req.params.id]);
    if (!existing) throw notFound("Registro do cronograma não encontrado");
    const input = readEntryInput(req.body, { partial: true });
    const fields = Object.keys(input);
    const values = fields.map((field) => field === "question_bank_ids" ? JSON.stringify(input[field]) : input[field]);
    await execute(`UPDATE cronograma_entries SET ${fields.map((f) => `${f} = ?`).join(", ")}, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`, [...values, req.params.id]);
    await audit(req.user.id, "UPDATE", "cronograma_entries", req.params.id, { changed: fields });
    res.status(204).end();
  }),
);

cronogramaRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await queryOne(`SELECT id FROM cronograma_entries WHERE id = ?`, [req.params.id]);
    if (!existing) throw notFound("Registro do cronograma não encontrado");
    await execute(`DELETE FROM cronograma_entries WHERE id = ?`, [req.params.id]);
    await audit(req.user.id, "DELETE", "cronograma_entries", req.params.id);
    res.status(204).end();
  }),
);

cronogramaRouter.post(
  "/sync-exam-attempts",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const month = req.body?.month ? requireMonth(req.body.month) : null;
    const rows = await query(
      `SELECT c.id, c.employee_matricula, c.exam_id
         FROM cronograma_entries c
        WHERE c.exam_id IS NOT NULL AND c.status <> 'Realizado' ${month ? "AND c.month = ?" : ""}`,
      month ? [month] : [],
    );
    let changed = 0;
    for (const row of rows) {
      const attempt = await queryOne(
        `SELECT finished_at FROM exam_attempts
          WHERE exam_id = ? AND LOWER(TRIM(matricula)) = LOWER(TRIM(?)) AND passed = 1
          ORDER BY finished_at DESC LIMIT 1`,
        [row.exam_id, row.employee_matricula],
      );
      if (!attempt) continue;
      const completion = new Date(attempt.finished_at).toISOString().slice(0, 10);
      await execute(
        `UPDATE cronograma_entries SET status = 'Realizado', type = 'Realizado', completion_date = ?, justification = NULL, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`,
        [completion, row.id],
      );
      changed += 1;
    }
    if (changed) await audit(req.user.id, "SYNC_EXAMS", "cronograma_entries", month ?? "all", { changed });
    res.json({ changed });
  }),
);

cronogramaRouter.get(
  "/recurring-models",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const rows = await query(`SELECT * FROM cronograma_recurring_models ORDER BY active DESC, theme ASC`);
    res.json(rows.map(mapRecurring));
  }),
);

cronogramaRouter.post(
  "/recurring-models",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = uuid();
    const theme = requireText(req.body?.theme, "Tema");
    const targetSector = requireOneOf(req.body?.target_sector, TARGET_SECTORS, "Setor alvo");
    const active = req.body?.active === false ? 0 : 1;
    await execute(
      `INSERT INTO cronograma_recurring_models (id, theme, target_sector, recurrence, active, created_by, created_by_name, created_at, updated_at)
       VALUES (?, ?, ?, 'monthly', ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
      [id, theme, targetSector, active, req.user.id, trimOrNull(req.body?.created_by_name)],
    );
    await audit(req.user.id, "INSERT", "cronograma_recurring_models", id, { theme });
    res.status(201).json({ id });
  }),
);

cronogramaRouter.patch(
  "/recurring-models/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const fields = [];
    const values = [];
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "theme")) { fields.push("theme"); values.push(requireText(req.body.theme, "Tema")); }
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "target_sector")) { fields.push("target_sector"); values.push(requireOneOf(req.body.target_sector, TARGET_SECTORS, "Setor alvo")); }
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "active")) { fields.push("active"); values.push(req.body.active ? 1 : 0); }
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "created_by_name")) { fields.push("created_by_name"); values.push(trimOrNull(req.body.created_by_name)); }
    if (!fields.length) throw badRequest("Nenhum campo para atualizar");
    await execute(`UPDATE cronograma_recurring_models SET ${fields.map((f) => `${f} = ?`).join(", ")}, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`, [...values, req.params.id]);
    res.status(204).end();
  }),
);

cronogramaRouter.delete(
  "/recurring-models/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await execute(`DELETE FROM cronograma_recurring_models WHERE id = ?`, [req.params.id]);
    res.status(204).end();
  }),
);

cronogramaRouter.get(
  "/suspensions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const month = requireMonth(req.query["month"]);
    let rows;
    if (req.user.isAdmin) {
      rows = await query(`SELECT * FROM cronograma_suspensions WHERE month = ? ORDER BY type ASC, date_start IS NULL, date_start ASC`, [month]);
    } else {
      rows = await query(
        `SELECT * FROM cronograma_suspensions WHERE month = ? AND (type = 'mes_suspenso' OR LOWER(TRIM(employee_matricula)) = LOWER(TRIM(?))) ORDER BY type ASC, date_start IS NULL, date_start ASC`,
        [month, req.user.matricula],
      );
    }
    res.json(rows);
  }),
);

cronogramaRouter.post(
  "/suspensions",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = uuid();
    const type = requireOneOf(req.body?.type, SUSPENSION_TYPES, "Tipo de suspensão");
    const month = requireMonth(req.body?.month);
    const reason = requireText(req.body?.reason, "Motivo");
    const employeeId = trimOrNull(req.body?.employee_id);
    if (type === "ausencia_operador" && !employeeId) throw badRequest("Colaborador é obrigatório para ausência");
    await execute(
      `INSERT INTO cronograma_suspensions
       (id, type, month, reason, notes, employee_id, employee_name, employee_matricula, date_start, date_end, created_by, created_by_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
      [id, type, month, reason, trimOrNull(req.body?.notes), employeeId, trimOrNull(req.body?.employee_name), trimOrNull(req.body?.employee_matricula),
        optionalDate(req.body?.date_start, "Data inicial"), optionalDate(req.body?.date_end, "Data final"), req.user.id, trimOrNull(req.body?.created_by_name)],
    );
    await audit(req.user.id, "INSERT", "cronograma_suspensions", id, { type, month });
    res.status(201).json({ id });
  }),
);

cronogramaRouter.patch(
  "/suspensions/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const allowed = ["reason", "notes", "employee_id", "employee_name", "employee_matricula", "date_start", "date_end", "created_by_name"];
    const fields = [];
    const values = [];
    for (const field of allowed) {
      if (!Object.prototype.hasOwnProperty.call(req.body ?? {}, field)) continue;
      fields.push(field);
      values.push(field === "date_start" || field === "date_end" ? optionalDate(req.body[field], field === "date_start" ? "Data inicial" : "Data final") : trimOrNull(req.body[field]));
    }
    if (!fields.length) throw badRequest("Nenhum campo para atualizar");
    await execute(`UPDATE cronograma_suspensions SET ${fields.map((f) => `${f} = ?`).join(", ")}, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`, [...values, req.params.id]);
    res.status(204).end();
  }),
);

cronogramaRouter.delete(
  "/suspensions/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await execute(`DELETE FROM cronograma_suspensions WHERE id = ?`, [req.params.id]);
    res.status(204).end();
  }),
);
