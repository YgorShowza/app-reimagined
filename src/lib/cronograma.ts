import { supabase } from "@/integrations/supabase/client";
import { apiRequest, isSegempatApiConfigured } from "@/lib/backend/api-client";
import { normalizeMatricula } from "@/lib/matricula";
import { operationalDate, operationalMonth } from "@/lib/operational-time";

export type CronogramaStatus = "Pendente" | "Realizado" | "Justificado";
export type CronogramaType = "Planejado" | "Realizado";
export type SuspensionType = "mes_suspenso" | "ausencia_operador";

export interface CronogramaEntry {
  id: string;
  month: string;
  employee_id: string;
  employee_name: string;
  employee_matricula: string;
  employee_sector: string;
  theme: string;
  exam_id: string | null;
  exam_title: string | null;
  type: CronogramaType;
  status: CronogramaStatus;
  justification: string | null;
  planned_date: string | null;
  completion_date: string | null;
  notes: string | null;
  question_bank_ids: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CronogramaEntryInput {
  month: string;
  employee_id: string;
  employee_name: string;
  employee_matricula: string;
  employee_sector: string;
  theme: string;
  exam_id?: string | null;
  exam_title?: string | null;
  type?: CronogramaType;
  status?: CronogramaStatus;
  justification?: string | null;
  planned_date?: string | null;
  completion_date?: string | null;
  notes?: string | null;
  question_bank_ids?: string[];
}

export interface RecurringModel {
  id: string;
  theme: string;
  target_sector: string;
  recurrence: "monthly";
  active: boolean;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringModelInput {
  theme: string;
  target_sector: string;
  active?: boolean;
  created_by_name?: string | null;
}

export interface CronogramaSuspension {
  id: string;
  type: SuspensionType;
  month: string;
  reason: string;
  notes: string | null;
  employee_id: string | null;
  employee_name: string | null;
  employee_matricula: string | null;
  date_start: string | null;
  date_end: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CronogramaSuspensionInput {
  type: SuspensionType;
  month: string;
  reason: string;
  notes?: string | null;
  employee_id?: string | null;
  employee_name?: string | null;
  employee_matricula?: string | null;
  date_start?: string | null;
  date_end?: string | null;
  created_by_name?: string | null;
}

export interface AnnualMonthSummary {
  month: string;
  total: number;
  realizado: number;
  pendente: number;
  justificado: number;
  executionRate: number;
}

export const JUSTIFICATION_OPTIONS = [
  "Férias",
  "Atestado médico",
  "Folga programada",
  "Afastamento",
  "Licença",
  "Recusou participar",
  "Escala de serviço",
  "Outro motivo",
] as const;

export const TARGET_SECTORS = ["Todos", "CFTV", "Vigilância", "Portaria", "Ronda", "Administrativo", "Operações"] as const;

export function currentMonthStr() {
  return operationalMonth();
}

export function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, (m || 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, (m || 1) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

async function authUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function entryForApi(entry: Partial<CronogramaEntryInput>) {
  const allowed = ["month", "employee_id", "theme", "exam_id", "exam_title", "type", "status", "justification", "planned_date", "completion_date", "notes", "question_bank_ids"] as const;
  return Object.fromEntries(allowed.filter((key) => entry[key] !== undefined).map((key) => [key, entry[key]]));
}

function recurringForApi(input: Partial<RecurringModelInput>) {
  const allowed = ["theme", "target_sector", "active"] as const;
  return Object.fromEntries(allowed.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]));
}

function suspensionForApi(input: Partial<CronogramaSuspensionInput>) {
  const allowed = ["type", "month", "reason", "notes", "employee_id", "date_start", "date_end"] as const;
  return Object.fromEntries(allowed.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]));
}

