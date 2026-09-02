import { Router } from "express";
import { execute, query, queryOne, withTransaction } from "../db.js";
import { audit } from "../audit.js";
import { requireAdmin, requireAuth } from "../session.js";
import { asBool, asyncHandler, badRequest, conflict, notFound, parseJson, requireOneOf, requireText, trimOrNull, uuid } from "../util.js";

export const trainingRouter = Router();
export const adminTrainingRouter = Router();
export const myTrainingRouter = Router();

const MODULE_STATUS = ["Ativo", "Inativo"];
const TARGET_SECTORS = ["Todos", "CFTV", "Vigilância", "Portaria", "Ronda", "Administrativo"];
const ACTIVITY_TYPES = ["Simulador", "Stress Test", "Desafio Diário", "Teste Rápido"];
const CYCLE_STATUS = ["Em dia", "Próximo ao vencimento", "Vencido"];
const SIMULATOR_DIFFICULTIES = ["Básico", "Intermediário", "Avançado"];

function mapModule(row) {
  return { ...row, display_order: Number(row.display_order), min_score: Number(row.min_score) };
}

function mapSchedule(row) {
  return { ...row, cycle_days: Number(row.cycle_days) };
}

function mapAttempt(row) {
  return {
    ...row,
    answers: parseJson(row.answers, []),
    score: Number(row.score ?? 0),
    max_score: Number(row.max_score ?? 10),
    passed: asBool(row.passed),
    points_earned: Number(row.points_earned ?? 0),
  };
}

function readModuleInput(body, { partial = false } = {}) {
  const input = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);
  if (!partial || has("title")) input.title = requireText(body?.title, "Título");
  if (!partial || has("description")) input.description = requireText(body?.description, "Descrição");
  if (!partial || has("content")) input.content = trimOrNull(body?.content);
  if (!partial || has("display_order")) {
    const value = Number(body?.display_order ?? 1);
    if (!Number.isInteger(value) || value < 1 || value > 9999) throw badRequest("Ordem de exibição inválida");
    input.display_order = value;
  }
  if (!partial || has("min_score")) {
    const value = Number(body?.min_score ?? 7);
    if (!Number.isFinite(value) || value < 0 || value > 10) throw badRequest("Nota mínima inválida");
    input.min_score = value;
  }
  if (!partial || has("target_sector")) input.target_sector = requireOneOf(body?.target_sector, TARGET_SECTORS, "Setor alvo", "Todos");
  if (!partial || has("status")) input.status = requireOneOf(body?.status, MODULE_STATUS, "Situação", "Ativo");
  if (partial && Object.keys(input).length === 0) throw badRequest("Nenhum campo para atualizar");
  return input;
}

function readScheduleInput(body, { partial = false } = {}) {
  const input = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);
  if (!partial || has("employee_id")) input.employee_id = requireText(body?.employee_id, "Colaborador");
  if (!partial || has("employee_name")) input.employee_name = requireText(body?.employee_name, "Nome do colaborador");
  if (!partial || has("employee_matricula")) input.employee_matricula = requireText(body?.employee_matricula, "Matrícula");
  if (!partial || has("cycle_days")) {
    const value = Number(body?.cycle_days ?? 90);
    if (!Number.isInteger(value) || value < 1 || value > 3650) throw badRequest("Ciclo de treinamento inválido");
    input.cycle_days = value;
  }
  for (const field of ["last_training_date", "window_start", "window_end"]) {
    if (!partial || has(field)) {
      const value = trimOrNull(body?.[field]);
      if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw badRequest(`${field} inválida`);
      input[field] = value;
    }
  }
  if (!partial || has("observations")) input.observations = trimOrNull(body?.observations);
  if (!partial || has("status")) input.status = requireOneOf(body?.status, CYCLE_STATUS, "Situação", "Em dia");
  if (partial && Object.keys(input).length === 0) throw badRequest("Nenhum campo para atualizar");
  return input;
}

function activityQuestionId(item) {
  return String(item?.question_id || item?.scenario_id || item?.scenarioId || "").trim();
}

function activitySelectedIndex(item) {
  const raw = item?.selected_index ?? item?.selectedIndex;
  const value = Number(raw);
  if (!Number.isInteger(value)) throw badRequest("Resposta inválida na atividade");
  return value;
}

function simulatorDifficulty(activityTitle) {
  const value = String(activityTitle || "").replace(/^Simulador\s*/i, "").trim();
  if (!SIMULATOR_DIFFICULTIES.includes(value)) throw badRequest("Dificuldade do simulador inválida");
  return value;
}

function activityDayMaceio() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Maceio",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function levelForPoints(points) {
  if (points >= 2000) return 5;
  if (points >= 1000) return 4;
  if (points >= 500) return 3;
  if (points >= 200) return 2;
  return 1;
}

trainingRouter.get(
  "/modules",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = req.user.isAdmin
      ? await query(`SELECT * FROM training_modules ORDER BY display_order ASC, title ASC`)
      : await query(
          `SELECT * FROM training_modules WHERE status = 'Ativo' AND (target_sector = 'Todos' OR target_sector = ?) ORDER BY display_order ASC, title ASC`,
          [req.user.setor ?? ""],
        );
    res.json(rows.map(mapModule));
  }),
);

