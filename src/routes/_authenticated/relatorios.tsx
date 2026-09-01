import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, CheckCircle2, Download, FileSpreadsheet, RefreshCw, Target, Users, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOperationalSnapshot, sectorMetrics, snapshotMetrics } from "@/lib/insights";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/relatorios")({ head: () => ({ meta: [{ title: "Relatórios · SEGEMPAT" }] }), component: ReportsPage });

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>{children}</div>; }
function csvCell(value: unknown) { const s = String(value ?? ""); return `"${s.replaceAll('"','""')}"`; }
function Metric({label,value,icon:Icon,accent,sub}:{label:string;value:string|number;icon:typeof Users;accent:string;sub:string}){return <Card className="relative overflow-hidden p-4"><div className="absolute left-0 top-0 h-[3px] w-full" style={{background:accent}}/><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em]" style={{color:"var(--text-4)"}}>{label}</p><p className="mt-2 text-3xl font-black" style={{color:"var(--text-1)"}}>{value}</p><p className="mt-1 text-[11px] font-semibold" style={{color:accent}}>{sub}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{background:`${accent}12`,border:`1px solid ${accent}30`}}><Icon className="h-4 w-4" style={{color:accent}}/></div></div></Card>}

function ReportsPage() {
  const year = new Date().getFullYear();
  const query = useQuery({ queryKey: ["reports-snapshot", year], queryFn: () => getOperationalSnapshot(year), staleTime: 60_000 });
  if (query.isLoading) return <Loading/>;
  if (query.isError || !query.data) return <Card className="mx-auto max-w-xl p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-500"/><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Não foi possível carregar o relatório.</p><Button variant="outline" className="mt-4" onClick={()=>query.refetch()}><RefreshCw className="mr-2 h-4 w-4"/> Tentar novamente</Button></Card>;

  const data=query.data;
  const m = snapshotMetrics(data);
  const sectors = sectorMetrics(data);
  const hasOperationalData = m.activeEmployees > 0 || m.planned > 0 || m.attempts > 0;

  const exportCsv = () => {
    if (!sectors.length) { toast.info("Não há indicadores por setor para exportar neste momento."); return; }
    const lines = [["Setor","Colaboradores","Planejados","Realizados","Execução %","Tentativas","Aprovação %"], ...sectors.map((s) => [s.sector,s.employees,s.planned,s.realized,s.executionRate,s.attempts,s.approvalRate])].map((r) => r.map(csvCell).join(";"));
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SEGEMPAT_Relatorio_${year}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),0);
    toast.success("Relatório CSV gerado");
  };

  return <div className="mx-auto max-w-6xl space-y-5 pb-10">
    <section className="relative overflow-hidden rounded-[1.75rem] p-5 md:p-6" style={{background:"linear-gradient(135deg,#171117 0%,#310912 55%,#160f14 100%)",border:"1px solid rgba(200,16,46,.28)",boxShadow:"0 12px 38px rgba(80,0,18,.16)"}}><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full" style={{background:"radial-gradient(circle,rgba(200,16,46,.25),transparent 68%)"}}/><div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em]" style={{color:"rgba(255,255,255,.44)"}}><FileSpreadsheet className="h-4 w-4"/> Consolidação operacional</div><h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">Relatórios</h1><p className="mt-1 text-sm" style={{color:"rgba(255,255,255,.52)"}}>Resumo anual de equipe, provas e cronograma · {year}.</p></div><Button onClick={exportCsv} disabled={!sectors.length} className="w-full bg-[#e0142f] font-bold text-white shadow-lg shadow-red-950/20 hover:bg-[#C8102E] sm:w-auto"><Download className="mr-2 h-4 w-4" /> Exportar CSV</Button></div></section>

    {!hasOperationalData&&<Card className="p-4"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"/><div><p className="font-bold" style={{color:"var(--text-1)"}}>Base ainda sem volume operacional</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>Os indicadores serão preenchidos automaticamente conforme equipe, cronograma e provas forem utilizados.</p></div></div></Card>}

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Equipe ativa" value={m.activeEmployees} icon={Users} accent="#3b82f6" sub="colaboradores ativos"/><Metric label="Execução" value={`${m.executionRate}%`} icon={Target} accent="#10b981" sub={`${m.realized}/${m.planned || 0} realizados`}/><Metric label="Aprovação" value={`${m.approvalRate}%`} icon={CheckCircle2} accent="#e11d48" sub={`${m.passed} aprovações`}/><Metric label="Média provas" value={m.averageScore} icon={BarChart3} accent="#f59e0b" sub={`${m.attempts} tentativas`}/></div>

    <Card className="overflow-hidden"><div className="flex items-center gap-2 p-4" style={{ borderBottom: "1px solid var(--border)" }}><Layers3 className="h-4 w-4" style={{color:"var(--accent)"}}/><div><h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Indicadores por setor</h2><p className="mt-0.5 text-[11px]" style={{color:"var(--text-4)"}}>Execução e aprovação consolidadas por área operacional</p></div></div>{sectors.length===0?<div className="p-8 text-center text-sm" style={{color:"var(--text-4)"}}>Nenhum setor com dados disponíveis.</div>:<div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead style={{background:"var(--bg-surface-2)"}}><tr style={{ color: "var(--text-4)" }}><th className="p-3 text-left text-[10px] font-black uppercase tracking-[.12em]">Setor</th><th className="p-3 text-right text-[10px] font-black uppercase tracking-[.12em]">Equipe</th><th className="p-3 text-right text-[10px] font-black uppercase tracking-[.12em]">Planejados</th><th className="p-3 text-right text-[10px] font-black uppercase tracking-[.12em]">Realizados</th><th className="p-3 text-right text-[10px] font-black uppercase tracking-[.12em]">Execução</th><th className="p-3 text-right text-[10px] font-black uppercase tracking-[.12em]">Aprovação</th></tr></thead><tbody>{sectors.map((s) => <tr key={s.sector} style={{ borderTop: "1px solid var(--border)" }}><td className="p-3 font-black" style={{ color: "var(--text-1)" }}>{s.sector}</td><td className="p-3 text-right" style={{ color: "var(--text-3)" }}>{s.employees}</td><td className="p-3 text-right" style={{ color: "var(--text-3)" }}>{s.planned}</td><td className="p-3 text-right" style={{ color: "var(--text-3)" }}>{s.realized}</td><td className="p-3 text-right"><span className="rounded-lg px-2 py-1 text-xs font-black" style={{background:s.executionRate>=80?"rgba(16,185,129,.10)":s.executionRate>=50?"rgba(245,158,11,.10)":"rgba(225,29,72,.10)",color:s.executionRate>=80?"#10b981":s.executionRate>=50?"#f59e0b":"#e11d48"}}>{s.executionRate}%</span></td><td className="p-3 text-right"><span className="rounded-lg px-2 py-1 text-xs font-black" style={{background:s.approvalRate>=80?"rgba(16,185,129,.10)":"rgba(225,29,72,.10)",color:s.approvalRate>=80?"#10b981":"#e11d48"}}>{s.approvalRate}%</span></td></tr>)}</tbody></table></div>}</Card>

    <Card className="p-4"><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" style={{color:"var(--accent)"}}/><h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Volume consolidado</h2></div><div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-3 md:grid-cols-5">{[["Planejados",m.planned,"#3b82f6"],["Realizados",m.realized,"#10b981"],["Pendentes",m.pending,"#f59e0b"],["Justificados",m.justified,"#60a5fa"],["Tentativas",m.attempts,"#e11d48"]].map(([l,v,c]:any) => <div key={String(l)} className="rounded-xl p-3" style={{ background: "var(--bg-surface-2)",border:"1px solid var(--border-subtle)" }}><p className="text-2xl font-black" style={{ color:c }}>{v}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[.1em]" style={{ color: "var(--text-4)" }}>{l}</p></div>)}</div></Card>
  </div>;
}

function Loading(){return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>}
