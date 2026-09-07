import { apiRequest } from "./api-client";
import type { ExamAttempt } from "@/lib/exams";

export function listAdminAttemptsByYear(year: number): Promise<ExamAttempt[]> {
  return apiRequest<ExamAttempt[]>(`/api/admin/exam-attempts?year=${encodeURIComponent(String(year))}`);
}
