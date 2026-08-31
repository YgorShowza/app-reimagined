import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Target, UserRoundSearch, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getOperationalSnapshot } from "@/lib/insights";
import { formatDate } from "@/lib/cronograma";

export const Route = createFileRoute("/_authenticated/individual")({ head: () => ({ meta: [{ title: "Análise Individual · SEGEMPAT" }] }), component: IndividualPage });

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>{children}</div>; }

function IndividualPage() {
  const year = new Date().getFullYear();
  const query = useQuery({ queryKey: ["individual-snapshot", year], queryFn: () => getOperationalSnapshot(year), staleTime:60_000 });
  const employees = useMemo(() => (query.data?.employees ?? []).filter((e) => e.status === "Ativo" && e.access_profile !== "Inspetor"), [query.data]);
  const [selected, setSelected] = useState("");

  if (query.isLoading) return <Loading/>;
  if (query.isError || !query.data) return <Card className="mx-auto max-w-xl p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-500"/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>Não foi possível carregar a análise individual.</p><Button variant="outline" className="mt-4" onClick={()=>query.refetch()}><RefreshCw className="mr-2 h-4 w-4"/> Tentar novamente</Button></Card>;

  const employee = employees.find((e) => e.id === selected) ?? employees[0];
  const cron = employee ? query.data.cronograma.filter((e) => e.employee_id === employee.id) : [];
  const attempts = employee ? query.data.attempts.filter((a) => a.matricula === employee.matricula) : [];
  const realized = cron.filter((e) => e.status === "Realizado").length;
  const pending = cron.filter((e) => e.status === "Pendente").length;
  const passed = attempts.filter((a) => a.passed).length;
  const avg = attempts.length ? Math.round((attempts.reduce((s, a) => s + Number(a.score || 0), 0) / attempts.length) * 10) / 10 : 0;

  return <div className="mx-auto max-w-6xl space-y-5 pb-10">
    <div className="rounded-[1.5rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}><div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40"><UserRoundSearch className="w-4 h-4" /> Desempenho individual</div><h1 className="mt-2 text-2xl md:text-3xl font-black text-white">Análise Individual</h1><p className="mt-1 text-sm text-white/50">Cruza cronograma e provas com dados reais do colaborador.</p></div>

    <Card className="p-4"><label className="text-xs font-bold" style={{ color: "var(--text-4)" }}>Colaborador</label><div className="mt-2 max-w-xl"><Select value={employee?.id || ""} onValueChange={setSelected}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name} · {e.matricula} · {e.sector}</SelectItem>)}</SelectContent></Select></div></Card>

    {!employee ? <Card className="p-10 text-center"><UserRoundSearch className="mx-auto h-10 w-10 opacity-25"/><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Nenhum colaborador operacional ativo cadastrado.</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>A análise será disponibilizada automaticamente quando houver equipe ativa.</p></Card> : <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[["Planejados",cron.length,Target],["Realizados",realized,CheckCircle2],["Pendentes",pending,Clock3],["Aprovações",passed,CheckCircle2],["Média provas",avg,XCircle]].map(([l,v,I]: any) => <Card key={l} className="p-4"><div className="flex justify-between gap-2"><div><p className="text-[10px] uppercase font-black tracking-[.14em]" style={{ color: "var(--text-4)" }}>{l}</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{v}</p></div><I className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} /></div></Card>)}</div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden"><div className="px-4 py-3 font-bold text-sm" style={{ color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>Cronograma</div><div className="divide-y" style={{ borderColor: "var(--border)" }}>{cron.length ? cron.slice().sort((a,b) => (b.planned_date || "").localeCompare(a.planned_date || "")).map((e) => <div key={e.id} className="p-4"><div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><div className="min-w-0"><p className="break-words font-semibold text-sm" style={{ color: "var(--text-1)" }}>{e.theme}</p><p className="text-xs mt-1" style={{ color: "var(--text-4)" }}>{formatDate(e.planned_date)}</p></div><span className="self-start text-[10px] font-black" style={{ color: e.status === "Realizado" ? "#10b981" : e.status === "Pendente" ? "#f59e0b" : "#60a5fa" }}>{e.status}</span></div></div>) : <p className="p-6 text-sm" style={{ color: "var(--text-4)" }}>Sem lançamentos no ano.</p>}</div></Card>

        <Card className="overflow-hidden"><div className="px-4 py-3 font-bold text-sm" style={{ color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>Provas realizadas</div><div className="divide-y" style={{ borderColor: "var(--border)" }}>{attempts.length ? attempts.slice().sort((a,b)=>b.finished_at.localeCompare(a.finished_at)).map((a) => <div key={a.id} className="flex items-center justify-between gap-3 p-4"><div><p className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>Nota {a.score}</p><p className="text-xs mt-1" style={{ color: "var(--text-4)" }}>{new Date(a.finished_at).toLocaleDateString("pt-BR",{timeZone:"America/Maceio"})}</p></div><span className="text-[10px] font-black" style={{ color: a.passed ? "#10b981" : "#ef4444" }}>{a.passed ? "APROVADO" : "REPROVADO"}</span></div>) : <p className="p-6 text-sm" style={{ color: "var(--text-4)" }}>Sem tentativas.</p>}</div></Card>
      </div>
    </>}
  </div>;
}

function Loading(){return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>}
