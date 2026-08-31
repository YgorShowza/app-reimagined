import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  UserRound, Award, CheckCircle2, Clock3, ShieldCheck, ClipboardCheck,
  AlertTriangle, GraduationCap, TrendingUp,
} from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getCurrentEmployeeByAuth } from "@/lib/insights";
import { listMyAttempts } from "@/lib/exams";
import { currentMonthStr, listCronogramaEntriesByYear } from "@/lib/cronograma";
import { listTrainingSchedules } from "@/lib/training";
import { listOccurrences, listPracticalEvaluations } from "@/lib/operations";

export const Route = createFileRoute("/_authenticated/meu-perfil")({
  head: () => ({ meta: [{ title: "Meu Perfil · SEGEMPAT" }] }),
  component: MeuPerfil,
});

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
      {children}
    </section>
  );
}

function Metric({ label, value, icon: Icon, detail }: { label: string; value: string | number; icon: typeof Award; detail?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.15em]" style={{ color: "var(--text-4)" }}>{label}</p>
          <p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{value}</p>
          {detail && <p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>{detail}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
          <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
        </div>
      </div>
    </Card>
  );
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString("pt-BR");
}

function MeuPerfil() {
  const { data: currentUser } = useCurrentUser();
  const year = new Date().getFullYear();

  const employeeQuery = useQuery({ queryKey: ["current-employee"], queryFn: getCurrentEmployeeByAuth });
  const attemptsQuery = useQuery({ queryKey: ["my-attempts"], queryFn: listMyAttempts });
  const cronogramaQuery = useQuery({ queryKey: ["my-cronograma-year", year], queryFn: () => listCronogramaEntriesByYear(year) });
  const schedulesQuery = useQuery({ queryKey: ["my-training-schedules"], queryFn: listTrainingSchedules });
  const practicalQuery = useQuery({ queryKey: ["my-practical"], queryFn: listPracticalEvaluations });
  const occurrencesQuery = useQuery({ queryKey: ["my-occurrences-profile"], queryFn: listOccurrences });

  const loading = employeeQuery.isLoading || attemptsQuery.isLoading || cronogramaQuery.isLoading;
  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  }

  const employee = employeeQuery.data;
  const attempts = attemptsQuery.data ?? [];
  const cronograma = cronogramaQuery.data ?? [];
  const practical = practicalQuery.data ?? [];
  const occurrences = occurrencesQuery.data ?? [];
  const schedule = (schedulesQuery.data ?? []).find((item) => item.employee_id === employee?.id) ?? schedulesQuery.data?.[0];

  const passed = attempts.filter((attempt) => attempt.passed).length;
  const approvalRate = attempts.length ? Math.round((passed / attempts.length) * 100) : 0;
  const averageScore = attempts.length
    ? Math.round((attempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0) / attempts.length) * 10) / 10
    : 0;
  const realized = cronograma.filter((entry) => entry.status === "Realizado").length;
  const pending = cronograma.filter((entry) => entry.status === "Pendente").length;
  const executionRate = cronograma.length ? Math.round((realized / cronograma.length) * 100) : 0;
  const completedPractical = practical.filter((item) => item.status === "Concluída");
  const currentMonth = currentMonthStr();
  const monthEntries = cronograma.filter((entry) => entry.month === currentMonth);

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <div className="relative overflow-hidden rounded-[1.5rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full" style={{ background: "radial-gradient(circle,rgba(200,16,46,.22),transparent 70%)" }} />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)" }}>
            <UserRound className="w-7 h-7 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[.2em] font-black text-white/40">Perfil operacional</p>
            <h1 className="mt-1 text-xl md:text-2xl font-black text-white truncate">{employee?.full_name || currentUser?.nome || "Colaborador"}</h1>
            <p className="mt-1 text-xs text-white/50">Mat. {employee?.matricula || currentUser?.matricula || "—"} · {employee?.sector || "Setor não vinculado"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric label="Nível" value={employee?.level ?? 0} icon={TrendingUp} detail={`${employee?.points ?? 0} pontos`} />
        <Metric label="Aprovação" value={`${approvalRate}%`} icon={Award} detail={`${passed}/${attempts.length} provas`} />
        <Metric label="Nota média" value={averageScore} icon={GraduationCap} />
        <Metric label="Execução anual" value={`${executionRate}%`} icon={CheckCircle2} detail={`${realized}/${cronograma.length} realizados`} />
        <Metric label="Pendências" value={pending} icon={Clock3} detail={`${monthEntries.filter((item) => item.status === "Pendente").length} no mês`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" style={{ color: "var(--accent)" }} /><h2 className="font-black text-sm" style={{ color: "var(--text-1)" }}>Ciclo de treinamento</h2></div>
            {schedule && <span className="text-[10px] font-black" style={{ color: schedule.status === "Em dia" ? "#10b981" : schedule.status === "Próximo ao vencimento" ? "#f59e0b" : "#ef4444" }}>{schedule.status}</span>}
          </div>
          <div className="p-4">
            {schedule ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>Último treinamento</p><p className="mt-1 font-semibold" style={{ color: "var(--text-1)" }}>{fmtDate(schedule.last_training_date)}</p></div>
                <div><p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>Próximo vencimento</p><p className="mt-1 font-semibold" style={{ color: "var(--text-1)" }}>{fmtDate(schedule.window_end)}</p></div>
                <div><p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>Ciclo</p><p className="mt-1 font-semibold" style={{ color: "var(--text-1)" }}>{schedule.cycle_days} dias</p></div>
                <div><p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>Janela inicia</p><p className="mt-1 font-semibold" style={{ color: "var(--text-1)" }}>{fmtDate(schedule.window_start)}</p></div>
              </div>
            ) : <p className="text-sm" style={{ color: "var(--text-4)" }}>Nenhum ciclo de treinamento configurado.</p>}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2"><ClipboardCheck className="w-4 h-4" style={{ color: "var(--accent)" }} /><h2 className="font-black text-sm" style={{ color: "var(--text-1)" }}>Avaliação prática</h2></div>
            <span className="text-[10px] font-black" style={{ color: "var(--text-4)" }}>{completedPractical.length} concluída(s)</span>
          </div>
          <div className="p-4 space-y-3">
            {practical.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div><p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{item.title}</p><p className="text-xs mt-0.5" style={{ color: "var(--text-4)" }}>{fmtDate(item.evaluation_date)} · {item.status}</p></div>
                <span className="text-xs font-black" style={{ color: item.status === "Concluída" ? "#10b981" : "#f59e0b" }}>{item.status === "Concluída" ? `${item.score}/${item.max_score}` : "—"}</span>
              </div>
            ))}
            {!practical.length && <p className="text-sm" style={{ color: "var(--text-4)" }}>Nenhuma avaliação prática registrada.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="font-black text-sm" style={{ color: "var(--text-1)" }}>Últimas provas</h2>
            <span className="text-[10px] font-black" style={{ color: "var(--text-4)" }}>{attempts.length} tentativa(s)</span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {attempts.slice(0, 5).map((attempt) => (
              <div key={attempt.id} className="p-4 flex items-center justify-between gap-3">
                <div><p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Prova realizada</p><p className="text-xs mt-0.5" style={{ color: "var(--text-4)" }}>{fmtDate(attempt.finished_at)}</p></div>
                <div className="text-right"><p className="text-sm font-black" style={{ color: attempt.passed ? "#10b981" : "#ef4444" }}>{attempt.score}</p><p className="text-[9px] font-black uppercase" style={{ color: attempt.passed ? "#10b981" : "#ef4444" }}>{attempt.passed ? "Aprovado" : "Reprovado"}</p></div>
              </div>
            ))}
            {!attempts.length && <div className="p-4 text-sm" style={{ color: "var(--text-4)" }}>Nenhuma prova realizada.</div>}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" style={{ color: "var(--accent)" }} /><h2 className="font-black text-sm" style={{ color: "var(--text-1)" }}>Ocorrências vinculadas</h2></div>
            <span className="text-[10px] font-black" style={{ color: "var(--text-4)" }}>{occurrences.length}</span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {occurrences.slice(0, 5).map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-3">
                <div><p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{item.title}</p><p className="text-xs mt-0.5" style={{ color: "var(--text-4)" }}>{fmtDate(item.occurred_at)} · {item.category}</p></div>
                <span className="text-[10px] font-black" style={{ color: item.status === "Concluída" ? "#10b981" : "#f59e0b" }}>{item.status}</span>
              </div>
            ))}
            {!occurrences.length && <div className="p-4 text-sm" style={{ color: "var(--text-4)" }}>Nenhuma ocorrência vinculada.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
