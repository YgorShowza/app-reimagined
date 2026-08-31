import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  UserRoundSearch, CheckCircle2, Clock3, Target, Award, ShieldCheck,
  ClipboardCheck, AlertTriangle, TrendingUp, CalendarClock,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getOperationalSnapshot } from "@/lib/insights";
import { formatDate } from "@/lib/cronograma";
import { listTrainingSchedules } from "@/lib/training";
import { listOccurrences, listPracticalEvaluations } from "@/lib/operations";

export const Route = createFileRoute("/_authenticated/individual")({
  head: () => ({ meta: [{ title: "Análise Individual · SEGEMPAT" }] }),
  component: IndividualPage,
});

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl ${className}`}
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}
    >
      {children}
    </section>
  );
}

function Metric({ label, value, icon: Icon, detail }: { label: string; value: string | number; icon: typeof Award; detail?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase font-black tracking-[.14em]" style={{ color: "var(--text-4)" }}>{label}</p>
          <p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{value}</p>
          {detail && <p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>{detail}</p>}
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
          <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
        </div>
      </div>
    </Card>
  );
}

function fmt(value?: string | null) {
  if (!value) return "—";
  return new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString("pt-BR");
}

function IndividualPage() {
  const year = new Date().getFullYear();
  const snapshot = useQuery({ queryKey: ["individual-snapshot", year], queryFn: () => getOperationalSnapshot(year) });
  const schedules = useQuery({ queryKey: ["training-schedules"], queryFn: listTrainingSchedules });
  const practical = useQuery({ queryKey: ["practical-evaluations"], queryFn: listPracticalEvaluations });
  const occurrences = useQuery({ queryKey: ["occurrences"], queryFn: listOccurrences });

  const employees = useMemo(
    () => (snapshot.data?.employees ?? []).filter((employee) => employee.status === "Ativo" && employee.access_profile !== "Inspetor"),
    [snapshot.data],
  );
  const [selected, setSelected] = useState("");
  const employee = employees.find((item) => item.id === selected) ?? employees[0];

  const cron = snapshot.data?.cronograma.filter((item) => item.employee_id === employee?.id) ?? [];
  const attempts = snapshot.data?.attempts.filter((attempt) => attempt.matricula === employee?.matricula) ?? [];
  const employeePractical = (practical.data ?? []).filter((item) => item.employee_id === employee?.id);
  const employeeOccurrences = (occurrences.data ?? []).filter((item) => item.employee_id === employee?.id || item.employee_matricula === employee?.matricula);
  const trainingSchedule = (schedules.data ?? []).find((item) => item.employee_id === employee?.id);

  const realized = cron.filter((item) => item.status === "Realizado").length;
  const pending = cron.filter((item) => item.status === "Pendente").length;
  const justified = cron.filter((item) => item.status === "Justificado").length;
  const executionRate = cron.length ? Math.round((realized / cron.length) * 100) : 0;
  const passed = attempts.filter((attempt) => attempt.passed).length;
  const failed = attempts.length - passed;
  const approvalRate = attempts.length ? Math.round((passed / attempts.length) * 100) : 0;
  const avg = attempts.length
    ? Math.round((attempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0) / attempts.length) * 10) / 10
    : 0;
  const openOccurrences = employeeOccurrences.filter((item) => item.status !== "Concluída").length;
  const practicalCompleted = employeePractical.filter((item) => item.status === "Concluída");
  const practicalAverage = practicalCompleted.length
    ? Math.round((practicalCompleted.reduce((sum, item) => sum + (Number(item.score || 0) / Number(item.max_score || 10)) * 10, 0) / practicalCompleted.length) * 10) / 10
    : 0;

  const overdue = cron.filter((item) => item.status === "Pendente" && (
    item.month < `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}` ||
    (!!item.planned_date && item.planned_date < new Date().toISOString().slice(0, 10))
  )).length;
  const riskScore = overdue * 3 + pending + failed * 2 + openOccurrences * 2;
  const riskLevel = riskScore >= 8 ? "Alto" : riskScore >= 4 ? "Médio" : riskScore > 0 ? "Baixo" : "Normal";
  const riskColor = riskLevel === "Alto" ? "#ef4444" : riskLevel === "Médio" ? "#f59e0b" : riskLevel === "Baixo" ? "#60a5fa" : "#10b981";

  if (snapshot.isLoading || schedules.isLoading || practical.isLoading || occurrences.isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <div className="relative overflow-hidden rounded-[1.5rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full" style={{ background: "radial-gradient(circle,rgba(200,16,46,.22),transparent 70%)" }} />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40"><UserRoundSearch className="w-4 h-4" /> Inteligência individual</div>
            <h1 className="mt-2 text-2xl md:text-3xl font-black text-white">Análise Individual</h1>
            <p className="mt-1 text-sm text-white/50">Desempenho, treinamentos, provas, ocorrências e risco em uma única ficha.</p>
          </div>
          {employee && (
            <div className="rounded-xl px-3 py-2 text-right" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}>
              <p className="text-[9px] uppercase tracking-[.15em] font-black text-white/35">Risco operacional</p>
              <p className="mt-1 text-sm font-black" style={{ color: riskColor }}>{riskLevel} · {riskScore} pts</p>
            </div>
          )}
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <label className="text-xs font-bold" style={{ color: "var(--text-4)" }}>Colaborador</label>
            <div className="mt-2 max-w-xl">
              <Select value={employee?.id || ""} onValueChange={setSelected}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{employees.map((item) => <SelectItem key={item.id} value={item.id}>{item.full_name} · {item.matricula} · {item.sector}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {employee && (
            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className="text-[10px] font-black px-2.5 py-1.5 rounded-full" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>Nível {employee.level ?? 0}</span>
              <span className="text-[10px] font-black px-2.5 py-1.5 rounded-full" style={{ color: "var(--text-3)", background: "var(--bg-surface-2)" }}>{employee.points ?? 0} pontos</span>
            </div>
          )}
        </div>
      </Card>

      {!employee ? (
        <Card className="p-10 text-center"><p style={{ color: "var(--text-3)" }}>Nenhum colaborador ativo cadastrado.</p></Card>
      ) : (
        <>
          <Card className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xl font-black" style={{ color: "var(--text-1)" }}>{employee.full_name}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Mat. {employee.matricula} · {employee.sector} · {employee.status}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center md:min-w-[330px]">
                <div className="rounded-xl p-3" style={{ background: "var(--bg-surface-2)" }}><p className="text-[9px] uppercase font-black" style={{ color: "var(--text-4)" }}>Execução</p><p className="mt-1 font-black" style={{ color: executionRate >= 80 ? "#10b981" : executionRate >= 50 ? "#f59e0b" : "var(--accent)" }}>{executionRate}%</p></div>
                <div className="rounded-xl p-3" style={{ background: "var(--bg-surface-2)" }}><p className="text-[9px] uppercase font-black" style={{ color: "var(--text-4)" }}>Aprovação</p><p className="mt-1 font-black" style={{ color: approvalRate >= 80 ? "#10b981" : approvalRate >= 50 ? "#f59e0b" : "var(--accent)" }}>{approvalRate}%</p></div>
                <div className="rounded-xl p-3" style={{ background: "var(--bg-surface-2)" }}><p className="text-[9px] uppercase font-black" style={{ color: "var(--text-4)" }}>Prática</p><p className="mt-1 font-black" style={{ color: "var(--text-1)" }}>{practicalAverage || "—"}</p></div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <Metric label="Planejados" value={cron.length} icon={Target} />
            <Metric label="Realizados" value={realized} icon={CheckCircle2} />
            <Metric label="Pendentes" value={pending} icon={Clock3} detail={`${overdue} atrasado(s)`} />
            <Metric label="Justificados" value={justified} icon={ShieldCheck} />
            <Metric label="Provas" value={attempts.length} icon={Award} detail={`média ${avg}`} />
            <Metric label="Ocorrências abertas" value={openOccurrences} icon={AlertTriangle} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="overflow-hidden lg:col-span-2">
              <div className="px-4 py-3 flex items-center justify-between" style={{ color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4" style={{ color: "var(--accent)" }} /><h2 className="font-bold text-sm">Ciclo e validade</h2></div>
                {trainingSchedule && <span className="text-[10px] font-black" style={{ color: trainingSchedule.status === "Em dia" ? "#10b981" : trainingSchedule.status === "Próximo ao vencimento" ? "#f59e0b" : "#ef4444" }}>{trainingSchedule.status}</span>}
              </div>
              <div className="p-4">
                {trainingSchedule ? (
                  <div className="grid sm:grid-cols-4 gap-3">
                    {[['Ciclo', `${trainingSchedule.cycle_days} dias`], ['Último treinamento', fmt(trainingSchedule.last_training_date)], ['Início da janela', fmt(trainingSchedule.window_start)], ['Vencimento', fmt(trainingSchedule.window_end)]].map(([label, value]) => (
                      <div key={label} className="rounded-xl p-3" style={{ background: "var(--bg-surface-2)" }}><p className="text-[9px] uppercase font-black" style={{ color: "var(--text-4)" }}>{label}</p><p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-1)" }}>{value}</p></div>
                    ))}
                  </div>
                ) : <p className="text-sm" style={{ color: "var(--text-4)" }}>Nenhum ciclo configurado para este colaborador.</p>}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4" style={{ color: riskColor }} /><h2 className="font-bold text-sm" style={{ color: "var(--text-1)" }}>Composição do risco</h2></div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between"><span style={{ color: "var(--text-4)" }}>Pendências</span><strong style={{ color: "var(--text-1)" }}>{pending}</strong></div>
                <div className="flex justify-between"><span style={{ color: "var(--text-4)" }}>Atrasos</span><strong style={{ color: overdue ? "#ef4444" : "var(--text-1)" }}>{overdue}</strong></div>
                <div className="flex justify-between"><span style={{ color: "var(--text-4)" }}>Reprovações</span><strong style={{ color: failed ? "#ef4444" : "var(--text-1)" }}>{failed}</strong></div>
                <div className="flex justify-between"><span style={{ color: "var(--text-4)" }}>Ocorrências abertas</span><strong style={{ color: openOccurrences ? "#f59e0b" : "var(--text-1)" }}>{openOccurrences}</strong></div>
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between" style={{ color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}><h2 className="font-bold text-sm">Cronograma</h2><span className="text-[10px] font-black" style={{ color: "var(--text-4)" }}>{cron.length} registro(s)</span></div>
              <div className="divide-y max-h-[430px] overflow-y-auto" style={{ borderColor: "var(--border)" }}>
                {cron.length ? cron.slice().sort((a, b) => (b.planned_date || "").localeCompare(a.planned_date || "")).map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex justify-between gap-3">
                      <div><p className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>{item.theme}</p><p className="text-xs mt-1" style={{ color: "var(--text-4)" }}>{formatDate(item.planned_date)}{item.exam_title ? ` · ${item.exam_title}` : ""}</p></div>
                      <span className="text-[10px] font-black" style={{ color: item.status === "Realizado" ? "#10b981" : item.status === "Pendente" ? "#f59e0b" : "#60a5fa" }}>{item.status}</span>
                    </div>
                  </div>
                )) : <p className="p-6 text-sm" style={{ color: "var(--text-4)" }}>Sem lançamentos.</p>}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between" style={{ color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}><h2 className="font-bold text-sm">Provas realizadas</h2><span className="text-[10px] font-black" style={{ color: "var(--text-4)" }}>{passed} aprovação(ões)</span></div>
              <div className="divide-y max-h-[430px] overflow-y-auto" style={{ borderColor: "var(--border)" }}>
                {attempts.length ? attempts.slice().sort((a, b) => b.finished_at.localeCompare(a.finished_at)).map((attempt) => (
                  <div key={attempt.id} className="p-4 flex justify-between gap-3">
                    <div><p className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>Nota {attempt.score}</p><p className="text-xs mt-1" style={{ color: "var(--text-4)" }}>{fmt(attempt.finished_at)}</p></div>
                    <span className="text-[10px] font-black" style={{ color: attempt.passed ? "#10b981" : "#ef4444" }}>{attempt.passed ? "APROVADO" : "REPROVADO"}</span>
                  </div>
                )) : <p className="p-6 text-sm" style={{ color: "var(--text-4)" }}>Sem tentativas.</p>}
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}><div className="flex items-center gap-2"><ClipboardCheck className="w-4 h-4" style={{ color: "var(--accent)" }} /><h2 className="font-bold text-sm" style={{ color: "var(--text-1)" }}>Avaliações práticas</h2></div><span className="text-[10px] font-black" style={{ color: "var(--text-4)" }}>{employeePractical.length}</span></div>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {employeePractical.slice(0, 8).map((item) => <div key={item.id} className="p-4 flex justify-between gap-3"><div><p className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>{item.title}</p><p className="text-xs mt-1" style={{ color: "var(--text-4)" }}>{fmt(item.evaluation_date)} · {item.status}</p></div><span className="text-xs font-black" style={{ color: item.status === "Concluída" ? "#10b981" : "#f59e0b" }}>{item.status === "Concluída" ? `${item.score}/${item.max_score}` : "—"}</span></div>)}
                {!employeePractical.length && <p className="p-6 text-sm" style={{ color: "var(--text-4)" }}>Sem avaliações práticas.</p>}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" style={{ color: "var(--accent)" }} /><h2 className="font-bold text-sm" style={{ color: "var(--text-1)" }}>Ocorrências</h2></div><span className="text-[10px] font-black" style={{ color: "var(--text-4)" }}>{employeeOccurrences.length}</span></div>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {employeeOccurrences.slice(0, 8).map((item) => <div key={item.id} className="p-4 flex justify-between gap-3"><div><p className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>{item.title}</p><p className="text-xs mt-1" style={{ color: "var(--text-4)" }}>{fmt(item.occurred_at)} · {item.category} · {item.severity}</p></div><span className="text-[10px] font-black" style={{ color: item.status === "Concluída" ? "#10b981" : item.status === "Em análise" ? "#f59e0b" : "#ef4444" }}>{item.status}</span></div>)}
                {!employeeOccurrences.length && <p className="p-6 text-sm" style={{ color: "var(--text-4)" }}>Sem ocorrências vinculadas.</p>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
