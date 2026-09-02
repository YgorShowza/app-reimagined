import { Router } from "express";
import { execute, query, queryOne } from "../db.js";
import { audit } from "../audit.js";
import { requireAdmin, requireAuth } from "../session.js";
import { asBool, asyncHandler, badRequest, notFound, parseJson, requireOneOf, requireText, trimOrNull, uuid } from "../util.js";

export const operationsRouter = Router();

const SEVERITIES = ["Baixa", "Média", "Alta", "Crítica"];
const OCCURRENCE_STATUS = ["Aberta", "Em análise", "Concluída"];
const PRACTICAL_STATUS = ["Planejada", "Em andamento", "Concluída"];
const TEMPLATE_STATUS = ["Ativo", "Inativo"];
const RECURRENCES = ["once", "monthly", "bimonthly", "quarterly"];
const TARGET_SECTORS = ["Todos", "CFTV", "Vigilância", "Portaria", "Ronda", "Administrativo"];

const jsonValue = (value, fallback = []) => parseJson(value, fallback);
const boolRow = (row) => ({ ...row, active: asBool(row.active) });
const practicalRow = (row) => ({ ...row, score: Number(row.score || 0), max_score: Number(row.max_score || 10), checklist: jsonValue(row.checklist, []) });
const templateRow = (row) => ({ ...row, min_approval_score: Number(row.min_approval_score || 7), applications_per_month: Number(row.applications_per_month || 1), tasks: jsonValue(row.tasks, []) });

operationsRouter.get("/knowledge", requireAuth, asyncHandler(async (req, res) => {
  const rows = req.user.isAdmin
    ? await query(`SELECT * FROM knowledge_items ORDER BY category, title`)
    : await query(`SELECT * FROM knowledge_items WHERE active = 1 AND (target_sector = 'Todos' OR target_sector = ?) ORDER BY category, title`, [req.user.setor || ""]);
  res.json(rows.map(boolRow));
}));

operationsRouter.post("/knowledge", requireAdmin, asyncHandler(async (req, res) => {
  const id = uuid();
  const title = requireText(req.body?.title, "Título");
  const category = requireText(req.body?.category || "Geral", "Categoria");
  const content = requireText(req.body?.content, "Conteúdo");
  const target = requireOneOf(req.body?.target_sector, TARGET_SECTORS, "Setor alvo", "Todos");
  await execute(`INSERT INTO knowledge_items (id,title,category,content,target_sector,active,created_by,created_at,updated_at) VALUES (?,?,?,?,?,1,?,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))`, [id,title,category,content,target,req.user.id]);
  await audit(req.user.id,"INSERT","knowledge_items",id,{title});
  res.status(201).json({ id });
}));

operationsRouter.patch("/knowledge/:id", requireAdmin, asyncHandler(async (req,res) => {
  const current = await queryOne(`SELECT id FROM knowledge_items WHERE id = ?`, [req.params.id]);
  if (!current) throw notFound("Conteúdo não encontrado");
  const allowed = ["title","category","content","target_sector","active"];
  const patch = Object.fromEntries(allowed.filter(k => Object.prototype.hasOwnProperty.call(req.body || {},k)).map(k => [k, k === "active" ? (req.body[k] ? 1 : 0) : req.body[k]]));
  if (!Object.keys(patch).length) throw badRequest("Nenhum campo para atualizar");
  const fields = Object.keys(patch);
  await execute(`UPDATE knowledge_items SET ${fields.map(f=>`${f} = ?`).join(", ")}, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`, [...fields.map(f=>patch[f]),req.params.id]);
  await audit(req.user.id,"UPDATE","knowledge_items",req.params.id,{changed:fields});
  res.status(204).end();
}));
operationsRouter.delete("/knowledge/:id", requireAdmin, asyncHandler(async (req,res)=>{ await execute(`DELETE FROM knowledge_items WHERE id = ?`,[req.params.id]); await audit(req.user.id,"DELETE","knowledge_items",req.params.id); res.status(204).end(); }));

