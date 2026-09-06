import { employeesGateway } from "@/lib/backend/employees-gateway";

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
  updated_at?: string;
}

export type EmployeeForm = Pick<
  Employee,
  "full_name" | "matricula" | "sector" | "access_profile" | "status"
>;

export const SETORES = ["CFTV", "Vigilância", "Portaria", "Ronda", "Operações", "Administrativo"];
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
  return employeesGateway.list();
}

export async function createEmployee(form: EmployeeForm) {
  return employeesGateway.create(form);
}

export async function updateEmployee(id: string, form: Partial<EmployeeForm>) {
  return employeesGateway.update(id, form);
}

export async function deleteEmployee(id: string) {
  return employeesGateway.remove(id);
}
