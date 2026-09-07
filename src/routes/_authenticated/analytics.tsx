import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardList, Maximize2, Monitor, RefreshCw, Target, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOperationalSnapshot, monthlyExecution, sectorMetrics, snapshotMetrics } from "@/lib/insights";
import { operationalYear } from "@/lib/operational-time";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics · SEGEMPAT" }] }),
  component: AnalyticsPage,
});

function Card({ children, className="" }: { children: React.ReactNode; className?:string }) {
  return <div className={`rounded-2xl p-4 ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>{children}</div>;
}

function KPI({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) {
  return <Card><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.16em] font-black" style={{ color: "var(--text-4)" }}>{label}</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{value}</p></div><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)" }}><Icon className="w-4 h-4" style={{ color: "var(--accent)" }} /></div></div></Card>;
}

function AnalyticsPage() {
  const year = operationalYear();
  const query = useQuery({ queryKey: ["operational-snapshot", year], queryFn: () => getOperationalSnapshot(year), staleTime:60_000 });
  if (query.isLoading) return <Loading/>;
  if (query.isError || !query.data) return <Card className="mx-auto max-w-xl text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-500"/><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Não foi possível carregar os dados analíticos.</p><Button variant="outline" className="mt-4" onClick={()=>query.refetch()}><RefreshCw className="mr-2 h-4 w-4"/> Tentar novamente</Button></Card>;

  const metrics = snapshotMetrics(query.data);
  const sectors = sectorMetrics(query.data);
  const months = monthlyExecution(query.data, year);

  return <div className="segempat-analytical-analytics mx-auto max-w-7xl space-y-5 pb-10">
    <div className="rounded-[1.5rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40"><BarChart3 className="w-4 h-4" /> Inteligência operacional</div><h1 className="mt-2 text-2xl md:text-3xl font-black text-white">Analytics</h1><p className="mt-1 text-sm text-white/50">Indicadores reais de equipe, provas e cronograma · {year}.</p></div>
        <Link to="/tv" className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white transition-transform hover:-translate-y-0.5" style={{ background:"linear-gradient(135deg,#e31837,#a90b28)",boxShadow:"0 12px 28px rgba(200,16,46,.24)" }}><Monitor className="h-4 w-4"/><span>Abrir Painel TV</span><Maximize2 className="h-3.5 w-3.5 opacity-60 transition group-hover:opacity-100"/></Link>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><KPI label="Equipe ativa" value={metrics.activeEmployees} icon={Users} /><KPI label="Execução anual" value={`${metrics.executionRate}%`} icon={Target} /><KPI label="Aprovação" value={`${metrics.approvalRate}%`} icon={CheckCircle2} /><KPI label="Tentativas" value={metrics.attempts} icon={ClipboardList} /><KPI label="Média" value={metrics.averageScore} icon={TrendingUp} /></div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card><h2 className="font-bold text-sm" style={{ color: "var(--text-1)" }}>Execução mensal</h2><p className="mt-1 text-xs" style={{color:"var(--text-4)"}}>Percentual realizado sobre o planejado em cada mês.</p><div className="mt-5 grid grid-cols-6 gap-2 sm:grid-cols-12">{months.map((month)=><div key={month.month} className="flex min-w-0 flex-col items-center gap-2"><div className="flex h-36 w-full items-end justify-center rounded-lg px-1" style={{background:"var(--bg-surface-2)"}}><div className="w-full rounded-md" title={`${month.label}: ${month.rate}%`} style={{height:`${Math.max(month.rate,month.planned?4:0)}%`,background:month.rate>=80?"#10b981":month.rate>=50?"#f59e0b":"#C8102E",minHeight:month.planned?"4px":"0"}}/></div><span className="text-[9px] font-bold uppercase" style={{color:"var(--text-4)"}}>{month.label}</span><span className="text-[10px] font-black" style={{color:"var(--text-2)"}}>{month.rate}%</span></div>)}</div></Card>

      <Card><h2 className="font-bold text-sm" style={{ color: "var(--text-1)" }}>Execução por setor</h2><p className="mt-1 text-xs" style={{color:"var(--text-4)"}}>Comparativo de execução do cronograma por setor.</p>{sectors.length===0?<div className="py-12 text-center text-sm" style={{color:"var(--text-4)"}}>Nenhum setor com dados disponíveis.</div>:<div className="mt-5 space-y-4">{sectors.map((sector)=><div key={sector.sector}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="truncate text-xs font-bold" style={{color:"var(--text-2)"}}>{sector.sector}</span><span className="text-xs font-black" style={{color:sector.executionRate>=80?"#10b981":sector.executionRate>=50?"#f59e0b":"#C8102E"}}>{sector.executionRate}%</span></div><div className="h-2.5 overflow-hidden rounded-full" style={{background:"var(--bg-surface-3)"}}><div className="h-full rounded-full" style={{width:`${sector.executionRate}%`,background:sector.executionRate>=80?"#10b981":sector.executionRate>=50?"#f59e0b":"#C8102E"}}/></div><p className="mt-1 text-[10px]" style={{color:"var(--text-4)"}}>{sector.realized}/{sector.planned} realizados · {sector.employees} colaborador(es)</p></div>)}</div>}</Card>
    </div>

    <Card><h2 className="font-bold text-sm mb-3" style={{ color: "var(--text-1)" }}>Resumo por setor</h2>{sectors.length===0?<p className="py-8 text-center text-sm" style={{color:"var(--text-4)"}}>Sem dados setoriais no período.</p>:<div className="overflow-x-auto"><table className="min-w-[680px] w-full text-sm"><thead><tr style={{ color: "var(--text-4)" }}><th className="text-left py-2">Setor</th><th className="text-right">Colaboradores</th><th className="text-right">Planejados</th><th className="text-right">Realizados</th><th className="text-right">Execução</th><th className="text-right">Aprovação</th></tr></thead><tbody>{sectors.map((s) => <tr key={s.sector} style={{ borderTop: "1px solid var(--border)" }}><td className="py-3 font-semibold" style={{ color: "var(--text-1)" }}>{s.sector}</td><td className="text-right" style={{ color: "var(--text-3)" }}>{s.employees}</td><td className="text-right" style={{ color: "var(--text-3)" }}>{s.planned}</td><td className="text-right" style={{ color: "var(--text-3)" }}>{s.realized}</td><td className="text-right font-bold text-emerald-500">{s.executionRate}%</td><td className="text-right font-bold" style={{ color: "var(--accent)" }}>{s.approvalRate}%</td></tr>)}</tbody></table></div>}</Card>
  </div>;
}

function Loading(){return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>}
