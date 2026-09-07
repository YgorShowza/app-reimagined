import { supabase } from "@/integrations/supabase/client";
import { apiRequest, isSegempatApiConfigured } from "./api-client";

export interface GeneratedAccess {
  code: string;
  employee_id: string;
  employee_name: string;
  matricula: string;
  expires_at: string;
}

export interface ActivationCodeStatus {
  employee_id: string;
  employee_name: string;
  matricula: string;
  sector: string;
  expires_at: string | null;
  used_at: string | null;
  created_at: string | null;
  has_account: boolean;
  expired: boolean;
}

export async function listActivationCodes(): Promise<ActivationCodeStatus[]> {
  if (isSegempatApiConfigured()) {
    return apiRequest<ActivationCodeStatus[]>("/api/access/activation-codes");
  }

  const { data, error } = await (supabase as any).rpc("list_registration_access_status");
  if (error) throw new Error(error.message || "Não foi possível consultar os acessos");
  return (data ?? []).map((row: ActivationCodeStatus) => ({
    ...row,
    has_account: Boolean(row.has_account),
    expired: Boolean(row.expired),
  }));
}

export async function generateActivationCode(employeeId: string): Promise<GeneratedAccess> {
  if (isSegempatApiConfigured()) {
    return apiRequest<GeneratedAccess>(`/api/access/activation-codes/${encodeURIComponent(employeeId)}`, {
      method: "POST",
    });
  }

  const { data, error } = await (supabase as any).rpc("generate_registration_code", {
    p_employee_id: employeeId,
  });
  if (error) throw new Error(error.message || "Não foi possível gerar o código");
  return data as GeneratedAccess;
}

export async function revokeActivationCode(employeeId: string): Promise<void> {
  if (isSegempatApiConfigured()) {
    await apiRequest<void>(`/api/access/activation-codes/${encodeURIComponent(employeeId)}`, {
      method: "DELETE",
    });
    return;
  }

  const { error } = await (supabase as any).rpc("revoke_registration_code", {
    p_employee_id: employeeId,
  });
  if (error) throw new Error(error.message || "Não foi possível revogar o código");
}
