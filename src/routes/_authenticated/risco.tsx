import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock3, RefreshCw, ShieldCheck, UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { employeeRisk, getOperationalSnapshot } from "@/lib/insights";
import { operationalYear } from "@/lib/operational-time";

export const Route = createFileRoute("/_authenticated/risco")({ head: () => ({ meta: [{ title: "Zona de Risco · SEGEMPAT" }] }), component: RiskPage });

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>{children}</div>; }

function RiskPage() {
  const year = operationalYear();
  const query = useQuery({ queryKey: ["risk-snapshot", year], queryFn: () => getOperationalSnapshot(year), staleTime:60_000 });
  if (query.isLoading) return <Loading/>;
  if (query.isError || !query.data) return <Card className="mx-auto max-w-xl p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-500"/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>Não foi possível calcular a Zona de Risco.</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>Nenhuma conclusão de risco é exibida enquanto os dados não forem carregados corretamente.</p><Button variant="outline" className="mt-4" onClick={()=>query.refetch()}><RefreshCw className="mr-2 h-4 w-4"/> Tentar novamente</Button></Card>;

  const rows = employeeRisk(query.data);
  const high = rows.filter((r) => r.level === "Alto").length;
  const medium = rows.filter((r) => r.level === "Médio").length;
  const low = rows.filter((r) => r.level === "Baixo").length;
  const normal = rows.filter((r) => r.level === "Normal").length;

  return <div className="mx-auto max-w-6xl space-y-5 pb-10">
    <div className="rounded-[1.5rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}><div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40"><AlertTriangle className="w-4 h-4" /> Priorização operacional</div><h1 className="mt-2 text-2xl md:text-3xl font-black text-white">Zona de Risco</h1><p className="mt-1 text-sm text-white/50">Sinaliza pendências vencidas e reprovações usando dados reais.</p></div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[["Alto risco",high,AlertTriangle,"#ef4444"],["Risco médio",medium,Clock3,"#f59e0b"],["Risco baixo",low,Clock3,"#60a5fa"],["Normal",normal,ShieldCheck,"#10b981"],["Monitorados",rows.length,UserRoundSearch,"var(--accent)"]].map(([l,v,I,c]: any) => <Card key={l} className="p-4"><div className="flex justify-between gap-2"><div><p className="text-[10px] uppercase font-black tracking-[.14em]" style={{ color: "var(--text-4)" }}>{l}</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{v}</p></div><I className="w-4 h-4 shrink-0" style={{ color: c }} /></div></Card>)}</div>

    <div className="space-y-3">{rows.map((r) => { const color = r.level === "Alto" ? "#ef4444" : r.level === "Médio" ? "#f59e0b" : r.level === "Baixo" ? "#60a5fa" : "#10b981"; return <Card key={r.employee.id} className="overflow-hidden"><div className="h-[3px]" style={{ background: color }} /><div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="break-words font-bold" style={{ color: "var(--text-1)" }}>{r.employee.full_name}</p><span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ color, background: `${color}16` }}>{r.level}</span></div><p className="text-xs mt-1" style={{ color: "var(--text-4)" }}>Mat. {r.employee.matricula} · {r.employee.sector}</p></div><div className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto sm:gap-6"><div className="rounded-xl p-2 sm:p-0" style={{background:"var(--bg-surface-2)"}}><p className="font-black text-lg text-amber-500">{r.pending}</p><p className="text-[9px] sm:text-[10px] uppercase" style={{ color: "var(--text-4)" }}>Pendências</p></div><div className="rounded-xl p-2 sm:p-0" style={{background:"var(--bg-surface-2)"}}><p className="font-black text-lg text-red-500">{r.overdue}</p><p className="text-[9px] sm:text-[10px] uppercase" style={{ color: "var(--text-4)" }}>Vencidas</p></div><div className="rounded-xl p-2 sm:p-0" style={{background:"var(--bg-surface-2)"}}><p className="font-black text-lg" style={{ color: r.failed ? "#ef4444" : "#10b981" }}>{r.failed}</p><p className="text-[9px] sm:text-[10px] uppercase" style={{ color: "var(--text-4)" }}>Reprovações</p></div></div></div></Card>; })}{!rows.length && <Card className="p-10 text-center"><ShieldCheck className="w-10 h-10 mx-auto text-emerald-500" /><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Nenhum colaborador ativo para analisar.</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>Quando houver equipe operacional, os indicadores serão calculados automaticamente.</p></Card>}</div>
  </div>;
}

function Loading(){return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>}
