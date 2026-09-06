import { getCurrentSessionUser } from "@/lib/backend/current-user-gateway";
import { listAdminAttemptsByYear } from "@/lib/backend/admin-attempts";
import { apiRequest, isSegempatApiConfigured } from "@/lib/backend/api-client";
import { listEmployees, type Employee } from "@/lib/employees";
import { listExams, type Exam, type ExamAttempt } from "@/lib/exams";
import { listCronogramaEntriesByYear, syncCronogramaWithExamAttempts, type CronogramaEntry } from "@/lib/cronograma";
import { operationalDate, operationalMonth, operationalYear } from "@/lib/operational-time";

export interface OperationalSnapshot {
  employees: Employee[];
  exams: Exam[];
  attempts: ExamAttempt[];
  cronograma: CronogramaEntry[];
}

function normalizeMatricula(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

export async function getOperationalSnapshot(year = operationalYear()): Promise<OperationalSnapshot> {
  if (isSegempatApiConfigured()) {
    const currentUser = await getCurrentSessionUser();
    if (currentUser?.isAdmin) {
      await syncCronogramaWithExamAttempts();
    }
  }

  const [employees, exams, rawAttempts, rawCronograma] = await Promise.all([
    listEmployees(),
    listExams(),
    listAdminAttemptsByYear(year),
    listCronogramaEntriesByYear(year),
  ]);

  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const employeeByMatricula = new Map(
    employees
      .map((employee) => [normalizeMatricula(employee.matricula), employee] as const)
      .filter(([matricula]) => Boolean(matricula)),
  );

  const attempts = rawAttempts.map((attempt) => {
    if (!attempt.matricula) return attempt;
    const employee = employeeByMatricula.get(normalizeMatricula(attempt.matricula));
    return employee && employee.matricula !== attempt.matricula ? { ...attempt, matricula: employee.matricula } : attempt;
  });

  const cronograma = rawCronograma.map((entry) => {
    const employee = employeeById.get(entry.employee_id) ?? employeeByMatricula.get(normalizeMatricula(entry.employee_matricula));
    if (!employee) return entry;
    if (
      entry.employee_id === employee.id &&
      entry.employee_name === employee.full_name &&
      entry.employee_matricula === employee.matricula &&
      entry.employee_sector === employee.sector
    ) {
      return entry;
    }
    return {
      ...entry,
      employee_id: employee.id,
      employee_name: employee.full_name,
      employee_matricula: employee.matricula,
      employee_sector: employee.sector,
    };
  });

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
  return { activeEmployees: activeEmployees.length, publishedExams: publishedExams.length, attempts: data.attempts.length, passed: passed.length, approvalRate, averageScore, planned: data.cronograma.length, realized: realized.length, pending: pending.length, justified: justified.length, executionRate };
}

export function sectorMetrics(data: OperationalSnapshot) {
  type Stats = { employeeIds: Set<string>; planned: number; realized: number; attempts: number; passed: number };
  const stats = new Map<string, Stats>();
  const employeeSectorById = new Map<string, string>();
  const sectorByMatricula = new Map<string, string>();
  for (const employee of data.employees) {
    if (employee.status !== "Ativo" || employee.access_profile === "Inspetor") continue;
    const sector = employee.sector;
    const current = stats.get(sector) ?? { employeeIds: new Set<string>(), planned: 0, realized: 0, attempts: 0, passed: 0 };
    current.employeeIds.add(employee.id); stats.set(sector, current); employeeSectorById.set(employee.id, sector); sectorByMatricula.set(normalizeMatricula(employee.matricula), sector);
  }
  for (const entry of data.cronograma) {
    const sector = stats.has(entry.employee_sector) ? entry.employee_sector : employeeSectorById.get(entry.employee_id);
    if (!sector) continue; const current = stats.get(sector); if (!current) continue; current.planned += 1; if (entry.status === "Realizado") current.realized += 1;
  }
  for (const attempt of data.attempts) {
    if (!attempt.matricula) continue; const sector = sectorByMatricula.get(normalizeMatricula(attempt.matricula)); if (!sector) continue; const current = stats.get(sector); if (!current) continue; current.attempts += 1; if (attempt.passed) current.passed += 1;
  }
  return Array.from(stats.entries()).sort(([a],[b]) => a.localeCompare(b,"pt-BR")).map(([sector,current]) => ({ sector, employees: current.employeeIds.size, planned: current.planned, realized: current.realized, executionRate: current.planned ? Math.round((current.realized/current.planned)*100) : 0, attempts: current.attempts, approvalRate: current.attempts ? Math.round((current.passed/current.attempts)*100) : 0 }));
}

export function monthlyExecution(data: OperationalSnapshot, year = operationalYear()) {
  const months = new Map<string,{planned:number;realized:number;pending:number}>();
  for (let i=1;i<=12;i+=1) months.set(`${year}-${String(i).padStart(2,"0")}`,{planned:0,realized:0,pending:0});
  for (const entry of data.cronograma) { const current = months.get(entry.month); if (!current) continue; current.planned += 1; if (entry.status === "Realizado") current.realized += 1; if (entry.status === "Pendente") current.pending += 1; }
  return Array.from({length:12},(_,i)=>{ const month=`${year}-${String(i+1).padStart(2,"0")}`; const current=months.get(month) ?? {planned:0,realized:0,pending:0}; return {month,label:new Date(year,i,1).toLocaleDateString("pt-BR",{month:"short"}).replace(".",""),planned:current.planned,realized:current.realized,pending:current.pending,rate:current.planned?Math.round((current.realized/current.planned)*100):0}; });
}

export function employeeRisk(data: OperationalSnapshot) {
  const nowMonth = operationalMonth(); const today = operationalDate(); const activeEmployees = data.employees.filter((e)=>e.status === "Ativo" && e.access_profile !== "Inspetor");
  const byId = new Map(activeEmployees.map((employee)=>[employee.id,{pending:0,overdue:0,failed:0}])); const idByMatricula = new Map(activeEmployees.map((employee)=>[normalizeMatricula(employee.matricula),employee.id]));
  for (const entry of data.cronograma) { if (entry.status !== "Pendente") continue; const current=byId.get(entry.employee_id); if (!current) continue; current.pending += 1; if (entry.month < nowMonth || (entry.planned_date && entry.planned_date < today)) current.overdue += 1; }
  for (const attempt of data.attempts) { if (attempt.passed || !attempt.matricula) continue; const employeeId=idByMatricula.get(normalizeMatricula(attempt.matricula)); if (!employeeId) continue; const current=byId.get(employeeId); if (current) current.failed += 1; }
  return activeEmployees.map((employee)=>{ const current=byId.get(employee.id) ?? {pending:0,overdue:0,failed:0}; const score=current.overdue*3+current.pending+current.failed*2; const level=score>=8?"Alto":score>=4?"Médio":score>0?"Baixo":"Normal"; return {employee,pending:current.pending,overdue:current.overdue,failed:current.failed,score,level}; }).sort((a,b)=>b.score-a.score || a.employee.full_name.localeCompare(b.employee.full_name,"pt-BR"));
}

export async function getCurrentEmployeeByAuth() {
  if (isSegempatApiConfigured()) return apiRequest<Employee>("/api/employees/me");

  const user = await getCurrentSessionUser();
  if (!user?.matricula) return null;
  const employees = await listEmployees();
  return employees.find((employee) => normalizeMatricula(employee.matricula) === normalizeMatricula(user.matricula)) ?? null;
}
