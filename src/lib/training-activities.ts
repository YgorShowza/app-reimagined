import { supabase } from "@/integrations/supabase/client";
import { apiRequest, isSegempatApiConfigured } from "@/lib/backend/api-client";

export type TrainingActivityType = "Simulador" | "Stress Test" | "Desafio Diário" | "Teste Rápido";

export interface TrainingActivityAttempt {
  id: string;
  user_id: string;
  employee_id: string | null;
  employee_name: string;
  employee_matricula: string | null;
  employee_sector: string | null;
  activity_type: TrainingActivityType;
  activity_title: string;
  answers: unknown;
  score: number;
  max_score: number;
  passed: boolean;
  points_earned: number;
  activity_day: string | null;
  created_at: string;
}

export async function listMyTrainingActivities(): Promise<TrainingActivityAttempt[]> {
  if (isSegempatApiConfigured()) return apiRequest<TrainingActivityAttempt[]>("/api/me/training/activities");
  const { data, error } = await (supabase as any).from("training_activity_attempts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TrainingActivityAttempt[];
}

export async function submitTrainingActivity(input: {
  activityType: TrainingActivityType;
  activityTitle: string;
  answers: unknown;
  score?: number;
}) {
  if (isSegempatApiConfigured()) {
    return apiRequest<{
      success: boolean;
      attempt_id: string;
      score: number;
      passed: boolean;
      points_earned: number;
      new_points: number;
      level: number;
      activity_day?: string;
      already_rewarded_today?: boolean;
      correct_count?: number;
      question_count?: number;
    }>(`/api/me/training/activities/${encodeURIComponent(input.activityType)}/attempts`, {
      method: "POST",
      body: JSON.stringify({ activityTitle: input.activityTitle, answers: input.answers }),
    });
  }

  const { data, error } = await (supabase as any).rpc("submit_training_activity", {
    p_activity_type: input.activityType,
    p_activity_title: input.activityTitle,
    p_answers: input.answers,
    p_score: input.score ?? 0,
  });
  if (error) throw error;
  return data as {
    success: boolean;
    attempt_id: string;
    score: number;
    passed: boolean;
    points_earned: number;
    new_points: number;
    level: number;
    activity_day?: string;
    already_rewarded_today?: boolean;
    correct_count?: number;
    question_count?: number;
  };
}
