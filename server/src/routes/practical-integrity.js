import { Router } from "express";
import { withTransaction } from "../db.js";
import { audit } from "../audit.js";
import { config } from "../config.js";
import { requireAdmin } from "../session.js";
import {
  asyncHandler,
  badRequest,
  conflict,
  notFound,
  parseJson,
  requireBoolean,
  requireOneOf,
  requireText,
  trimOrNull,
  uuid,
} from "../util.js";

export const practicalIntegrityRouter = Router();

const PRACTICAL_STATUS = ["Planejada", "Em andamento", "Concluída"];
const MARKER_PREFIX = "[PRACTICAL:";

function operationalDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function mysqlDateOrNull(value, label) {
  const text = trimOrNull(value);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw badRequest(`${label} inválida`);
  const date = new Date(`${text}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) throw badRequest(`${label} inválida`);
  return text;
}

function finiteNumber(value, label, { min = 0, max = 100 } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw badRequest(`${label} inválido`);
  return number;
}

function normalizeChecklist(value) {
  if (!Array.isArray(value)) throw badRequest("Checklist inválido");
  if (value.length > 100) throw badRequest("Checklist excede o limite permitido");
  return value.map((item, index) => ({
    id: String(item?.id ?? index + 1).slice(0, 80),
    label: requireText(item?.label, `Item ${index + 1} do checklist`).slice(0, 500),
    done: requireBoolean(item?.done ?? false, `Situação do item ${index + 1}`),
  }));
}

function marker(id) {
  return `${MARKER_PREFIX}${id}]`;
}

function appendMarker(notes, id) {
  const token = marker(id);
  const current = String(notes ?? "").trim();
  if (current.includes(token)) return current || token;
  return current ? `${current}\n${token}` : token;
}

function monthFromDate(value) {
  return value ? String(value).slice(0, 7) : null;
}

async function lockOperationalEmployee(connection, employeeId) {
  const [rows] = await connection.execute(
    `SELECT id,full_name,matricula,sector,status,access_profile
       FROM employees
      WHERE id = ?
      LIMIT 1
      FOR UPDATE`,
    [employeeId],
  );
  const employee = rows[0];
  if (!employee) throw notFound("Colaborador não encontrado");
  if (employee.status !== "Ativo") throw badRequest("A avaliação só pode ser planejada para colaborador ativo");
  if (employee.access_profile === "Inspetor") throw badRequest("Avaliação prática operacional não pode ser criada para Inspetor");
  return employee;
}

async function findCronogramaEntry(connection, evaluation, { lock = true } = {}) {
  const token = marker(evaluation.id);
  const lockSql = lock ? " FOR UPDATE" : "";
  const [marked] = await connection.execute(
    `SELECT *
       FROM cronograma_entries
      WHERE employee_id = ?
        AND notes LIKE ?
      ORDER BY created_at ASC
      LIMIT 1${lockSql}`,
    [evaluation.employee_id, `%${token}%`],
  );
  if (marked[0]) return marked[0];

  const month = monthFromDate(evaluation.evaluation_date);
  if (!month) return null;
  const [exact] = await connection.execute(
    `SELECT *
       FROM cronograma_entries
      WHERE employee_id = ?
        AND month = ?
        AND LOWER(TRIM(theme)) = LOWER(TRIM(?))
        AND exam_id IS NULL
      ORDER BY CASE status WHEN 'Pendente' THEN 0 WHEN 'Justificado' THEN 1 ELSE 2 END, created_at ASC
      LIMIT 1${lockSql}`,
    [evaluation.employee_id, month, evaluation.title],
  );
  return exact[0] ?? null;
}

async function ensureCronogramaPlan(connection, evaluation, actorId) {
  if (!evaluation.evaluation_date) return { action: "none", entryId: null };
  const month = monthFromDate(evaluation.evaluation_date);
  const existing = await findCronogramaEntry(connection, evaluation);
  const notes = appendMarker(existing?.notes, evaluation.id);

  if (existing) {
    if (existing.status === "Pendente") {
      await connection.execute(
        `UPDATE cronograma_entries
            SET month = ?, theme = ?, planned_date = ?, notes = ?, updated_at = UTC_TIMESTAMP(3)
          WHERE id = ?`,
        [month, evaluation.title, evaluation.evaluation_date, notes, existing.id],
      );
      return { action: "linked", entryId: existing.id };
    }
    // Histórico formal não é reaproveitado para uma nova avaliação.
    if (String(existing.notes ?? "").includes(marker(evaluation.id))) {
      throw conflict("A avaliação está vinculada a um lançamento de Cronograma já formalizado. Planeje uma nova avaliação para continuar.");
    }
  }

  const id = uuid();
  await connection.execute(
    `INSERT INTO cronograma_entries
     (id, month, employee_id, employee_name, employee_matricula, employee_sector, theme,
      exam_id, exam_title, type, status, justification, planned_date, completion_date, notes,
      question_bank_ids, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'Planejado', 'Pendente', NULL, ?, NULL, ?, JSON_ARRAY(), ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
    [id, month, evaluation.employee_id, evaluation.employee_name, evaluation.employee_matricula, evaluation.employee_sector,
      evaluation.title, evaluation.evaluation_date, appendMarker(null, evaluation.id), actorId],
  );
  return { action: "created", entryId: id };
}

