import { supabase } from "@/integrations/supabase/client";

export type CronogramaStatus = "Pendente" | "Realizado" | "Justificado";
export type CronogramaType = "Planejado" | "Realizado";

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

export function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

export async function listCronogramaEntries(month: string): Promise<CronogramaEntry[]> {
  const { data, error } = await (supabase as any)
    .from("cronograma_entries")
    .select("*")
    .eq("month", month)
    .order("planned_date", { ascending: true, nullsFirst: false })
    .order("employee_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CronogramaEntry[];
}

export async function createCronogramaEntries(entries: CronogramaEntryInput[]) {
  const { data: authData } = await supabase.auth.getUser();
  const createdBy = authData.user?.id ?? null;
  const payload = entries.map((entry) => ({
    ...entry,
    created_by: createdBy,
    exam_id: entry.exam_id || null,
    exam_title: entry.exam_title || null,
    justification: entry.justification || null,
    planned_date: entry.planned_date || null,
    completion_date: entry.completion_date || null,
    notes: entry.notes || null,
    question_bank_ids: entry.question_bank_ids ?? [],
  }));
  const { error } = await (supabase as any).from("cronograma_entries").insert(payload);
  if (error) throw error;
}

export async function updateCronogramaEntry(id: string, patch: Partial<CronogramaEntryInput>) {
  const normalized = {
    ...patch,
    ...(patch.exam_id !== undefined ? { exam_id: patch.exam_id || null } : {}),
    ...(patch.exam_title !== undefined ? { exam_title: patch.exam_title || null } : {}),
    ...(patch.justification !== undefined ? { justification: patch.justification || null } : {}),
    ...(patch.planned_date !== undefined ? { planned_date: patch.planned_date || null } : {}),
    ...(patch.completion_date !== undefined ? { completion_date: patch.completion_date || null } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes || null } : {}),
  };
  const { error } = await (supabase as any).from("cronograma_entries").update(normalized).eq("id", id);
  if (error) throw error;
}

export async function deleteCronogramaEntry(id: string) {
  const { error } = await (supabase as any).from("cronograma_entries").delete().eq("id", id);
  if (error) throw error;
}

export function cronogramaMetrics(entries: CronogramaEntry[]) {
  const total = entries.length;
  const realizado = entries.filter((e) => e.status === "Realizado").length;
  const pendente = entries.filter((e) => e.status === "Pendente").length;
  const justificado = entries.filter((e) => e.status === "Justificado").length;
  const executionRate = total ? Math.round((realizado / total) * 100) : 0;
  return { total, realizado, pendente, justificado, executionRate };
}