adminTrainingRouter.post(
  "/modules",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const input = readModuleInput(req.body);
    const id = uuid();
    await execute(
      `INSERT INTO training_modules (id,title,description,content,display_order,min_score,target_sector,status,created_by,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))`,
      [id, input.title, input.description, input.content, input.display_order, input.min_score, input.target_sector, input.status, req.user.id],
    );
    await audit(req.user.id, "INSERT", "training_modules", id, { title: input.title });
    res.status(201).json({ id });
  }),
);

adminTrainingRouter.patch(
  "/modules/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const current = await queryOne(`SELECT * FROM training_modules WHERE id = ?`, [req.params.id]);
    if (!current) throw notFound("Módulo não encontrado");
    const input = readModuleInput(req.body, { partial: true });
    const fields = Object.keys(input);
    await execute(`UPDATE training_modules SET ${fields.map((field) => `${field} = ?`).join(", ")}, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`, [...fields.map((field) => input[field]), current.id]);
    await audit(req.user.id, "UPDATE", "training_modules", current.id, { changed: fields });
    res.status(204).end();
  }),
);

adminTrainingRouter.delete(
  "/modules/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const current = await queryOne(`SELECT id,title FROM training_modules WHERE id = ?`, [req.params.id]);
    if (!current) throw notFound("Módulo não encontrado");
    await execute(`DELETE FROM training_modules WHERE id = ?`, [current.id]);
    await audit(req.user.id, "DELETE", "training_modules", current.id, { title: current.title });
    res.status(204).end();
  }),
);

adminTrainingRouter.get(
  "/schedules",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const rows = await query(`SELECT * FROM training_schedules ORDER BY employee_name ASC`);
    res.json(rows.map(mapSchedule));
  }),
);

adminTrainingRouter.post(
  "/schedules",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const input = readScheduleInput(req.body);
    const employee = await queryOne(`SELECT id FROM employees WHERE id = ?`, [input.employee_id]);
    if (!employee) throw notFound("Colaborador não encontrado");
    const id = uuid();
    await execute(
      `INSERT INTO training_schedules (id,employee_id,employee_name,employee_matricula,cycle_days,last_training_date,window_start,window_end,observations,status,created_by,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))`,
      [id,input.employee_id,input.employee_name,input.employee_matricula,input.cycle_days,input.last_training_date,input.window_start,input.window_end,input.observations,input.status,req.user.id],
    );
    await audit(req.user.id, "INSERT", "training_schedules", id, { employee_id: input.employee_id });
    res.status(201).json({ id });
  }),
);

adminTrainingRouter.patch(
  "/schedules/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const current = await queryOne(`SELECT * FROM training_schedules WHERE id = ?`, [req.params.id]);
    if (!current) throw notFound("Ciclo não encontrado");
    const input = readScheduleInput(req.body, { partial: true });
    const fields = Object.keys(input);
    await execute(`UPDATE training_schedules SET ${fields.map((field) => `${field} = ?`).join(", ")}, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`, [...fields.map((field) => input[field]), current.id]);
    await audit(req.user.id, "UPDATE", "training_schedules", current.id, { changed: fields });
    res.status(204).end();
  }),
);

adminTrainingRouter.delete(
  "/schedules/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const current = await queryOne(`SELECT id FROM training_schedules WHERE id = ?`, [req.params.id]);
    if (!current) throw notFound("Ciclo não encontrado");
    await execute(`DELETE FROM training_schedules WHERE id = ?`, [current.id]);
    await audit(req.user.id, "DELETE", "training_schedules", current.id);
    res.status(204).end();
  }),
);

myTrainingRouter.get(
  "/schedule",
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await queryOne(`SELECT * FROM training_schedules WHERE employee_id = ? LIMIT 1`, [req.user.employeeId]);
    res.json(row ? mapSchedule(row) : null);
  }),
);

