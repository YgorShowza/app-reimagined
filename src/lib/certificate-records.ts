import { supabase } from "@/integrations/supabase/client";
import { apiRequest, isSegempatApiConfigured } from "@/lib/backend/api-client";

export type CertificateRecord = {
  id: string;
  exam_id: string;
  user_id: string;
  matricula: string | null;
  score: number;
  passed: boolean;
  certificate_code: string | null;
  signature_path: string | null;
  signature_name: string | null;
  signature_agreed: boolean;
  signed_at: string | null;
  finished_at: string;
  created_at: string;
  exam_title: string;
  exam_type: string;
  employee_name: string;
  employee_sector: string;
  formally_issued: boolean;
};

export async function listCertificateRecords(): Promise<CertificateRecord[]> {
  if (isSegempatApiConfigured()) {
    return apiRequest<CertificateRecord[]>("/api/admin/exam-attempts");
  }

  const client = supabase as any;
  const [{ data: attempts, error: attemptsError }, { data: exams, error: examsError }, { data: employees, error: employeesError }] = await Promise.all([
    client
      .from("exam_attempts")
      .select("id, exam_id, user_id, matricula, score, passed, certificate_code, signature_path, signature_name, signature_agreed, signed_at, finished_at, created_at")
      .eq("passed", true)
      .not("certificate_code", "is", null)
      .order("finished_at", { ascending: false }),
    client.from("exams").select("id, title, exam_type"),
    client.from("employees").select("id, full_name, matricula, sector"),
  ]);

  if (attemptsError) throw attemptsError;
  if (examsError) throw examsError;
  if (employeesError) throw employeesError;

  const examMap = new Map((exams ?? []).map((row: any) => [row.id, row]));
  const employeeById = new Map((employees ?? []).map((row: any) => [row.id, row]));
  const employeeByMatricula = new Map((employees ?? []).map((row: any) => [row.matricula, row]));

  return (attempts ?? []).map((attempt: any) => {
    const exam: any = examMap.get(attempt.exam_id);
    const employee: any = employeeById.get(attempt.user_id) ?? (attempt.matricula ? employeeByMatricula.get(attempt.matricula) : undefined);
    const formallyIssued = Boolean(attempt.signature_agreed && attempt.signature_path && attempt.signed_at);
    return {
      ...attempt,
      score: Number(attempt.score ?? 0),
      passed: Boolean(attempt.passed),
      signature_agreed: Boolean(attempt.signature_agreed),
      exam_title: exam?.title ?? "Avaliação",
      exam_type: exam?.exam_type ?? "—",
      employee_name: employee?.full_name ?? "Colaborador",
      employee_sector: employee?.sector ?? "—",
      formally_issued: formallyIssued,
    } as CertificateRecord;
  });
}
