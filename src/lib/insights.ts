import { supabase } from "@/integrations/supabase/client";
import { listEmployees, type Employee } from "@/lib/employees";
import { listExams, listMyAttempts, type Exam, type ExamAttempt } from "@/lib/exams";
import { listCronogramaEntriesByYear, currentMonthStr, type CronogramaEntry } from "@/lib/cronograma";

export interface OperationalSnapshot {
  employees: Employee[];
  exams: Exam[];
  attempts: ExamAttempt[];
  cronograma: CronogramaEntry[];
}

export async function getOperationalSnapshot(year = new Date().getFullYear()): Promise<OperationalSnapshot> {
  const [employees, exams, attempts, cronograma] = await Promise.all([
    listEmployees(),
    listExams(),
    listMyAttempts(),
    listCronogramaEntriesByYear(year),
  ]);
  return { employees, exams, attempts, cronograma };
}

export function snapshotMetrics(data: OperationalSnapshot) {
  const activeEmployees = data.employees.filter((e) => e.status === "Ativo" && e.access_profile !== "Inspetor");
  const publishedExams = data.exams.filter((e) => e.status === "Publicada");
  const passed = data.attempts.filter((a) => a.passed);
  const approvalRate = data.attempts.length ? Math.round((passed.length / data.attempts.length) * 100) : 0;
  const averageScore = data.attempts.length ? Math.round((data.attempts.reduce((s, a) => s + Number(a.score || 0), 0) / data.attempts.length) * 10) / 10 : 0;
  const realized = data.cronograma.filter((e) => e.status === "Realizado");
  const pending = data.cronograma.filter((e) => e.status === "Pendente");
  const justified = data.cronograma.filter((e) => e.status === "Justificado");
  const executionRate = data.cronograma.length ? Math.round((realized.length / data.cronograma.length) * 100) : 0;
  return {
    activeEmployees: activeEmployees.length,
    publishedExams: publishedExams.length,
    attempts: data.attempts.length,
    passed: passed.length,
    approvalRate,
    averageScore,
    planned: data.cronograma.length,
    realized: realized.length,
    pending: pending.length,
    justified: justified.length,
    executionRate,
  };
}

export function sectorMetrics(data: OperationalSnapshot) {
  const sectors = Array.from(new Set(data.employees.filter((e) => e.status === "Ativo" && e.access_profile !== "Inspetor").map((e) => e.sector))).sort();
  return sectors.map((sector) => {
    const employeeIds = new Set(data.employees.filter((e) => e.sector === sector).map((e) => e.id));
    const matriculas = new Set(data.employees.filter((e) => e.sector === sector).map((e) => e.matricula));
    const rows = data.cronograma.filter((e) => e.employee_sector === sector || employeeIds.has(e.employee_id));
    const attempts = data.attempts.filter((a) => a.matricula && matriculas.has(a.matricula));
    const realized = rows.filter((e) => e.status === "Realizado").length;
    const passed = attempts.filter((a) => a.passed).length;
    return {
      sector,
      employees: employeeIds.size,
      planned: rows.length,
      realized,
      executionRate: rows.length ? Math.round((realized / rows.length) * 100) : 0,
      attempts: attempts.length,
      approvalRate: attempts.length ? Math.round((passed / attempts.length) * 100) : 0,
    };
  });
}

export function monthlyExecution(data: OperationalSnapshot, year = new Date().getFullYear()) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    const rows = data.cronograma.filter((e) => e.month === month);
    const realized = rows.filter((e) => e.status === "Realizado").length;
    return {
      month,
      label: new Date(year, i, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      planned: rows.length,
      realized,
      pending: rows.filter((e) => e.status === "Pendente").length,
      rate: rows.length ? Math.round((realized / rows.length) * 100) : 0,
    };
  });
}

export function employeeRisk(data: OperationalSnapshot) {
  const nowMonth = currentMonthStr();
  return data.employees
    .filter((e) => e.status === "Ativo" && e.access_profile !== "Inspetor")
    .map((employee) => {
      const pending = data.cronograma.filter((c) => c.employee_id === employee.id && c.status === "Pendente");
      const overdue = pending.filter((c) => c.month < nowMonth || (c.planned_date && c.planned_date < new Date().toISOString().slice(0, 10))).length;
      const attempts = data.attempts.filter((a) => a.matricula === employee.matricula);
      const failed = attempts.filter((a) => !a.passed).length;
      const score = overdue * 3 + pending.length + failed * 2;
      const level = score >= 8 ? "Alto" : score >= 4 ? "Médio" : score > 0 ? "Baixo" : "Normal";
      return { employee, pending: pending.length, overdue, failed, score, level };
    })
    .sort((a, b) => b.score - a.score || a.employee.full_name.localeCompare(b.employee.full_name));
}

export async function getCurrentEmployeeByAuth() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await (supabase as any).from("profiles").select("matricula,nome").eq("id", auth.user.id).maybeSingle();
  if (!profile?.matricula) return null;
  const { data: employee } = await (supabase as any).from("employees").select("*").eq("matricula", profile.matricula).maybeSingle();
  return employee as Employee | null;
}
