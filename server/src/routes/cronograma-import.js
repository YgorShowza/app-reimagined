import { Router } from "express";
import { withTransaction } from "../db.js";
import { audit } from "../audit.js";
import { requireAdmin } from "../session.js";
import { asyncHandler, badRequest, requireMonth, requireText, uuid } from "../util.js";

export const cronogramaImportRouter = Router();

const MAX_IMPORT_ROWS = 1000;

function readImportRow(raw, index) {
  const rowNumber = index + 1;
  const matricula = requireText(raw?.matricula, `Matrícula da linha ${rowNumber}`);
  const theme = requireText(raw?.tema, `Tema da linha ${rowNumber}`);
  const month = requireMonth(raw?.month);
  const completionDate = requireText(raw?.completion_date, `Data de conclusão da linha ${rowNumber}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(completionDate)) {
    throw badRequest(`Data de conclusão inválida na linha ${rowNumber}`);
  }
  const parsedDate = new Date(`${completionDate}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== completionDate) {
    throw badRequest(`Data de conclusão inválida na linha ${rowNumber}`);
  }
  const score = Number(raw?.nota);
  return {
    matricula,
    theme,
    month,
    completionDate,
    score: Number.isFinite(score) ? score : null,
  };
}

cronogramaImportRouter.post(
  "/import-results",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const rawRows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rawRows.length) return res.json({ updated: 0, created: 0, ignored: 0 });
    if (rawRows.length > MAX_IMPORT_ROWS) throw badRequest(`Limite de ${MAX_IMPORT_ROWS} linhas por importação`);

    const rows = rawRows.map(readImportRow);
    const result = await withTransaction(async (connection) => {
      let updated = 0;
      let created = 0;
      let ignored = 0;

      for (const row of rows) {
        const [employees] = await connection.execute(
          `SELECT id, full_name, matricula, sector, access_profile
             FROM employees
            WHERE LOWER(TRIM(matricula)) = LOWER(TRIM(?))
              AND status = 'Ativo'
            LIMIT 1
            FOR UPDATE`,
          [row.matricula],
        );
        const employee = employees[0];
        if (!employee || employee.access_profile === "Inspetor") {
          ignored += 1;
          continue;
        }

        const [entries] = await connection.execute(
          `SELECT id, notes
             FROM cronograma_entries
            WHERE month = ?
              AND LOWER(TRIM(employee_matricula)) = LOWER(TRIM(?))
              AND LOWER(TRIM(theme)) = LOWER(TRIM(?))
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE`,
          [row.month, employee.matricula, row.theme],
        );

        const note = row.score === null
          ? "Resultado importado"
          : `Resultado importado · Nota ${row.score.toFixed(1)}`;
        const existing = entries[0];

        if (existing) {
          const notes = existing.notes ? `${existing.notes}\n${note}` : note;
          await connection.execute(
            `UPDATE cronograma_entries
                SET status = 'Realizado',
                    type = 'Realizado',
                    completion_date = ?,
                    justification = NULL,
                    notes = ?,
                    updated_at = UTC_TIMESTAMP(3)
              WHERE id = ?`,
            [row.completionDate, notes, existing.id],
          );
          updated += 1;
          continue;
        }

        const id = uuid();
        await connection.execute(
          `INSERT INTO cronograma_entries
           (id, month, employee_id, employee_name, employee_matricula, employee_sector, theme,
            exam_id, exam_title, type, status, justification, planned_date, completion_date, notes,
            question_bank_ids, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'Realizado', 'Realizado', NULL, NULL, ?, ?, JSON_ARRAY(), ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
          [id, row.month, employee.id, employee.full_name, employee.matricula, employee.sector, row.theme, row.completionDate, note, req.user.id],
        );
        created += 1;
      }

      await audit(req.user.id, "IMPORT_RESULTS", "cronograma_entries", rows[0]?.month ?? "", {
        input_rows: rows.length,
        updated,
        created,
        ignored,
        atomic: true,
        identity_derived_server_side: true,
      }, connection);

      return { updated, created, ignored };
    });

    res.json(result);
  }),
);