async function completeCronograma(connection, evaluation, actorId) {
  const checklist = parseJson(evaluation.checklist, []);
  if (checklist.length > 0 && checklist.some((item) => !item?.done)) {
    throw badRequest("Conclua todos os itens do checklist antes de finalizar a avaliação prática");
  }

  const completionDate = evaluation.evaluation_date || operationalDate();
  const existing = await findCronogramaEntry(connection, evaluation);

  if (existing?.status === "Justificado") {
    throw conflict("O lançamento vinculado está justificado. Planeje uma nova avaliação prática em vez de sobrescrever esse histórico.");
  }

  if (existing) {
    const notes = appendMarker(existing.notes, evaluation.id);
    await connection.execute(
      `UPDATE cronograma_entries
          SET status = 'Realizado', type = 'Realizado', completion_date = ?, justification = NULL,
              theme = ?, notes = ?, updated_at = UTC_TIMESTAMP(3)
        WHERE id = ?`,
      [completionDate, evaluation.title, notes, existing.id],
    );
    return { action: existing.status === "Realizado" ? "already-complete" : "completed", entryId: existing.id };
  }

  const month = monthFromDate(evaluation.evaluation_date) || completionDate.slice(0, 7);
  const id = uuid();
  await connection.execute(
    `INSERT INTO cronograma_entries
     (id, month, employee_id, employee_name, employee_matricula, employee_sector, theme,
      exam_id, exam_title, type, status, justification, planned_date, completion_date, notes,
      question_bank_ids, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'Realizado', 'Realizado', NULL, ?, ?, ?, JSON_ARRAY(), ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
    [id, month, evaluation.employee_id, evaluation.employee_name, evaluation.employee_matricula, evaluation.employee_sector,
      evaluation.title, evaluation.evaluation_date, completionDate, appendMarker(null, evaluation.id), actorId],
  );
  return { action: "created-complete", entryId: id };
}

practicalIntegrityRouter.post(
  "/practical-evaluations",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const employeeId = requireText(req.body?.employee_id, "Colaborador");
    const title = requireText(req.body?.title, "Título").slice(0, 255);
    const evaluationDate = mysqlDateOrNull(req.body?.evaluation_date, "Data da avaliação");
    const checklist = normalizeChecklist(req.body?.checklist ?? []);
    const id = uuid();

    const result = await withTransaction(async (connection) => {
      const employee = await lockOperationalEmployee(connection, employeeId);
      const evaluation = {
        id,
        employee_id: employee.id,
        employee_name: employee.full_name,
        employee_matricula: employee.matricula,
        employee_sector: employee.sector,
        title,
        evaluation_date: evaluationDate,
        checklist,
      };

      await connection.execute(
        `INSERT INTO practical_evaluations
         (id,employee_id,employee_name,employee_matricula,employee_sector,title,evaluator_id,evaluator_name,status,score,max_score,checklist,notes,evaluation_date,completed_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?, 'Planejada',0,10,?,?,?,NULL,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))`,
        [id,employee.id,employee.full_name,employee.matricula,employee.sector,title,req.user.id,req.user.nome,
          JSON.stringify(checklist),trimOrNull(req.body?.notes),evaluationDate],
      );

      const cronograma = await ensureCronogramaPlan(connection, evaluation, req.user.id);
      await audit(req.user.id, "INSERT", "practical_evaluations", id, {
        employee_id: employee.id,
        title,
        identity_derived_server_side: true,
        cronograma_synchronized: cronograma.action,
        cronograma_entry_id: cronograma.entryId,
        atomic: true,
      }, connection);
      return cronograma;
    });

    res.status(201).json({ id, cronograma: result });
  }),
);

practicalIntegrityRouter.patch(
  "/practical-evaluations/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await withTransaction(async (connection) => {
      const [rows] = await connection.execute(`SELECT * FROM practical_evaluations WHERE id = ? LIMIT 1 FOR UPDATE`, [req.params.id]);
      const current = rows[0];
      if (!current) throw notFound("Avaliação não encontrada");

      const patch = {};
      const has = (key) => Object.prototype.hasOwnProperty.call(req.body ?? {}, key);
      if (has("title")) patch.title = requireText(req.body.title, "Título").slice(0, 255);
      if (has("status")) patch.status = requireOneOf(req.body.status, PRACTICAL_STATUS, "Situação");
      if (has("score")) patch.score = finiteNumber(req.body.score, "Nota", { min: 0, max: 100 });
      if (has("max_score")) patch.max_score = finiteNumber(req.body.max_score, "Nota máxima", { min: 0.01, max: 100 });
      if (has("checklist")) patch.checklist = JSON.stringify(normalizeChecklist(req.body.checklist));
      if (has("notes")) patch.notes = trimOrNull(req.body.notes);
      if (has("evaluation_date")) patch.evaluation_date = mysqlDateOrNull(req.body.evaluation_date, "Data da avaliação");
      if (!Object.keys(patch).length) throw badRequest("Nenhum campo para atualizar");

      if (current.status === "Concluída" && patch.status && patch.status !== "Concluída") {
        throw conflict("Avaliação prática concluída pertence ao histórico e não pode ser reaberta");
      }

      const effectiveMax = Number(patch.max_score ?? current.max_score ?? 10);
      const effectiveScore = Number(patch.score ?? current.score ?? 0);
      if (effectiveScore > effectiveMax) throw badRequest("A nota não pode ser maior que a nota máxima");

      const effectiveStatus = patch.status ?? current.status;
      const effectiveChecklistRaw = Object.prototype.hasOwnProperty.call(patch, "checklist") ? patch.checklist : current.checklist;
      const effectiveChecklist = parseJson(effectiveChecklistRaw, []);
      if (effectiveStatus === "Concluída") {
        if (effectiveChecklist.length > 0 && effectiveChecklist.some((item) => !item?.done)) {
          throw badRequest("Conclua todos os itens do checklist antes de finalizar a avaliação prática");
        }
        patch.completed_at = current.completed_at || new Date();
      }
      patch.evaluator_id = req.user.id;
      patch.evaluator_name = req.user.nome;

      const fields = Object.keys(patch);
      await connection.execute(
        `UPDATE practical_evaluations SET ${fields.map((field) => `${field} = ?`).join(", ")}, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`,
        [...fields.map((field) => patch[field]), current.id],
      );

      const evaluation = {
        ...current,
        ...patch,
        checklist: effectiveChecklist,
        title: patch.title ?? current.title,
        evaluation_date: Object.prototype.hasOwnProperty.call(patch, "evaluation_date") ? patch.evaluation_date : current.evaluation_date,
      };
      const cronograma = effectiveStatus === "Concluída"
        ? await completeCronograma(connection, evaluation, req.user.id)
        : await ensureCronogramaPlan(connection, evaluation, req.user.id);

      await audit(req.user.id, "UPDATE", "practical_evaluations", current.id, {
        changed: fields,
        evaluator_derived_server_side: true,
        completed_history_guard: true,
        checklist_completion_guard: effectiveStatus === "Concluída",
        cronograma_synchronized: cronograma.action,
        cronograma_entry_id: cronograma.entryId,
        atomic: true,
      }, connection);
      return cronograma;
    });

    res.json({ ok: true, cronograma: result });
  }),
);

practicalIntegrityRouter.delete(
  "/practical-evaluations/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(`SELECT * FROM practical_evaluations WHERE id = ? LIMIT 1 FOR UPDATE`, [req.params.id]);
      const current = rows[0];
      if (!current) throw notFound("Avaliação não encontrada");
      if (current.status === "Concluída") {
        throw conflict("Avaliação prática concluída pertence ao histórico operacional e não pode ser excluída");
      }

      const cronograma = await findCronogramaEntry(connection, current);
      if (cronograma && cronograma.status === "Pendente" && String(cronograma.notes ?? "").includes(marker(current.id))) {
        await connection.execute(`DELETE FROM cronograma_entries WHERE id = ?`, [cronograma.id]);
      }
      await connection.execute(`DELETE FROM practical_evaluations WHERE id = ?`, [current.id]);
      await audit(req.user.id, "DELETE", "practical_evaluations", current.id, {
        cronograma_pending_removed: Boolean(cronograma && cronograma.status === "Pendente" && String(cronograma.notes ?? "").includes(marker(current.id))),
        history_guard: true,
        atomic: true,
      }, connection);
    });

    res.status(204).end();
  }),
);
