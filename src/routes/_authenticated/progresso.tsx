import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, CheckCircle2, Clock3, Award, Target, AlertTriangle } from "lucide-react";
import { listCronogramaEntriesByYear } from "@/lib/cronograma";
import { listMyAttempts } from "@/lib/exams";

export const Route = createFileRoute("/_authenticated/progresso")({ head: () => ({ meta: [{ title: "Progresso · SEGEMPAT" }] }), component: ProgressPage });

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>{children}</div>; }

function ProgressPage() {
  const year = new Date().getFullYear();
  const cron = useQuery({ queryKey: ["my-progress-cron", year], queryFn: () => listCronogramaEntriesByYear(year) });
  const attempts = useQuery({ queryKey: ["my-progress-attempts"], queryFn: listMyAttempts });

  if (cron.isLoading || attempts.isLoading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  if (cron.isError || attempts.isError) return <Card className="mx-auto max-w-xl p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-500"/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>Não foi possível carregar seu progresso.</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>Atualize a página. Se o problema persistir, informe a Inspetoria.</p></Card>;

  const rows = cron.data ?? [];
  const ats = attempts.data ?? [];
  const done = rows.filter((e) => e.status === "Realizado").length;
  const pending = rows.filter((e) => e.status === "Pendente").length;
  const passed = ats.filter((a) => a.passed).length;
  const execution = rows.length ? Math.round(done / rows.length * 100) : 0;
  const approval = ats.length ? Math.round(passed / ats.length * 100) : 0;
  const avg = ats.length ? Math.round(ats.reduce((s,a) => s + Number(a.score || 0), 0) / ats.length * 10) / 10 : 0;
  const recentRows = rows.slice().sort((a,b) => (b.updated_at || "").localeCompare(a.updated_at || "")).slice(0,6);
  const recentAttempts = ats.slice().sort((a,b) => (b.finished_at || "").localeCompare(a.finished_at || "")).slice(0,6);

  return <div className="mx-auto max-w-4xl space-y-5 pb-10">
    <div className="rounded-[1.5rem] p-5" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-white/40"><TrendingUp className="h-4 w-4" /> Evolução</div>
      <h1 className="mt-2 text-2xl font-black text-white">Meu Progresso</h1>
      <p className="mt-1 text-sm text-white/50">Seu desempenho real em treinamentos e provas.</p>
    </div>

    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {[["Execução",`${execution}%`,Target],["Realizados",done,CheckCircle2],["Pendentes",pending,Clock3],["Aprovação",`${approval}%`,Award],["Média",avg,TrendingUp]].map(([l,v,I]: any) => <Card key={l} className="p-4"><div className="flex justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: "var(--text-4)" }}>{l}</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{v}</p></div><I className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} /></div></Card>)}
    </div>

    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold" style={{ color: "var(--text-1)" }}>Cobertura do cronograma</h2><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>{done} de {rows.length} atividades concluídas</p></div><span className="text-lg font-black" style={{ color: execution >= 80 ? "#10b981" : "var(--accent)" }}>{execution}%</span></div>
      <div className="mt-4 h-3 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-3)" }}><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${execution}%`, background: execution >= 80 ? "#10b981" : "#C8102E" }} /></div>
    </Card>

    <div className="grid gap-4 md:grid-cols-2">
      <Card className="overflow-hidden">
        <div className="p-4 text-sm font-bold" style={{ color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>Últimas atividades</div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {recentRows.map((e) => <div key={e.id} className="flex flex-wrap justify-between gap-3 p-4 sm:flex-nowrap"><div className="min-w-0"><p className="break-words text-sm font-semibold" style={{ color: "var(--text-1)" }}>{e.theme}</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>{e.month}</p></div><span className="shrink-0 text-[10px] font-black" style={{ color: e.status === "Realizado" ? "#10b981" : e.status === "Pendente" ? "#f59e0b" : "#60a5fa" }}>{e.status}</span></div>)}
          {!rows.length && <p className="p-6 text-sm" style={{ color: "var(--text-4)" }}>Sem atividades registradas.</p>}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 text-sm font-bold" style={{ color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>Histórico de provas</div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {recentAttempts.map((a) => <div key={a.id} className="flex flex-wrap justify-between gap-3 p-4 sm:flex-nowrap"><div><p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Nota {a.score}</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>{new Date(a.finished_at).toLocaleDateString("pt-BR")}</p></div><span className="shrink-0 text-[10px] font-black" style={{ color: a.passed ? "#10b981" : "#ef4444" }}>{a.passed ? "APROVADO" : "REPROVADO"}</span></div>)}
          {!ats.length && <p className="p-6 text-sm" style={{ color: "var(--text-4)" }}>Sem provas realizadas.</p>}
        </div>
      </Card>
    </div>
  </div>;
}
