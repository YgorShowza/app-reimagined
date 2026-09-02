import { supabase } from "@/integrations/supabase/client";
import { apiRequest, isSegempatApiConfigured } from "./api-client";
import type { ExamAttempt } from "@/lib/exams";

export async function listAdminAttemptsByYear(year: number): Promise<ExamAttempt[]> {
  if (isSegempatApiConfigured()) {
    return apiRequest<ExamAttempt[]>(`/api/admin/exam-attempts?year=${encodeURIComponent(String(year))}`);
  }

  const start = `${year}-01-01T00:00:00-03:00`;
  const end = `${year + 1}-01-01T00:00:00-03:00`;
  const { data, error } = await supabase
    .from("exam_attempts")
    .select("*")
    .gte("finished_at", start)
    .lt("finished_at", end)
    .order("finished_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExamAttempt[];
}