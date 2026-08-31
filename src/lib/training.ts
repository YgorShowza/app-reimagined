import { supabase } from "@/integrations/supabase/client";

export interface QuestionBankItem {
  id: string;
  bank_type: "procedimentos_internos" | "treinamento_dinamico" | "simulacoes";
  question_text: string;
  options: string[];
  correct_index: number | null;
  correct_answer: string | null;
  explanation: string | null;
  target_sector: string;
  difficulty: "Básico" | "Intermediário" | "Avançado";
  theme: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  content: string | null;
  display_order: number;
  min_score: number;
  target_sector: string;
  status: "Ativo" | "Inativo";
  created_at: string;
  updated_at: string;
}

export interface TrainingSchedule {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_matricula: string | null;
  cycle_days: number;
  last_training_date: string | null;
  window_start: string | null;
  window_end: string | null;
  observations: string | null;
  status: "Em dia" | "Próximo ao vencimento" | "Vencido";
  created_at: string;
  updated_at: string;
}

async function authId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function listQuestionBank(): Promise<QuestionBankItem[]> {
  const { data, error } = await (supabase as any)
    .from("question_bank")
    .select("*")
    .order("theme")
    .order("question_text");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    options: Array.isArray(row.options) ? row.options : [],
  }));
}

export async function createQuestionBankItem(
  input: Omit<QuestionBankItem, "id" | "created_at" | "updated_at" | "active"> & { active?: boolean },
) {
  const { error } = await (supabase as any)
    .from("question_bank")
    .insert({ ...input, active: input.active ?? true, created_by: await authId() });
  if (error) throw error;
}

export async function updateQuestionBankItem(id: string, patch: Partial<QuestionBankItem>) {
  const payload: any = { ...patch };
  delete payload.id;
  delete payload.created_at;
  delete payload.updated_at;
  const { error } = await (supabase as any).from("question_bank").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteQuestionBankItem(id: string) {
  const { error } = await (supabase as any).from("question_bank").delete().eq("id", id);
  if (error) throw error;
}

export async function listTrainingModules(): Promise<TrainingModule[]> {
  const { data, error } = await (supabase as any)
    .from("training_modules")
    .select("*")
    .order("display_order")
    .order("title");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ ...row, min_score: Number(row.min_score || 7) }));
}

export async function createTrainingModule(input: {
  title: string;
  description: string;
  content?: string | null;
  display_order?: number;
  min_score?: number;
  target_sector?: string;
  status?: string;
}) {
  const { error } = await (supabase as any)
    .from("training_modules")
    .insert({ ...input, created_by: await authId() });
  if (error) throw error;
}

export async function updateTrainingModule(id: string, patch: Partial<TrainingModule>) {
  const payload: any = { ...patch };
  delete payload.id;
  delete payload.created_at;
  delete payload.updated_at;
  const { error } = await (supabase as any).from("training_modules").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteTrainingModule(id: string) {
  const { error } = await (supabase as any).from("training_modules").delete().eq("id", id);
  if (error) throw error;
}

export function computeTrainingWindow(lastDate: string | null, cycleDays: number) {
  if (!lastDate) {
    return { window_start: null, window_end: null, status: "Vencido" as const };
  }

  const normalizedCycle = Math.max(1, Number(cycleDays) || 90);
  const last = new Date(`${lastDate}T00:00:00Z`);
  const end = new Date(last);
  end.setUTCDate(end.getUTCDate() + normalizedCycle);

  const warningDays = Math.min(30, Math.max(7, Math.round(normalizedCycle * 0.2)));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - warningDays);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const status = today > end
    ? "Vencido"
    : today >= start
      ? "Próximo ao vencimento"
      : "Em dia";

  const format = (date: Date) => date.toISOString().slice(0, 10);
  return { window_start: format(start), window_end: format(end), status };
}

export async function listTrainingSchedules(): Promise<TrainingSchedule[]> {
  const { data, error } = await (supabase as any)
    .from("training_schedules")
    .select("*")
    .order("window_end", { ascending: true, nullsFirst: false });
  if (error) throw error;

  const rank: Record<TrainingSchedule["status"], number> = {
    Vencido: 0,
    "Próximo ao vencimento": 1,
    "Em dia": 2,
  };

  return (data ?? [])
    .map((row: any) => {
      const computed = computeTrainingWindow(row.last_training_date ?? null, Number(row.cycle_days || 90));
      return {
        ...row,
        cycle_days: Number(row.cycle_days || 90),
        window_start: computed.window_start,
        window_end: computed.window_end,
        status: computed.status,
      } as TrainingSchedule;
    })
    .sort((a: TrainingSchedule, b: TrainingSchedule) => {
      const byStatus = rank[a.status] - rank[b.status];
      if (byStatus !== 0) return byStatus;
      return (a.window_end ?? "9999-12-31").localeCompare(b.window_end ?? "9999-12-31");
    });
}

export async function refreshTrainingScheduleStatuses() {
  const schedules = await listTrainingSchedules();
  const changed = schedules.filter((schedule) => schedule.id);
  if (!changed.length) return 0;

  const updates = await Promise.all(
    changed.map(async (schedule) => {
      const { error } = await (supabase as any)
        .from("training_schedules")
        .update({
          window_start: schedule.window_start,
          window_end: schedule.window_end,
          status: schedule.status,
        })
        .eq("id", schedule.id);
      if (error) throw error;
      return 1;
    }),
  );

  return updates.length;
}

export async function upsertTrainingSchedule(input: {
  employee_id: string;
  employee_name: string;
  employee_matricula?: string | null;
  cycle_days: number;
  last_training_date?: string | null;
  observations?: string | null;
}) {
  const computed = computeTrainingWindow(input.last_training_date || null, input.cycle_days);
  const payload = { ...input, ...computed, created_by: await authId() };
  const { error } = await (supabase as any)
    .from("training_schedules")
    .upsert(payload, { onConflict: "employee_id" });
  if (error) throw error;
}

export async function deleteTrainingSchedule(id: string) {
  const { error } = await (supabase as any).from("training_schedules").delete().eq("id", id);
  if (error) throw error;
}
