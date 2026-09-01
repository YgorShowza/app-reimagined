import { supabase } from "@/integrations/supabase/client";

export type QuestionType = "Múltipla escolha" | "Discursiva";

export interface ExamQuestion {
  id: string;
  type: QuestionType;
  statement: string;
  options: string[];
  correct_index: number;
  model_answer?: string;
  points: number;
}

export interface AttemptExamQuestion {
  id: string;
  type: QuestionType;
  statement: string;
  options: string[];
  points: number;
}

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  exam_type: string;
  target_sector: string;
  min_approval_pct: number;
  scheduled_date: string | null;
  status: string;
  questions: ExamQuestion[];
  question_count?: number;
  created_at: string;
}

export interface AttemptExam {
  id: string;
  title: string;
  description: string | null;
  exam_type: string;
  target_sector: string;
  min_approval_pct: number;
  scheduled_date: string | null;
  status: string;
  questions: AttemptExamQuestion[];
  created_at: string;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  user_id: string;
  matricula: string | null;
  score: number;
  passed: boolean;
  certificate_code: string | null;
  signature_path: string | null;
  signature_name: string | null;
  signed_at: string | null;
  signature_agreed: boolean;
  finished_at: string;
  created_at: string;
}

export const EXAM_TYPES = ["Múltipla escolha", "Discursiva", "Mista"];
export const EXAM_STATUS = ["Rascunho", "Publicada"];
export const TARGET_SECTORS = ["Todos", "CFTV", "Vigilância", "Portaria", "Ronda", "Administrativo"];

export interface ExamForm {
  title: string;
  description: string;
  exam_type: string;
  target_sector: string;
  min_approval_pct: number;
  scheduled_date: string;
  status: string;
  questions: ExamQuestion[];
}

export const emptyQuestion = (): ExamQuestion => ({ id: crypto.randomUUID(), type: "Múltipla escolha", statement: "", options: ["", "", "", ""], correct_index: 0, points: 1 });
export const emptyExamForm = (): ExamForm => ({ title: "", description: "", exam_type: "Múltipla escolha", target_sector: "Todos", min_approval_pct: 70, scheduled_date: new Date().toISOString().slice(0, 10), status: "Rascunho", questions: [emptyQuestion()] });

function normalize(row: Record<string, unknown>): Exam {
  return { ...(row as unknown as Exam), questions: Array.isArray(row["questions"]) ? (row["questions"] as ExamQuestion[]) : [] };
}

function normalizeAttemptExam(row: Record<string, unknown>): AttemptExam {
  return { ...(row as unknown as AttemptExam), questions: Array.isArray(row["questions"]) ? (row["questions"] as AttemptExamQuestion[]) : [] };
}

export async function listExams(): Promise<Exam[]> {
  const { data, error } = await (supabase as any).rpc("list_exams_admin");
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => normalize(r));
}

export async function listAvailableExams(): Promise<Exam[]> {
  const { data, error } = await (supabase as any).rpc("list_available_exams");
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({ ...(row as unknown as Exam), questions: [], question_count: Number(row["question_count"] || 0) }));
}

export async function getExam(id: string): Promise<Exam> {
  const { data, error } = await (supabase as any).rpc("get_exam_admin", { p_exam_id: id });
  if (error) throw error;
  return normalize(data as Record<string, unknown>);
}

export async function getExamForAttempt(id: string): Promise<AttemptExam> {
  const { data, error } = await (supabase as any).rpc("get_exam_for_attempt", { p_exam_id: id });
  if (error) throw error;
  return normalizeAttemptExam(data as Record<string, unknown>);
}

export async function createExam(form: ExamForm) {
  const { error } = await (supabase as any).rpc("create_exam_admin", {
    p_input: {
      ...form,
      description: form.description || null,
      scheduled_date: form.scheduled_date || null,
      questions: form.questions,
    },
  });
  if (error) throw error;
}

export async function updateExam(id: string, form: Partial<ExamForm>) {
  const patch: Record<string, unknown> = { ...form };
  if (form.questions) patch["questions"] = form.questions;
  const { error } = await (supabase as any).rpc("update_exam_admin", { p_id: id, p_patch: patch });
  if (error) throw error;
}

export async function deleteExam(id: string) {
  const { error } = await (supabase as any).rpc("delete_exam_admin", { p_id: id });
  if (error) throw error;
}

export async function listMyAttempts(): Promise<ExamAttempt[]> {
  const { data, error } = await supabase.from("exam_attempts").select("*").order("finished_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExamAttempt[];
}

export async function listAttemptsByYear(year: number): Promise<ExamAttempt[]> {
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

type SaveAttemptInput = {
  exam_id: string;
  answers: unknown;
  user_id?: string;
  matricula?: string | null;
  score?: number;
  passed?: boolean;
};

export async function saveAttempt(input: SaveAttemptInput): Promise<ExamAttempt> {
  const { data, error } = await (supabase as any).rpc("submit_exam_attempt", {
    p_exam_id: input.exam_id,
    p_answers: input.answers ?? {},
  });
  if (error) throw error;
  return data as ExamAttempt;
}

export async function signAttempt(input: { attemptId: string; userId: string; signerName: string; pngBlob: Blob; }) {
  const path = `${input.userId}/${input.attemptId}.png`;
  const upload = await supabase.storage.from("exam-signatures").upload(path, input.pngBlob, { contentType: "image/png", upsert: true });
  if (upload.error) throw upload.error;
  const { data, error } = await (supabase as any).rpc("sign_exam_attempt", {
    p_attempt_id: input.attemptId,
    p_signature_path: path,
    p_signature_name: input.signerName,
  });
  if (error) throw error;
  return data as ExamAttempt;
}

export async function getSignatureUrl(path: string, expiresIn = 300) {
  const { data, error } = await supabase.storage.from("exam-signatures").createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Maceio", day: "2-digit", month: "2-digit", year: "2-digit" });
}
