import { apiRequest } from "./api-client";

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

export function listActivationCodes(): Promise<ActivationCodeStatus[]> {
  return apiRequest<ActivationCodeStatus[]>("/api/access/activation-codes");
}

export function generateActivationCode(employeeId: string): Promise<GeneratedAccess> {
  return apiRequest<GeneratedAccess>(`/api/access/activation-codes/${encodeURIComponent(employeeId)}`, {
    method: "POST",
  });
}

export async function revokeActivationCode(employeeId: string): Promise<void> {
  await apiRequest<void>(`/api/access/activation-codes/${encodeURIComponent(employeeId)}`, {
    method: "DELETE",
  });
}
