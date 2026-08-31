import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Award, CalendarClock, CheckCircle2, FileText, Shield, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listEmployees } from "@/lib/employees";
import { fmtDate, listExams, listMyAttempts } from "@/lib/exams";
import { listTrainingSchedules } from "@/lib/training-schedules";
import { useCurrentUser } from "@/lib/useCurrentUser";

const LEVEL_NAMES = ["Recruta", "Patrulheiro", "Sentinela", "Especialista", "Elite"];
const LEVEL_ICONS = ["🎯", "🛡️", "⚡", "🔥", "👑"];

export function MyProfileWorkspace() {
  const { data: user } = useCurrentUser();
  const employees = useQuery({ queryKey: ["employees-profile"], queryFn: listEmployees });
  const attempts = useQuery({ queryKey: ["exam-attempts-my"], queryFn: listMyAttempts });
  const exams = useQuery({ queryKey: ["exams"], queryFn: listExams });
  const cycles = useQuery({ queryKey: ["training-schedules"], queryFn: listTrainingSchedules });

  const employee = useMemo(
    () => (employees.data ?? []).find((item) => item.matricula === user?.matricula),
    [employees.data, user?.matricula],
  );
  const examMap = useMemo(() => new Map((exams.data ?? []).map((exam) => [exam.id, exam.title])), [exams.data]);
  const rows = attempts.data ?? [];
  const passed = rows.filter((row) => row.passed).length;
  const average = rows.length ? rows.reduce((sum, row) => sum + Number(row.score || 0), 0) / rows.length : 0;
  const cycle = (cycles.data ?? []).find((item) => item.employee_id === employee?.id);
  const level = Math.min(5, Math.max(1, Number(employee?.level || 1)));
  const loading = employees.isLoading || attempts.isLoading;

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-9 w-9 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-[1.6rem] p-5 md:p-7" style={{ background: "linear-gradient(135deg,#171118 0%,#2b0b13 52%,#111216 100%)", border: "1px solid rgba(200,16,46,.28)", boxShadow: "0 12px 36px rgba(0,0,0,.16)" }}>
        <div className="absolute -right-14 -top-20 h-56 w-56 rounded-full" style={{ background: "radial-gradient(circle,rgba(200,16,46,.22),transparent 70%)" }} />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white" style={{ background: "linear-gradient(135deg,#C8102E,#f7931e)", boxShadow: "0 6px 18px rgba(200,16,46,.3)" }}>{employee?.full_name?.charAt(0) || user?.nome?.charAt(0) || "U"}</div>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.2em] text-white/35">Meu perfil</p><h1 className="mt-1 truncate text-2xl font-black text-white md:text-3xl">{employee?.full_name || user?.nome || "Operador"}</h1><p className="mt-1 text-sm text-white/50">Mat. {employee?.matricula || user?.matricula || "—"}{employee?.sector ? ` · ${employee.sector}` : ""}</p></div>
          </div>
          <div className="rounded-2xl px-4 py-3 text-right" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)" }}><p className="text-[10px] font-black uppercase tracking-widest text-white/35">Nível</p><p className="mt-1 text-lg font-black text-white">{LEVEL_ICONS[level - 1]} {LEVEL_NAMES[level - 1]}</p><p className="text-xs text-white/45">{Number(employee?.points || 0).toLocaleString("pt-BR")} pontos</p></div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Avaliações" value={rows.length} icon={FileText} color="#60a5fa" />
        <Metric label="Aprovações" value={passed} icon={CheckCircle2} color="#10b981" />
        <Metric label="Média" value={average.toFixed(1)} icon={TrendingUp} color="#f59e0b" />
        <Metric label="Ciclo" value={cycle?.status || "—"} icon={CalendarClock} color={cycle?.status === "Vencido" ? "#ef4444" : cycle?.status === "Próximo ao vencimento" ? "#f59e0b" : "#10b981"} compact />
      </div>

      <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
        <div className="flex flex-wrap items-center gap-2"><Button asChild variant="outline"><Link to="/progresso"><TrendingUp className="mr-2 h-4 w-4" /> Meu progresso</Link></Button><Button asChild variant="outline"><Link to="/certificados"><Award className="mr-2 h-4 w-4" /> Certificados</Link></Button><Button asChild variant="outline"><Link to="/treinamentos"><Shield className="mr-2 h-4 w-4" /> Treinamentos</Link></Button></div>
      </section>

      <section className="overflow-hidden rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: "var(--bg-surface-2)", borderBottom: "1px solid var(--border)" }}><User className="h-4 w-4" style={{ color: "var(--accent)" }} /><h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Histórico de provas</h2><span className="ml-auto text-xs" style={{ color: "var(--text-4)" }}>{rows.length} registro(s)</span></div>
        {rows.length === 0 ? <div className="p-10 text-center"><p className="text-sm" style={{ color: "var(--text-4)" }}>Nenhuma prova realizada ainda.</p></div> : <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>{rows.slice(0, 20).map((row) => <div key={row.id} className="flex items-center gap-3 px-4 py-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: row.passed ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)", color: row.passed ? "#10b981" : "#ef4444" }}>{row.passed ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold" style={{ color: "var(--text-1)" }}>{examMap.get(row.exam_id) || "Avaliação"}</p><p className="text-[11px]" style={{ color: "var(--text-4)" }}>{fmtDate(row.finished_at || row.created_at)}</p></div><div className="text-right"><p className="text-sm font-black" style={{ color: row.passed ? "#10b981" : "#ef4444" }}>{Number(row.score || 0).toFixed(1)}</p><p className="text-[10px] font-bold" style={{ color: row.passed ? "#10b981" : "#ef4444" }}>{row.passed ? "Aprovado" : "Não aprovado"}</p></div></div>)}</div>}
      </section>
    </div>
  );
}

function Metric({ label, value, icon: Icon, color, compact = false }: { label: string; value: string | number; icon: typeof FileText; color: string; compact?: boolean }) {
  return <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: "var(--text-4)" }}>{label}</p><p className={`mt-2 font-black ${compact ? "truncate text-sm" : "text-2xl"}`} style={{ color: "var(--text-1)" }}>{value}</p></div><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}18`, color }}><Icon className="h-4 w-4" /></div></div></section>;
}
