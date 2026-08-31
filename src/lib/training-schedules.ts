import { supabase } from "@/integrations/supabase/client";

export type TrainingCycleStatus = "Em dia" | "Próximo ao vencimento" | "Vencido";

export interface TrainingSchedule {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_matricula: string;
  cycle_days: number;
  last_training_date: string | null;
  window_start: string | null;
  window_end: string | null;
  observations: string | null;
  status: TrainingCycleStatus;
  created_at: string;
  updated_at: string;
}

export interface TrainingScheduleInput {
  employee_id: string;
  employee_name: string;
  employee_matricula: string;
  cycle_days: number;
  last_training_date: string | null;
  window_start: string | null;
  window_end: string | null;
  observations: string | null;
  status: TrainingCycleStatus;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function calculateTrainingWindow(lastTrainingDate: string | null, cycleDays: number) {
  if (!lastTrainingDate) return { window_start: null, window_end: null };
  const last = new Date(`${lastTrainingDate}T12:00:00`);
  const end = new Date(last);
  end.setDate(end.getDate() + Math.max(1, cycleDays));
  const start = new Date(end);
  start.setDate(start.getDate() - Math.min(15, Math.max(7, Math.round(cycleDays * 0.2))));
  return { window_start: isoDate(start), window_end: isoDate(end) };
}

export function deriveTrainingStatus(schedule: Pick<TrainingSchedule, "window_start" | "window_end" | "last_training_date" | "cycle_days">, now = new Date()): TrainingCycleStatus {
  const window = schedule.window_end
    ? { window_start: schedule.window_start, window_end: schedule.window_end }
    : calculateTrainingWindow(schedule.last_training_date, schedule.cycle_days);
  if (!window.window_end) return "Vencido";
  const today = isoDate(now);
  if (today > window.window_end) return "Vencido";
  if (window.window_start && today >= window.window_start) return "Próximo ao vencimento";
  return "Em dia";
}

function normalize(row: any): TrainingSchedule {
  const normalized = row as TrainingSchedule;
  return { ...normalized, status: deriveTrainingStatus(normalized) };
}

export async function listTrainingSchedules(): Promise<TrainingSchedule[]> {
  const { data, error } = await (supabase as any)
    .from("training_schedules")
    .select("*")
    .order("employee_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function createTrainingSchedule(input: TrainingScheduleInput) {
  const { error } = await (supabase as any).from("training_schedules").insert(input);
  if (error) throw error;
}

export async function updateTrainingSchedule(id: string, input: Partial<TrainingScheduleInput>) {
  const { error } = await (supabase as any).from("training_schedules").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteTrainingSchedule(id: string) {
  const { error } = await (supabase as any).from("training_schedules").delete().eq("id", id);
  if (error) throw error;
}