myTrainingRouter.get(
  "/activities",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await query(`SELECT * FROM training_activity_attempts WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id]);
    res.json(rows.map(mapAttempt));
  }),
);

myTrainingRouter.post(
  "/activities/:type/attempts",
  requireAuth,
  asyncHandler(async (req, res) => {
    const activityType = requireOneOf(decodeURIComponent(req.params.type), ACTIVITY_TYPES, "Tipo de atividade");
    const activityTitle = requireText(req.body?.activityTitle || activityType, "Título da atividade");
    const submittedAnswers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    if (!submittedAnswers.length) throw badRequest("Nenhuma resposta enviada");

    const normalizedAnswers = submittedAnswers.map((item) => ({
      ...item,
      question_id: activityQuestionId(item),
      selected_index: activitySelectedIndex(item),
    }));
    if (normalizedAnswers.some((item) => !item.question_id)) throw badRequest("Questões inválidas");

    const ids = normalizedAnswers.map((item) => item.question_id);
    if (new Set(ids).size !== ids.length) throw badRequest("Questão duplicada na atividade");

    const difficulty = activityType === "Simulador" ? simulatorDifficulty(activityTitle) : null;
    let expectedCount;
    if (activityType === "Teste Rápido") expectedCount = 5;
    else if (activityType === "Desafio Diário") expectedCount = 3;
    else {
      const countParams = [req.user.setor ?? ""];
      let countSql = `SELECT COUNT(*) AS total FROM question_bank WHERE active = 1 AND bank_type = 'simulacoes' AND (target_sector = 'Todos' OR target_sector = ?)`;
      if (activityType === "Simulador") {
        countSql += ` AND difficulty = ?`;
        countParams.push(difficulty);
      }
      const available = await queryOne(countSql, countParams);
      expectedCount = Math.min(activityType === "Simulador" ? 4 : 5, Number(available?.total || 0));
    }
    if (expectedCount <= 0) throw badRequest("Não há questões ativas suficientes para esta atividade");
    if (normalizedAnswers.length !== expectedCount) {
      throw badRequest(`Quantidade de respostas inválida: esperado ${expectedCount}, recebido ${normalizedAnswers.length}`);
    }

    const placeholders = ids.map(() => "?").join(",");
    const questions = await query(
      `SELECT id, correct_index, target_sector, active, bank_type, difficulty FROM question_bank WHERE id IN (${placeholders})`,
      ids,
    );
    if (questions.length !== ids.length) throw badRequest("Uma ou mais questões não existem");

    const byId = new Map(questions.map((row) => [row.id, row]));
    let correct = 0;
    for (const answer of normalizedAnswers) {
      const question = byId.get(answer.question_id);
      if (!question || !asBool(question.active)) throw badRequest("Questão inativa ou inválida");
      if (question.target_sector !== "Todos" && question.target_sector !== req.user.setor) throw badRequest("Questão incompatível com o setor do usuário");
      if (activityType === "Desafio Diário" && question.bank_type !== "treinamento_dinamico") throw badRequest("Questão não autorizada para o Desafio Diário");
      if ((activityType === "Simulador" || activityType === "Stress Test") && question.bank_type !== "simulacoes") throw badRequest("Cenário não autorizado para esta atividade");
      if (activityType === "Simulador" && question.difficulty !== difficulty) throw badRequest("Cenário incompatível com a dificuldade do simulador");
      if (answer.selected_index === Number(question.correct_index)) correct += 1;
    }

    const questionCount = normalizedAnswers.length;
    const score = Math.round((correct / questionCount) * 10 * 10) / 10;
    const passed = score >= 7;
    const today = activityDayMaceio();
    const rewardBase = activityType === "Teste Rápido" ? 10 : activityType === "Desafio Diário" ? 15 : activityType === "Stress Test" ? 25 : 20;

    const result = await withTransaction(async (connection) => {
      const [employees] = await connection.execute(`SELECT * FROM employees WHERE id = ? FOR UPDATE`, [req.user.employeeId]);
      const employee = employees[0];
      if (!employee) throw notFound("Colaborador não encontrado");

      const [rewardedRows] = await connection.execute(
        `SELECT COUNT(*) AS total FROM training_activity_attempts WHERE user_id = ? AND activity_type = ? AND activity_day = ?`,
        [req.user.id, activityType, today],
      );
      const alreadyCompletedToday = Number(rewardedRows[0]?.total || 0) > 0;
      if (activityType === "Desafio Diário" && alreadyCompletedToday) throw conflict("Desafio Diário já realizado hoje");
      const alreadyRewardedToday = alreadyCompletedToday && activityType !== "Desafio Diário";
      const pointsEarned = alreadyRewardedToday ? 0 : rewardBase;
      const attemptId = uuid();

      await connection.execute(
        `INSERT INTO training_activity_attempts
         (id,user_id,employee_id,employee_name,employee_matricula,employee_sector,activity_type,activity_title,answers,score,max_score,passed,points_earned,created_at,activity_day)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(3),?)`,
        [attemptId,req.user.id,employee.id,employee.full_name,employee.matricula,employee.sector,activityType,activityTitle,JSON.stringify(normalizedAnswers),score,10,passed ? 1 : 0,pointsEarned,today],
      );

      const newPoints = Number(employee.points || 0) + pointsEarned;
      const level = levelForPoints(newPoints);
      if (pointsEarned > 0 || Number(employee.level || 1) !== level) {
        await connection.execute(`UPDATE employees SET points = ?, level = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`, [newPoints, level, employee.id]);
      }

      await audit(req.user.id, "TRAINING_ACTIVITY", "training_activity_attempts", attemptId, { activity_type: activityType, score, passed, points_earned: pointsEarned }, connection);
      return { attemptId, pointsEarned, alreadyRewardedToday, newPoints, level };
    });

    res.status(201).json({
      success: true,
      attempt_id: result.attemptId,
      score,
      passed,
      points_earned: result.pointsEarned,
      new_points: result.newPoints,
      level: result.level,
      activity_day: today,
      already_rewarded_today: result.alreadyRewardedToday,
      correct_count: correct,
      question_count: questionCount,
    });
  }),
);
