import { supabase } from "@/integrations/supabase/client";
import { apiRequest, isSegempatApiConfigured } from "@/lib/backend/api-client";

export interface ExamAttemptQuestionEvidence {
  id: string;
  order: number;
  type: string;
  statement: string;
  answer: string;
  correct: boolean;
}

export interface ExamAttemptEvidence {
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  employee_name: string;
  matricula: string | null;
  sector: string | null;
  score: number;
  passed: boolean;
  certificate_code: string | null;
  finished_at: string;
  signed_at: string | null;
  signature_name: string | null;
  total_questions: number;
  correct_count: number;
  accuracy_pct: number;
  questions: ExamAttemptQuestionEvidence[];
}

export async function getMyExamAttemptEvidence(attemptId: string): Promise<ExamAttemptEvidence> {
  if (isSegempatApiConfigured()) {
    return apiRequest<ExamAttemptEvidence>(`/api/me/exam-attempts/${encodeURIComponent(attemptId)}/evidence`);
  }

  const { data, error } = await (supabase as any).rpc("get_my_exam_attempt_evidence", { p_attempt_id: attemptId });
  if (error) throw error;
  return data as ExamAttemptEvidence;
}