operationsRouter.get("/occurrences", requireAuth, asyncHandler(async (req,res)=>{
  const rows = req.user.isAdmin
    ? await query(`SELECT * FROM occurrences ORDER BY occurred_at DESC`)
    : await query(`SELECT * FROM occurrences WHERE created_by = ? OR employee_id = ? ORDER BY occurred_at DESC`, [req.user.id, req.user.employeeId]);
  res.json(rows);
}));
operationsRouter.post("/occurrences", requireAuth, asyncHandler(async (req,res)=>{
  const id=uuid();
  const title=requireText(req.body?.title,"Título"); const category=requireText(req.body?.category || "Operacional","Categoria");
  const severity=requireOneOf(req.body?.severity,SEVERITIES,"Severidade","Baixa"); const description=requireText(req.body?.description,"Descrição");
  await execute(`INSERT INTO occurrences (id,employee_id,employee_name,employee_matricula,title,category,severity,description,location,status,occurred_at,resolution_notes,resolved_at,created_by,created_by_name,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'Aberta',COALESCE(?,UTC_TIMESTAMP(3)),NULL,NULL,?,?,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))`, [id,trimOrNull(req.body?.employee_id),trimOrNull(req.body?.employee_name),trimOrNull(req.body?.employee_matricula),title,category,severity,description,trimOrNull(req.body?.location),trimOrNull(req.body?.occurred_at),req.user.id,trimOrNull(req.body?.created_by_name)||req.user.nome]);
  await audit(req.user.id,"INSERT","occurrences",id,{title,severity}); res.status(201).json({id});
}));
operationsRouter.patch("/occurrences/:id", requireAdmin, asyncHandler(async (req,res)=>{
  const current=await queryOne(`SELECT * FROM occurrences WHERE id = ?`,[req.params.id]); if(!current) throw notFound("Ocorrência não encontrada");
  const allowed=["employee_id","employee_name","employee_matricula","title","category","severity","description","location","status","occurred_at","resolution_notes","resolved_at","created_by_name"];
  const patch=Object.fromEntries(allowed.filter(k=>Object.prototype.hasOwnProperty.call(req.body||{},k)).map(k=>[k,req.body[k]]));
  if(patch.severity) patch.severity=requireOneOf(patch.severity,SEVERITIES,"Severidade"); if(patch.status) patch.status=requireOneOf(patch.status,OCCURRENCE_STATUS,"Situação");
  const fields=Object.keys(patch); if(!fields.length) throw badRequest("Nenhum campo para atualizar");
  await execute(`UPDATE occurrences SET ${fields.map(f=>`${f} = ?`).join(", ")}, updated_at=UTC_TIMESTAMP(3) WHERE id=?`,[...fields.map(f=>patch[f]),req.params.id]); await audit(req.user.id,"UPDATE","occurrences",req.params.id,{changed:fields}); res.status(204).end();
}));
operationsRouter.delete("/occurrences/:id", requireAdmin, asyncHandler(async(req,res)=>{await execute(`DELETE FROM occurrences WHERE id=?`,[req.params.id]);await audit(req.user.id,"DELETE","occurrences",req.params.id);res.status(204).end();}));

operationsRouter.get("/practical-evaluations", requireAdmin, asyncHandler(async(_req,res)=>{const rows=await query(`SELECT * FROM practical_evaluations ORDER BY evaluation_date DESC, created_at DESC`);res.json(rows.map(practicalRow));}));
operationsRouter.post("/practical-evaluations", requireAdmin, asyncHandler(async(req,res)=>{const id=uuid(); const employeeId=requireText(req.body?.employee_id,"Colaborador"); const employee=await queryOne(`SELECT * FROM employees WHERE id=?`,[employeeId]); if(!employee) throw notFound("Colaborador não encontrado"); const title=requireText(req.body?.title,"Título"); const checklist=Array.isArray(req.body?.checklist)?req.body.checklist:[]; await execute(`INSERT INTO practical_evaluations (id,employee_id,employee_name,employee_matricula,employee_sector,title,evaluator_id,evaluator_name,status,score,max_score,checklist,notes,evaluation_date,completed_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?, 'Planejada',0,10,?,?,?,NULL,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))`,[id,employee.id,employee.full_name,employee.matricula,employee.sector,title,req.user.id,trimOrNull(req.body?.evaluator_name)||req.user.nome,JSON.stringify(checklist),trimOrNull(req.body?.notes),trimOrNull(req.body?.evaluation_date)]); await audit(req.user.id,"INSERT","practical_evaluations",id,{employee_id:employee.id,title}); res.status(201).json({id});}));
operationsRouter.patch("/practical-evaluations/:id", requireAdmin, asyncHandler(async(req,res)=>{const current=await queryOne(`SELECT * FROM practical_evaluations WHERE id=?`,[req.params.id]);if(!current) throw notFound("Avaliação não encontrada"); const allowed=["title","status","score","max_score","checklist","notes","evaluation_date","completed_at","evaluator_name"]; const patch=Object.fromEntries(allowed.filter(k=>Object.prototype.hasOwnProperty.call(req.body||{},k)).map(k=>[k,k==="checklist"?JSON.stringify(req.body[k]||[]):req.body[k]])); if(patch.status) patch.status=requireOneOf(patch.status,PRACTICAL_STATUS,"Situação"); const fields=Object.keys(patch);if(!fields.length) throw badRequest("Nenhum campo para atualizar");await execute(`UPDATE practical_evaluations SET ${fields.map(f=>`${f} = ?`).join(", ")}, updated_at=UTC_TIMESTAMP(3) WHERE id=?`,[...fields.map(f=>patch[f]),req.params.id]);await audit(req.user.id,"UPDATE","practical_evaluations",req.params.id,{changed:fields});res.status(204).end();}));
operationsRouter.delete("/practical-evaluations/:id", requireAdmin, asyncHandler(async(req,res)=>{await execute(`DELETE FROM practical_evaluations WHERE id=?`,[req.params.id]);await audit(req.user.id,"DELETE","practical_evaluations",req.params.id);res.status(204).end();}));

