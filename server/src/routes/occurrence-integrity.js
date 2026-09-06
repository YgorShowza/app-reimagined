import { Router } from "express";
import { withTransaction } from "../db.js";
import { audit } from "../audit.js";
import { requireAdmin } from "../session.js";
import { asyncHandler, badRequest, conflict, notFound, requireOneOf, requireText, trimOrNull } from "../util.js";

export const occurrenceIntegrityRouter = Router();

const SEVERITIES = ["Baixa", "Média", "Alta", "Crítica"];
const OCCURRENCE_STATUS = ["Aberta", "Em análise", "Concluída"];

function mysqlDateTimeOrNull(value, label) {
  const text = trimOrNull(value);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw badRequest(`${label} inválida`);
  return date;
}

occurrenceIntegrityRouter.patch(
  "/occurrences/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(`SELECT * FROM occurrences WHERE id = ? LIMIT 1 FOR UPDATE`, [req.params.id]);
      const current = rows[0];
      if (!current) throw notFound("Ocorrência não encontrada");
      if (current.status === "Concluída") {
        throw conflict("Ocorrência concluída pertence ao histórico operacional e não pode ser alterada");
      }

      const patch = {};
      const has = (key) => Object.prototype.hasOwnProperty.call(req.body ?? {}, key);
      if (has("title")) patch.title = requireText(req.body.title, "Título");
      if (has("category")) patch.category = requireText(req.body.category, "Categoria");
      if (has("description")) patch.description = requireText(req.body.description, "Descrição");
      if (has("location")) patch.location = trimOrNull(req.body.location);
      if (has("resolution_notes")) patch.resolution_notes = trimOrNull(req.body.resolution_notes);
      if (has("severity")) patch.severity = requireOneOf(req.body.severity, SEVERITIES, "Severidade");
      if (has("status")) patch.status = requireOneOf(req.body.status, OCCURRENCE_STATUS, "Situação");
      if (has("occurred_at")) patch.occurred_at = mysqlDateTimeOrNull(req.body.occurred_at, "Data/hora da ocorrência");

      const employeeChangeRequested = has("employee_id");
      if (employeeChangeRequested) {
        const employeeId = trimOrNull(req.body.employee_id);
        if (!employeeId) {
          patch.employee_id = null;
          patch.employee_name = null;
          patch.employee_matricula = null;
        } else {
          const [employees] = await connection.execute(
            `SELECT id,full_name,matricula,status FROM employees WHERE id = ? LIMIT 1 FOR UPDATE`,
            [employeeId],
          );
          const employee = employees[0];
          if (!employee) throw notFound("Colaborador relacionado não encontrado");
          if (employee.status !== "Ativo") throw badRequest("Colaborador relacionado precisa estar ativo");
          patch.employee_id = employee.id;
          patch.employee_name = employee.full_name;
          patch.employee_matricula = employee.matricula;
        }
      }

      const effectiveStatus = patch.status ?? current.status;
      const effectiveResolutionNotes = Object.prototype.hasOwnProperty.call(patch, "resolution_notes")
        ? patch.resolution_notes
        : trimOrNull(current.resolution_notes);

      if (effectiveStatus === "Concluída") {
        if (!effectiveResolutionNotes) {
          throw badRequest("Informe as notas de conclusão antes de concluir a ocorrência");
        }
        patch.resolution_notes = effectiveResolutionNotes;
        // A data oficial de encerramento é sempre definida pelo servidor.
        patch.resolved_at = new Date();
      } else {
        patch.resolved_at = null;
      }

      const fields = Object.keys(patch);
      if (!fields.length) throw badRequest("Nenhum campo para atualizar");
      await connection.execute(
        `UPDATE occurrences SET ${fields.map((field) => `${field} = ?`).join(", ")}, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`,
        [...fields.map((field) => patch[field]), current.id],
      );
      await audit(req.user.id, "UPDATE", "occurrences", current.id, {
        changed: fields,
        identity_derived_server_side: employeeChangeRequested,
        resolution_required: effectiveStatus === "Concluída",
        resolved_at_server_derived: effectiveStatus === "Concluída",
        completed_history_guard: true,
        atomic: true,
      }, connection);
    });

    res.status(204).end();
  }),
);

occurrenceIntegrityRouter.delete(
  "/occurrences/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT id,status,title,employee_id FROM occurrences WHERE id = ? LIMIT 1 FOR UPDATE`,
        [req.params.id],
      );
      const current = rows[0];
      if (!current) throw notFound("Ocorrência não encontrada");
      if (current.status !== "Aberta") {
        throw conflict("Ocorrência em análise ou concluída pertence ao histórico operacional e não pode ser excluída");
      }
      await connection.execute(`DELETE FROM occurrences WHERE id = ?`, [current.id]);
      await audit(req.user.id, "DELETE", "occurrences", current.id, {
        status: current.status,
        title: current.title,
        employee_id: current.employee_id,
        history_guard: true,
        atomic: true,
      }, connection);
    });

    res.status(204).end();
  }),
);
