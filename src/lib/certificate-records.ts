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
  certificate_revoked: boolean;
  revoked_at: string | null;
  revoked_reason: string | null;
  formally_issued: boolean;
};

function normalizedMatricula(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export async function listCertificateRecords(): Promise<CertificateRecord[]> {
  if (isSegempatApiConfigured()) {
    return apiRequest<CertificateRecord[]>("/api/admin/exam-attempts");
  }

  const client = supabase as any;
  const [
    { data: attempts, error: attemptsError },
    { data: exams, error: examsError },
    { data: employees, error: employeesError },
    { data: certificates, error: certificatesError },
  ] = await Promise.all([
    client
      .from("exam_attempts")
      .select("id, exam_id, user_id, matricula, score, passed, certificate_code, signature_path, signature_name, signature_agreed, signed_at, finished_at, created_at")
      .eq("passed", true)
      .not("certificate_code", "is", null)
      .order("finished_at", { ascending: false }),
    client.from("exams").select("id, title, exam_type"),
    client.from("employees").select("id, full_name, matricula, sector"),
    client.from("certificates").select("attempt_id, verification_code, revoked, revoked_at, revoked_reason"),
  ]);

  if (attemptsError) throw attemptsError;
  if (examsError) throw examsError;
  if (employeesError) throw employeesError;
  if (certificatesError) throw certificatesError;

  const examMap = new Map((exams ?? []).map((row: any) => [row.id, row]));
  const employeeByMatricula = new Map((employees ?? []).map((row: any) => [normalizedMatricula(row.matricula), row]));
  const certificateByAttempt = new Map((certificates ?? []).map((row: any) => [row.attempt_id, row]));

  return (attempts ?? []).map((attempt: any) => {
    const exam: any = examMap.get(attempt.exam_id);
    const employee: any = employeeByMatricula.get(normalizedMatricula(attempt.matricula));
    const certificate: any = certificateByAttempt.get(attempt.id);
    const certificateRevoked = Boolean(certificate?.revoked);
    const formallyIssued = Boolean(
      attempt.passed &&
      attempt.certificate_code &&
      attempt.signature_agreed &&
      attempt.signature_path &&
      attempt.signed_at &&
      certificate &&
      certificate.verification_code === attempt.certificate_code &&
      !certificateRevoked,
    );
    return {
      ...attempt,
      score: Number(attempt.score ?? 0),
      passed: Boolean(attempt.passed),
      signature_agreed: Boolean(attempt.signature_agreed),
      exam_title: exam?.title ?? "Avaliação",
      exam_type: exam?.exam_type ?? "—",
      employee_name: employee?.full_name ?? attempt.signature_name ?? attempt.matricula ?? "Colaborador",
      employee_sector: employee?.sector ?? "—",
      certificate_revoked: certificateRevoked,
      revoked_at: certificate?.revoked_at ?? null,
      revoked_reason: certificate?.revoked_reason ?? null,
      formally_issued: formallyIssued,
    } as CertificateRecord;
  });
}
