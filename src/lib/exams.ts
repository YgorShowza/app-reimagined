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

export async function listExams(): Promise<Exam[]> {
  const { data, error } = await supabase.from("exams").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => normalize(r as Record<string, unknown>));
}

export async function getExam(id: string): Promise<Exam> {
  const { data, error } = await supabase.from("exams").select("*").eq("id", id).single();
  if (error) throw error;
  return normalize(data as Record<string, unknown>);
}

export async function createExam(form: ExamForm) {
  const { error } = await supabase.from("exams").insert({ ...form, description: form.description || null, scheduled_date: form.scheduled_date || null, questions: form.questions as unknown as never });
  if (error) throw error;
}

export async function updateExam(id: string, form: Partial<ExamForm>) {
  const patch: Record<string, unknown> = { ...form };
  if (form.questions) patch["questions"] = form.questions;
  const { error } = await supabase.from("exams").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function deleteExam(id: string) {
  const { error } = await supabase.from("exams").delete().eq("id", id);
  if (error) throw error;
}

export async function listMyAttempts(): Promise<ExamAttempt[]> {
  const { data, error } = await supabase.from("exam_attempts").select("*").order("finished_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExamAttempt[];
}

export async function saveAttempt(input: { exam_id: string; user_id: string; matricula: string | null; score: number; passed: boolean; answers: unknown; }): Promise<ExamAttempt> {
  // score, passed, user_id e matrícula enviados pelo cliente são intencionalmente
  // ignorados. O banco identifica o usuário autenticado, valida setor/prova publicada
  // e corrige as respostas antes de persistir a tentativa.
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
