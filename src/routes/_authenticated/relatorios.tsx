import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, CalendarDays, CheckCircle2, Download, FileSpreadsheet, RefreshCw, Target, Users, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthlyReportWorkspace } from "@/components/reports/MonthlyReportWorkspace";
import { getOperationalSnapshot, sectorMetrics, snapshotMetrics } from "@/lib/insights";
import { operationalYear } from "@/lib/operational-time";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Central de Relatórios · SEGEMPAT" }] }),
  component: ReportsCenterPage,
});

type ReportTab = "executivo" | "mensal";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>{children}</div>;
}

function ReportsCenterPage() {
  const [tab, setTab] = useState<ReportTab>("executivo");

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-[1.75rem] p-5 md:p-6 lg:p-7" style={{ background: "linear-gradient(135deg,#171117 0%,#310912 55%,#160f14 100%)", border: "1px solid rgba(200,16,46,.28)", boxShadow: "0 12px 38px rgba(80,0,18,.16)" }}>
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle,rgba(200,16,46,.25),transparent 68%)" }} />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em]" style={{ color: "rgba(255,255,255,.44)" }}><FileSpreadsheet className="h-4 w-4" /> Inteligência documental</div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">Central de Relatórios</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: "rgba(255,255,255,.54)" }}>Consolidação executiva e fechamento mensal no mesmo ambiente, usando a mesma base operacional do SEGEMPAT.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:w-[440px]">
            <ReportModeButton active={tab === "executivo"} icon={BarChart3} title="Visão Executiva" subtitle="Anual · setores · indicadores" onClick={() => setTab("executivo")} />
            <ReportModeButton active={tab === "mensal"} icon={CalendarDays} title="Fechamento Mensal" subtitle="Individual · cronograma · provas" onClick={() => setTab("mensal")} />
          </div>
        </div>
      </section>

      {tab === "executivo" ? <ExecutiveReport /> : <MonthlyReportWorkspace embedded />}
    </div>
  );
}

function ReportModeButton({ active, icon: Icon, title, subtitle, onClick }: { active: boolean; icon: typeof BarChart3; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl p-3 text-left transition-all"
      style={active
        ? { background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.26)", boxShadow: "0 10px 24px rgba(0,0,0,.16)" }
        : { background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.09)" }}
      aria-pressed={active}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: active ? "#C8102E" : "rgba(255,255,255,.07)" }}><Icon className="h-4 w-4 text-white" /></div>
      <div className="min-w-0"><p className="text-sm font-black text-white">{title}</p><p className="mt-0.5 text-[10px]" style={{ color: "rgba(255,255,255,.43)" }}>{subtitle}</p></div>
    </button>
  );
}

