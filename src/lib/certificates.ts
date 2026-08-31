import { supabase } from "@/integrations/supabase/client";

export interface CertificateRecord {
  id: string;
  attempt_id: string;
  user_id: string;
  matricula: string | null;
  employee_name: string;
  exam_id: string;
  exam_title: string;
  score: number;
  verification_code: string;
  issued_at: string;
  revoked: boolean;
}

export interface CertificateValidation {
  is_valid: boolean;
  employee_name: string;
  exam_title: string;
  score: number;
  issued_at: string;
  verification_code: string;
}

export async function listMyCertificates(): Promise<CertificateRecord[]> {
  const { data, error } = await (supabase as any)
    .from("certificates")
    .select("id,attempt_id,user_id,matricula,employee_name,exam_id,exam_title,score,verification_code,issued_at,revoked")
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ ...row, score: Number(row.score || 0) })) as CertificateRecord[];
}

export async function validateCertificateCode(code: string): Promise<CertificateValidation | null> {
  const normalized = code.trim();
  if (!normalized) return null;
  const { data, error } = await (supabase as any).rpc("validate_certificate", { p_code: normalized });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return { ...row, score: Number(row.score || 0) } as CertificateValidation;
}
