import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lightbulb, AlertTriangle, Target, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { employeeRisk, getOperationalSnapshot, sectorMetrics, snapshotMetrics } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/oportunidades")({
  head: () => ({ meta: [{ title: "Oportunidades · SEGEMPAT" }] }),
  component: OpportunitiesPage,
});

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>{children}</div>;
}

function OpportunitiesPage() {
  const year = new Date().getFullYear();
  const { data, isLoading } = useQuery({ queryKey: ["opportunities-snapshot", year], queryFn: () => getOperationalSnapshot(year) });
  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  if (!data) return null;

  const metrics = snapshotMetrics(data);
  const sectors = sectorMetrics(data);
  const risk = employeeRisk(data);
  const opportunities = [
    ...sectors.filter((s) => s.planned > 0 && s.executionRate < 80).map((s) => ({
      key: `sector-${s.sector}`,
      title: `Elevar execução em ${s.sector}`,
      detail: `${s.executionRate}% executado · ${s.planned - s.realized} atividade(s) ainda não concluída(s).`,
      priority: s.executionRate < 50 ? "Alta" : "Média",
      action: "/cronograma",
      actionLabel: "Abrir cronograma",
    })),
    ...sectors.filter((s) => s.attempts > 0 && s.approvalRate < 75).map((s) => ({
      key: `approval-${s.sector}`,
      title: `Reforçar aprendizagem em ${s.sector}`,
      detail: `Taxa de aprovação atual: ${s.approvalRate}%. Revisar conteúdos e avaliações pode reduzir reincidência.`,
      priority: s.approvalRate < 50 ? "Alta" : "Média",
      action: "/analytics",
      actionLabel: "Ver analytics",
    })),
    ...risk.filter((r) => r.level === "Alto" || r.level === "Médio").slice(0, 8).map((r) => ({
      key: `person-${r.employee.id}`,
      title: `Acompanhamento individual: ${r.employee.full_name}`,
      detail: `${r.pending} pendência(s), ${r.overdue} vencida(s) e ${r.failed} reprovação(ões).`,
      priority: r.level,
      action: "/individual",
      actionLabel: "Analisar colaborador",
    })),
  ].sort((a, b) => (a.priority === "Alta" ? 0 : 1) - (b.priority === "Alta" ? 0 : 1));

  return <div className="mx-auto max-w-6xl space-y-5 pb-10">
    <div className="rounded-[1.5rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40"><Lightbulb className="w-4 h-4" /> Melhoria contínua</div>
      <h1 className="mt-2 text-2xl md:text-3xl font-black text-white">Oportunidades</h1>
      <p className="mt-1 text-sm text-white/50">Prioridades calculadas a partir de execução, aprovação e pendências reais.</p>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[["Oportunidades", opportunities.length, Lightbulb], ["Execução", `${metrics.executionRate}%`, Target], ["Equipe ativa", metrics.activeEmployees, Users], ["Aprovação", `${metrics.approvalRate}%`, CheckCircle2]].map(([label, value, Icon]: any) => <Card key={label} className="p-4"><div className="flex justify-between gap-3"><div><p className="text-[10px] uppercase font-black tracking-[.14em]" style={{ color: "var(--text-4)" }}>{label}</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{value}</p></div><Icon className="w-4 h-4" style={{ color: "var(--accent)" }} /></div></Card>)}
    </div>

    {opportunities.length ? <div className="space-y-3">{opportunities.map((item) => {
      const color = item.priority === "Alta" ? "#ef4444" : "#f59e0b";
      return <Card key={item.key} className="overflow-hidden"><div className="h-[3px]" style={{ background: color }} /><div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div className="flex items-start gap-3"><div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: `${color}14` }}><AlertTriangle className="w-4 h-4" style={{ color }} /></div><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold" style={{ color: "var(--text-1)" }}>{item.title}</p><span className="text-[10px] uppercase font-black" style={{ color }}>{item.priority}</span></div><p className="mt-2 text-sm" style={{ color: "var(--text-3)" }}>{item.detail}</p></div></div><Link to={item.action as any} className="shrink-0 inline-flex items-center gap-1 text-xs font-black" style={{ color: "var(--accent)" }}>{item.actionLabel}<ArrowRight className="w-3.5 h-3.5" /></Link></div></Card>;
    })}</div> : <Card className="p-10 text-center"><CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" /><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Nenhuma oportunidade crítica identificada.</p><p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>Os indicadores atuais estão dentro dos critérios monitorados.</p></Card>}
  </div>;
}
