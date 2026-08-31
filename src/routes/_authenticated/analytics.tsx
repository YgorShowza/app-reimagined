import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, Users, CheckCircle2, ClipboardList, Target, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { getOperationalSnapshot, monthlyExecution, sectorMetrics, snapshotMetrics } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics · SEGEMPAT" }] }),
  component: AnalyticsPage,
});

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>{children}</div>;
}

function KPI({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) {
  return <Card><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.16em] font-black" style={{ color: "var(--text-4)" }}>{label}</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{value}</p></div><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)" }}><Icon className="w-4 h-4" style={{ color: "var(--accent)" }} /></div></div></Card>;
}

function AnalyticsPage() {
  const year = new Date().getFullYear();
  const { data, isLoading, isError } = useQuery({ queryKey: ["operational-snapshot", year], queryFn: () => getOperationalSnapshot(year) });
  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  if (isError || !data) return <Card><p className="font-bold" style={{ color: "var(--text-1)" }}>Não foi possível carregar os dados analíticos.</p></Card>;
  const metrics = snapshotMetrics(data);
  const sectors = sectorMetrics(data);
  const months = monthlyExecution(data, year);
  return <div className="mx-auto max-w-7xl space-y-5 pb-10">
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.5rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}><div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40"><BarChart3 className="w-4 h-4" /> Inteligência operacional</div><h1 className="mt-2 text-2xl md:text-3xl font-black text-white">Analytics</h1><p className="mt-1 text-sm text-white/50">Indicadores reais de equipe, provas e cronograma.</p></motion.div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><KPI label="Equipe ativa" value={metrics.activeEmployees} icon={Users} /><KPI label="Execução anual" value={`${metrics.executionRate}%`} icon={Target} /><KPI label="Aprovação" value={`${metrics.approvalRate}%`} icon={CheckCircle2} /><KPI label="Tentativas" value={metrics.attempts} icon={ClipboardList} /><KPI label="Média" value={metrics.averageScore} icon={TrendingUp} /></div>
    <div className="grid lg:grid-cols-2 gap-4"><Card><h2 className="font-bold text-sm mb-4" style={{ color: "var(--text-1)" }}>Execução mensal</h2><ResponsiveContainer width="100%" height={280}><LineChart data={months}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="label" tick={{ fill: "var(--text-4)", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis domain={[0,100]} tick={{ fill: "var(--text-4)", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12 }} /><Line type="monotone" dataKey="rate" stroke="#C8102E" strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></Card><Card><h2 className="font-bold text-sm mb-4" style={{ color: "var(--text-1)" }}>Execução por setor</h2><ResponsiveContainer width="100%" height={280}><BarChart data={sectors}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="sector" tick={{ fill: "var(--text-4)", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis domain={[0,100]} tick={{ fill: "var(--text-4)", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12 }} /><Bar dataKey="executionRate" fill="#C8102E" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer></Card></div>
    <Card><h2 className="font-bold text-sm mb-3" style={{ color: "var(--text-1)" }}>Resumo por setor</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ color: "var(--text-4)" }}><th className="text-left py-2">Setor</th><th className="text-right">Colaboradores</th><th className="text-right">Planejados</th><th className="text-right">Realizados</th><th className="text-right">Execução</th><th className="text-right">Aprovação</th></tr></thead><tbody>{sectors.map((s) => <tr key={s.sector} style={{ borderTop: "1px solid var(--border)" }}><td className="py-3 font-semibold" style={{ color: "var(--text-1)" }}>{s.sector}</td><td className="text-right" style={{ color: "var(--text-3)" }}>{s.employees}</td><td className="text-right" style={{ color: "var(--text-3)" }}>{s.planned}</td><td className="text-right" style={{ color: "var(--text-3)" }}>{s.realized}</td><td className="text-right font-bold text-emerald-500">{s.executionRate}%</td><td className="text-right font-bold" style={{ color: "var(--accent)" }}>{s.approvalRate}%</td></tr>)}</tbody></table></div></Card>
  </div>;
}