export async function listCronogramaEntries(month: string): Promise<CronogramaEntry[]> {
  if (isSegempatApiConfigured()) return apiRequest<CronogramaEntry[]>(`/api/cronograma?month=${encodeURIComponent(month)}`);
  const { data, error } = await (supabase as any).from("cronograma_entries").select("*").eq("month", month).order("planned_date", { ascending: true, nullsFirst: false }).order("employee_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CronogramaEntry[];
}

export async function listCronogramaEntriesByYear(year: number): Promise<CronogramaEntry[]> {
  if (isSegempatApiConfigured()) return apiRequest<CronogramaEntry[]>(`/api/cronograma/year/${year}`);
  const { data, error } = await (supabase as any).from("cronograma_entries").select("*").gte("month", `${year}-01`).lte("month", `${year}-12`).order("month", { ascending: true }).order("employee_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CronogramaEntry[];
}

export async function createCronogramaEntries(entries: CronogramaEntryInput[]) {
  if (!entries.length) return;
  if (isSegempatApiConfigured()) {
    if (entries.length > 1000) throw new Error("O SEGEMPAT permite no máximo 1000 lançamentos atômicos por operação.");
    await apiRequest<{ ids: string[]; count: number }>("/api/cronograma/bulk", { method: "POST", body: JSON.stringify({ entries: entries.map(entryForApi) }) });
    return;
  }
  const createdBy = await authUserId();
  const payload = entries.map((entry) => ({ ...entry, created_by: createdBy, exam_id: entry.exam_id || null, exam_title: entry.exam_title || null, justification: entry.justification || null, planned_date: entry.planned_date || null, completion_date: entry.completion_date || null, notes: entry.notes || null, question_bank_ids: entry.question_bank_ids ?? [] }));
  const { error } = await (supabase as any).from("cronograma_entries").insert(payload);
  if (error) throw error;
}

export async function updateCronogramaEntry(id: string, patch: Partial<CronogramaEntryInput>) {
  const normalized = { ...patch, ...(patch.exam_id !== undefined ? { exam_id: patch.exam_id || null } : {}), ...(patch.exam_title !== undefined ? { exam_title: patch.exam_title || null } : {}), ...(patch.justification !== undefined ? { justification: patch.justification || null } : {}), ...(patch.planned_date !== undefined ? { planned_date: patch.planned_date || null } : {}), ...(patch.completion_date !== undefined ? { completion_date: patch.completion_date || null } : {}), ...(patch.notes !== undefined ? { notes: patch.notes || null } : {}) };
  if (isSegempatApiConfigured()) {
    await apiRequest<void>(`/api/cronograma/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(entryForApi(normalized)) });
    return;
  }
  const { error } = await (supabase as any).from("cronograma_entries").update(normalized).eq("id", id);
  if (error) throw error;
}

export async function deleteCronogramaEntry(id: string) {
  if (isSegempatApiConfigured()) { await apiRequest<void>(`/api/cronograma/${encodeURIComponent(id)}`, { method: "DELETE" }); return; }
  const { error } = await (supabase as any).from("cronograma_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function markCronogramaEntryComplete(id: string, date = operationalDate()) {
  if (isSegempatApiConfigured()) { await updateCronogramaEntry(id, { status: "Realizado", type: "Realizado", completion_date: date, justification: null }); return; }
  const { error } = await (supabase as any).from("cronograma_entries").update({ status: "Realizado", type: "Realizado", completion_date: date, justification: null }).eq("id", id);
  if (error) throw error;
}

export function cronogramaMetrics(entries: CronogramaEntry[]) {
  const total = entries.length;
  const realizado = entries.filter((e) => e.status === "Realizado").length;
  const pendente = entries.filter((e) => e.status === "Pendente").length;
  const justificado = entries.filter((e) => e.status === "Justificado").length;
  return { total, realizado, pendente, justificado, executionRate: total ? Math.round((realizado / total) * 100) : 0 };
}

export function annualSummary(entries: CronogramaEntry[], year: number): AnnualMonthSummary[] {
  return Array.from({ length: 12 }, (_, i) => { const month = `${year}-${String(i + 1).padStart(2, "0")}`; return { month, ...cronogramaMetrics(entries.filter((e) => e.month === month)) }; });
}

export async function listRecurringModels(): Promise<RecurringModel[]> {
  if (isSegempatApiConfigured()) return apiRequest<RecurringModel[]>("/api/cronograma/recurring-models");
  const { data, error } = await (supabase as any).from("cronograma_recurring_models").select("*").order("active", { ascending: false }).order("theme", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RecurringModel[];
}

export async function createRecurringModel(input: RecurringModelInput) {
  if (isSegempatApiConfigured()) { await apiRequest<{ id: string }>("/api/cronograma/recurring-models", { method: "POST", body: JSON.stringify(recurringForApi(input)) }); return; }
  const createdBy = await authUserId();
  const { error } = await (supabase as any).from("cronograma_recurring_models").insert({ theme: input.theme.trim(), target_sector: input.target_sector, recurrence: "monthly", active: input.active ?? true, created_by: createdBy, created_by_name: input.created_by_name || null });
  if (error) throw error;
}

export async function updateRecurringModel(id: string, patch: Partial<RecurringModelInput>) {
  if (isSegempatApiConfigured()) { await apiRequest<void>(`/api/cronograma/recurring-models/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(recurringForApi(patch)) }); return; }
  const { error } = await (supabase as any).from("cronograma_recurring_models").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteRecurringModel(id: string) {
  if (isSegempatApiConfigured()) { await apiRequest<void>(`/api/cronograma/recurring-models/${encodeURIComponent(id)}`, { method: "DELETE" }); return; }
  const { error } = await (supabase as any).from("cronograma_recurring_models").delete().eq("id", id);
  if (error) throw error;
}

export async function applyRecurringModels(params: { month: string; models: RecurringModel[]; employees: Array<{ id: string; full_name: string; matricula: string; sector: string; status: string; access_profile: string }>; existingEntries: CronogramaEntry[]; plannedDate?: string | null; }) {
  const { month, models, employees, existingEntries, plannedDate = null } = params;
  const activeEmployees = employees.filter((e) => e.status === "Ativo" && e.access_profile !== "Inspetor");
  const existingKeys = new Set(existingEntries.map((e) => `${e.employee_id}|${e.theme.trim().toLowerCase()}`));
  const rows: CronogramaEntryInput[] = [];
  for (const model of models.filter((m) => m.active)) {
    for (const emp of activeEmployees.filter((e) => model.target_sector === "Todos" || e.sector === model.target_sector)) {
      const key = `${emp.id}|${model.theme.trim().toLowerCase()}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      rows.push({ month, employee_id: emp.id, employee_name: emp.full_name, employee_matricula: emp.matricula, employee_sector: emp.sector, theme: model.theme, type: "Planejado", status: "Pendente", planned_date: plannedDate });
    }
  }
  await createCronogramaEntries(rows);
  return rows.length;
}

export async function listSuspensions(month: string): Promise<CronogramaSuspension[]> {
  if (isSegempatApiConfigured()) return apiRequest<CronogramaSuspension[]>(`/api/cronograma/suspensions?month=${encodeURIComponent(month)}`);
  const { data, error } = await (supabase as any).from("cronograma_suspensions").select("*").eq("month", month).order("type", { ascending: true }).order("date_start", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as CronogramaSuspension[];
}

export async function createSuspension(input: CronogramaSuspensionInput) {
  if (isSegempatApiConfigured()) { await apiRequest<{ id: string }>("/api/cronograma/suspensions", { method: "POST", body: JSON.stringify(suspensionForApi(input)) }); return; }
  const createdBy = await authUserId();
  const { error } = await (supabase as any).from("cronograma_suspensions").insert({ ...input, created_by: createdBy, employee_id: input.employee_id || null, employee_name: input.employee_name || null, employee_matricula: input.employee_matricula || null, notes: input.notes || null, date_start: input.date_start || null, date_end: input.date_end || null, created_by_name: input.created_by_name || null });
  if (error) throw error;
}

export async function updateSuspension(id: string, patch: Partial<CronogramaSuspensionInput>) {
  if (isSegempatApiConfigured()) { await apiRequest<void>(`/api/cronograma/suspensions/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(suspensionForApi(patch)) }); return; }
  const { error } = await (supabase as any).from("cronograma_suspensions").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteSuspension(id: string) {
  if (isSegempatApiConfigured()) { await apiRequest<void>(`/api/cronograma/suspensions/${encodeURIComponent(id)}`, { method: "DELETE" }); return; }
  const { error } = await (supabase as any).from("cronograma_suspensions").delete().eq("id", id);
  if (error) throw error;
}

export async function syncCronogramaWithExamAttempts(month?: string) {
  if (isSegempatApiConfigured()) {
    const result = await apiRequest<{ changed: number }>("/api/cronograma/sync-exam-attempts", { method: "POST", body: JSON.stringify({ month: month ?? null }) });
    return result.changed;
  }
  const entryQuery = (supabase as any).from("cronograma_entries").select("id,employee_matricula,exam_id,status,completion_date").not("exam_id", "is", null).neq("status", "Realizado");
  const { data: entries, error: entryError } = month ? await entryQuery.eq("month", month) : await entryQuery;
  if (entryError) throw entryError;
  if (!entries?.length) return 0;
  const examIds = Array.from(new Set(entries.map((e: any) => e.exam_id).filter(Boolean)));
  const { data: attempts, error: attemptsError } = await (supabase as any).from("exam_attempts").select("exam_id,matricula,passed,finished_at").in("exam_id", examIds).eq("passed", true).order("finished_at", { ascending: true });
  if (attemptsError) throw attemptsError;
  let changed = 0;
  for (const entry of entries as any[]) {
    const entryMatricula = normalizeMatricula(String(entry.employee_matricula || ""));
    const attempt = (attempts ?? []).find((a: any) => a.exam_id === entry.exam_id && normalizeMatricula(String(a.matricula || "")) === entryMatricula);
    if (!attempt) continue;
    const finishedAt = new Date(String(attempt.finished_at || ""));
    if (Number.isNaN(finishedAt.getTime())) throw new Error("Tentativa de prova possui data de conclusão inválida");
    const completion = operationalDate(finishedAt);
    const { error } = await (supabase as any).from("cronograma_entries").update({ status: "Realizado", type: "Realizado", completion_date: completion, justification: null }).eq("id", entry.id);
    if (!error) changed += 1;
  }
  return changed;
}
