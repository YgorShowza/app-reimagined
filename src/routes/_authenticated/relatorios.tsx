import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, CheckCircle2, Download, FileSpreadsheet, RefreshCw, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOperationalSnapshot, sectorMetrics, snapshotMetrics } from "@/lib/insights";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/relatorios")({ head: () => ({ meta: [{ title: "Relatórios · SEGEMPAT" }] }), component: ReportsPage });

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>{children}</div>; }
function csvCell(value: unknown) { const s = String(value ?? ""); return `"${s.replaceAll('"','""')}"`; }

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
    <div className="rounded-[1.5rem] p-5 md:p-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}><div><div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40"><FileSpreadsheet className="w-4 h-4" /> Consolidação operacional</div><h1 className="mt-2 text-2xl md:text-3xl font-black text-white">Relatórios</h1><p className="mt-1 text-sm text-white/50">Resumo anual de equipe, provas e cronograma · {year}.</p></div><Button onClick={exportCsv} disabled={!sectors.length} className="w-full bg-[#C8102E] hover:bg-[#A00D24] text-white sm:w-auto"><Download className="w-4 h-4 mr-2" /> Exportar CSV</Button></div>

    {!hasOperationalData&&<Card className="p-4"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"/><div><p className="font-bold" style={{color:"var(--text-1)"}}>Base ainda sem volume operacional</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>Os indicadores serão preenchidos automaticamente conforme equipe, cronograma e provas forem utilizados.</p></div></div></Card>}

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Equipe ativa",m.activeEmployees,Users],["Execução",`${m.executionRate}%`,Target],["Aprovação",`${m.approvalRate}%`,CheckCircle2],["Média provas",m.averageScore,BarChart3]].map(([l,v,I]: any) => <Card key={l} className="p-4"><div className="flex justify-between gap-2"><div><p className="text-[10px] uppercase font-black tracking-[.14em]" style={{ color: "var(--text-4)" }}>{l}</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{v}</p></div><I className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} /></div></Card>)}</div>

    <Card className="overflow-hidden"><div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}><h2 className="font-bold text-sm" style={{ color: "var(--text-1)" }}>Indicadores por setor</h2></div>{sectors.length===0?<div className="p-8 text-center text-sm" style={{color:"var(--text-4)"}}>Nenhum setor com dados disponíveis.</div>:<div className="overflow-x-auto"><table className="min-w-[680px] w-full text-sm"><thead><tr style={{ color: "var(--text-4)" }}><th className="text-left p-3">Setor</th><th className="text-right p-3">Equipe</th><th className="text-right p-3">Planejados</th><th className="text-right p-3">Realizados</th><th className="text-right p-3">Execução</th><th className="text-right p-3">Aprovação</th></tr></thead><tbody>{sectors.map((s) => <tr key={s.sector} style={{ borderTop: "1px solid var(--border)" }}><td className="p-3 font-semibold" style={{ color: "var(--text-1)" }}>{s.sector}</td><td className="p-3 text-right" style={{ color: "var(--text-3)" }}>{s.employees}</td><td className="p-3 text-right" style={{ color: "var(--text-3)" }}>{s.planned}</td><td className="p-3 text-right" style={{ color: "var(--text-3)" }}>{s.realized}</td><td className="p-3 text-right font-bold text-emerald-500">{s.executionRate}%</td><td className="p-3 text-right font-bold" style={{ color: "var(--accent)" }}>{s.approvalRate}%</td></tr>)}</tbody></table></div>}</Card>

    <Card className="p-4"><h2 className="font-bold text-sm" style={{ color: "var(--text-1)" }}>Volume consolidado</h2><div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-3 md:grid-cols-5">{[["Planejados",m.planned],["Realizados",m.realized],["Pendentes",m.pending],["Justificados",m.justified],["Tentativas",m.attempts]].map(([l,v]) => <div key={String(l)} className="rounded-xl p-3" style={{ background: "var(--bg-surface-2)" }}><p className="font-black text-xl" style={{ color: "var(--text-1)" }}>{v}</p><p className="text-[10px] uppercase mt-1" style={{ color: "var(--text-4)" }}>{l}</p></div>)}</div></Card>
  </div>;
}

function Loading(){return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>}
