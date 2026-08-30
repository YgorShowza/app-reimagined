import { supabase } from "@/integrations/supabase/client";

export interface Employee {
  id: string;
  full_name: string;
  matricula: string;
  sector: string;
  access_profile: string;
  status: string;
  level: number;
  points: number;
  first_access: boolean;
  created_at: string;
}

export type EmployeeForm = Pick<
  Employee,
  "full_name" | "matricula" | "sector" | "access_profile" | "status"
>;

export const SETORES = ["CFTV", "Vigilância", "Portaria", "Ronda", "Administrativo"];
export const PERFIS = ["Operacional", "Inspetor"];
export const SITUACOES = ["Ativo", "Inativo"];

export const emptyEmployeeForm: EmployeeForm = {
  full_name: "",
  matricula: "",
  sector: "CFTV",
  access_profile: "Operacional",
  status: "Ativo",
};

export async function listEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Employee[];
}

export async function createEmployee(form: EmployeeForm) {
  const { error } = await supabase.from("employees").insert(form);
  if (error) throw error;
}

export async function updateEmployee(id: string, form: Partial<EmployeeForm>) {
  const { error } = await supabase.from("employees").update(form).eq("id", id);
  if (error) throw error;
}

export async function deleteEmployee(id: string) {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw error;
}
