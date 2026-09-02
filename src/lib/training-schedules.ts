import { supabase } from "@/integrations/supabase/client";
import { apiRequest, isSegempatApiConfigured } from "@/lib/backend/api-client";

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

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }

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
  const window = schedule.window_end ? { window_start: schedule.window_start, window_end: schedule.window_end } : calculateTrainingWindow(schedule.last_training_date, schedule.cycle_days);
  if (!window.window_end) return "Vencido";
  const today = isoDate(now);
  if (today > window.window_end) return "Vencido";
  if (window.window_start && today >= window.window_start) return "Próximo ao vencimento";
  return "Em dia";
}

function normalize(row: TrainingSchedule): TrainingSchedule { return { ...row, status: deriveTrainingStatus(row) }; }

export async function listTrainingSchedules(): Promise<TrainingSchedule[]> {
  if (isSegempatApiConfigured()) return (await apiRequest<TrainingSchedule[]>("/api/admin/training/schedules")).map(normalize);
  const { data, error } = await (supabase as any).from("training_schedules").select("*").order("employee_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function createTrainingSchedule(input: TrainingScheduleInput) {
  if (isSegempatApiConfigured()) {
    await apiRequest<{ id: string }>("/api/admin/training/schedules", { method: "POST", body: JSON.stringify(input) });
    return;
  }
  const { error } = await (supabase as any).from("training_schedules").insert(input);
  if (error) throw error;
}

export async function updateTrainingSchedule(id: string, input: Partial<TrainingScheduleInput>) {
  if (isSegempatApiConfigured()) {
    await apiRequest<void>(`/api/admin/training/schedules/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
    return;
  }
  const { error } = await (supabase as any).from("training_schedules").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteTrainingSchedule(id: string) {
  if (isSegempatApiConfigured()) {
    await apiRequest<void>(`/api/admin/training/schedules/${encodeURIComponent(id)}`, { method: "DELETE" });
    return;
  }
  const { error } = await (supabase as any).from("training_schedules").delete().eq("id", id);
  if (error) throw error;
}

export async function getMyTrainingSchedule(): Promise<TrainingSchedule | null> {
  if (isSegempatApiConfigured()) {
    const row = await apiRequest<TrainingSchedule | null>("/api/me/training/schedule");
    return row ? normalize(row) : null;
  }
  return null;
}