function ExecutiveReport() {
  const year = operationalYear();
  const query = useQuery({ queryKey: ["reports-snapshot", year], queryFn: () => getOperationalSnapshot(year), staleTime: 60_000 });
  if (query.isLoading) return <Loading />;
  if (query.isError || !query.data) return <Card className="mx-auto max-w-xl p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-500" /><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Não foi possível carregar o relatório.</p><Button variant="outline" className="mt-4" onClick={() => query.refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente</Button></Card>;

  const data = query.data;
  const metrics = snapshotMetrics(data);
  const sectors = sectorMetrics(data);
  const hasOperationalData = metrics.activeEmployees > 0 || metrics.planned > 0 || metrics.attempts > 0;

  const exportCsv = () => {
    if (!sectors.length) {
      toast.info("Não há indicadores por setor para exportar neste momento.");
      return;
    }
    const lines = [
      ["Setor", "Colaboradores", "Planejados", "Realizados", "Execução %", "Tentativas", "Aprovação %"],
      ...sectors.map((sector) => [sector.sector, sector.employees, sector.planned, sector.realized, sector.executionRate, sector.attempts, sector.approvalRate]),
    ].map((row) => row.map(csvCell).join(";"));
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `SEGEMPAT_Relatorio_${year}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success("Relatório CSV gerado");
  };

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: "var(--accent)" }}>Visão executiva · {year}</p><p className="mt-1 text-sm font-bold" style={{ color: "var(--text-1)" }}>Equipe, execução do cronograma, provas e comparação por setor.</p></div>
        <Button onClick={exportCsv} disabled={!sectors.length} className="bg-[#e0142f] font-bold text-white hover:bg-[#C8102E]"><Download className="mr-2 h-4 w-4" /> Exportar CSV setorial</Button>
      </Card>

      {!hasOperationalData && <Card className="p-4"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" /><div><p className="font-bold" style={{ color: "var(--text-1)" }}>Base ainda sem volume operacional</p><p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>Os indicadores serão preenchidos automaticamente conforme equipe, cronograma e provas forem utilizados.</p></div></div></Card>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Equipe ativa" value={metrics.activeEmployees} icon={Users} accent="#3b82f6" sub="colaboradores ativos" />
        <Metric label="Execução" value={`${metrics.executionRate}%`} icon={Target} accent="#10b981" sub={`${metrics.realized}/${metrics.planned || 0} realizados`} />
        <Metric label="Aprovação" value={`${metrics.approvalRate}%`} icon={CheckCircle2} accent="#e11d48" sub={`${metrics.passed} aprovações`} />
        <Metric label="Média provas" value={metrics.averageScore} icon={BarChart3} accent="#f59e0b" sub={`${metrics.attempts} tentativas`} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 p-4" style={{ borderBottom: "1px solid var(--border)" }}><Layers3 className="h-4 w-4" style={{ color: "var(--accent)" }} /><div><h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Indicadores por setor</h2><p className="mt-0.5 text-[11px]" style={{ color: "var(--text-4)" }}>Execução e aprovação consolidadas por área operacional</p></div></div>
        {sectors.length === 0 ? <div className="p-8 text-center text-sm" style={{ color: "var(--text-4)" }}>Nenhum setor com dados disponíveis.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead style={{ background: "var(--bg-surface-2)" }}><tr style={{ color: "var(--text-4)" }}><th className="p-3 text-left text-[10px] font-black uppercase tracking-[.12em]">Setor</th><th className="p-3 text-right text-[10px] font-black uppercase tracking-[.12em]">Equipe</th><th className="p-3 text-right text-[10px] font-black uppercase tracking-[.12em]">Planejados</th><th className="p-3 text-right text-[10px] font-black uppercase tracking-[.12em]">Realizados</th><th className="p-3 text-right text-[10px] font-black uppercase tracking-[.12em]">Execução</th><th className="p-3 text-right text-[10px] font-black uppercase tracking-[.12em]">Aprovação</th></tr></thead><tbody>{sectors.map((sector) => <tr key={sector.sector} style={{ borderTop: "1px solid var(--border)" }}><td className="p-3 font-black" style={{ color: "var(--text-1)" }}>{sector.sector}</td><td className="p-3 text-right" style={{ color: "var(--text-3)" }}>{sector.employees}</td><td className="p-3 text-right" style={{ color: "var(--text-3)" }}>{sector.planned}</td><td className="p-3 text-right" style={{ color: "var(--text-3)" }}>{sector.realized}</td><td className="p-3 text-right"><span className="rounded-lg px-2 py-1 text-xs font-black" style={{ background: sector.executionRate >= 80 ? "rgba(16,185,129,.10)" : sector.executionRate >= 50 ? "rgba(245,158,11,.10)" : "rgba(225,29,72,.10)", color: sector.executionRate >= 80 ? "#10b981" : sector.executionRate >= 50 ? "#f59e0b" : "#e11d48" }}>{sector.executionRate}%</span></td><td className="p-3 text-right"><span className="rounded-lg px-2 py-1 text-xs font-black" style={{ background: sector.approvalRate >= 80 ? "rgba(16,185,129,.10)" : "rgba(225,29,72,.10)", color: sector.approvalRate >= 80 ? "#10b981" : "#e11d48" }}>{sector.approvalRate}%</span></td></tr>)}</tbody></table></div>}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" style={{ color: "var(--accent)" }} /><h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Volume consolidado</h2></div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-3 md:grid-cols-5">{[["Planejados", metrics.planned, "#3b82f6"], ["Realizados", metrics.realized, "#10b981"], ["Pendentes", metrics.pending, "#f59e0b"], ["Justificados", metrics.justified, "#60a5fa"], ["Tentativas", metrics.attempts, "#e11d48"]].map(([label, value, color]) => <div key={String(label)} className="rounded-xl p-3" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}><p className="text-2xl font-black" style={{ color: String(color) }}>{String(value)}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[.1em]" style={{ color: "var(--text-4)" }}>{String(label)}</p></div>)}</div>
      </Card>
    </div>
  );
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function Metric({ label, value, icon: Icon, accent, sub }: { label: string; value: string | number; icon: typeof Users; accent: string; sub: string }) {
  return <Card className="relative overflow-hidden p-4"><div className="absolute left-0 top-0 h-[3px] w-full" style={{ background: accent }} /><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: "var(--text-4)" }}>{label}</p><p className="mt-2 text-3xl font-black" style={{ color: "var(--text-1)" }}>{value}</p><p className="mt-1 text-[11px] font-semibold" style={{ color: accent }}>{sub}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${accent}12`, border: `1px solid ${accent}30` }}><Icon className="h-4 w-4" style={{ color: accent }} /></div></div></Card>;
}

function Loading() {
  return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
}