operationsRouter.get("/practical-templates", requireAdmin, asyncHandler(async(_req,res)=>{const rows=await query(`SELECT * FROM practical_eval_templates ORDER BY title`);res.json(rows.map(templateRow));}));
operationsRouter.post("/practical-templates", requireAdmin, asyncHandler(async(req,res)=>{const id=uuid();const title=requireText(req.body?.title,"Título");const target=requireOneOf(req.body?.target_sector,TARGET_SECTORS,"Setor alvo","CFTV");const recurrence=requireOneOf(req.body?.recurrence,RECURRENCES,"Recorrência","monthly");const status=requireOneOf(req.body?.status,TEMPLATE_STATUS,"Situação","Ativo");const min=Number(req.body?.min_approval_score??7);const apps=Number(req.body?.applications_per_month??1);const tasks=Array.isArray(req.body?.tasks)?req.body.tasks:[];await execute(`INSERT INTO practical_eval_templates (id,title,platform,description,target_sector,min_approval_score,recurrence,applications_per_month,tasks,status,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))`,[id,title,trimOrNull(req.body?.platform),trimOrNull(req.body?.description),target,min,recurrence,apps,JSON.stringify(tasks),status,req.user.id]);const row=await queryOne(`SELECT * FROM practical_eval_templates WHERE id=?`,[id]);await audit(req.user.id,"INSERT","practical_eval_templates",id,{title});res.status(201).json(templateRow(row));}));
operationsRouter.patch("/practical-templates/:id", requireAdmin, asyncHandler(async(req,res)=>{const current=await queryOne(`SELECT * FROM practical_eval_templates WHERE id=?`,[req.params.id]);if(!current) throw notFound("Modelo não encontrado");const allowed=["title","platform","description","target_sector","min_approval_score","recurrence","applications_per_month","tasks","status"];const patch=Object.fromEntries(allowed.filter(k=>Object.prototype.hasOwnProperty.call(req.body||{},k)).map(k=>[k,k==="tasks"?JSON.stringify(req.body[k]||[]):req.body[k]]));if(patch.recurrence)patch.recurrence=requireOneOf(patch.recurrence,RECURRENCES,"Recorrência");if(patch.status)patch.status=requireOneOf(patch.status,TEMPLATE_STATUS,"Situação");const fields=Object.keys(patch);if(!fields.length)throw badRequest("Nenhum campo para atualizar");await execute(`UPDATE practical_eval_templates SET ${fields.map(f=>`${f} = ?`).join(", ")}, updated_at=UTC_TIMESTAMP(3) WHERE id=?`,[...fields.map(f=>patch[f]),req.params.id]);const row=await queryOne(`SELECT * FROM practical_eval_templates WHERE id=?`,[req.params.id]);await audit(req.user.id,"UPDATE","practical_eval_templates",req.params.id,{changed:fields});res.json(templateRow(row));}));
operationsRouter.delete("/practical-templates/:id", requireAdmin, asyncHandler(async(req,res)=>{await execute(`DELETE FROM practical_eval_templates WHERE id=?`,[req.params.id]);await audit(req.user.id,"DELETE","practical_eval_templates",req.params.id);res.status(204).end();}));

operationsRouter.get("/audit", requireAdmin, asyncHandler(async(req,res)=>{const limit=Math.min(Math.max(Number(req.query.limit||200),1),500);const rows=await query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ${limit}`);res.json(rows.map(row=>({...row,details:jsonValue(row.details,{})})));}));
