import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  BarChart3,
  Shield,
  Target,
  AlertTriangle,
  FileText,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  ChevronRight,
  Trophy,
  RefreshCw,
} from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { employeeRisk, getOperationalSnapshot, sectorMetrics, snapshotMetrics } from "@/lib/insights";
import { operationalYear } from "@/lib/operational-time";

const LOGO_URL = "https://media.base44.com/images/public/6a1117d573bbf85981b1abee/8271ac857_IMG_9226.png";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Dashboard · SEGEMPAT" }] }),
  component: AdminDashboard,
});

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card, var(--shadow-md))",
      }}
    >
      {children}
    </div>
  );
}

function KPI({ label, value, icon: Icon, sub, accent }: { label: string; value: string | number; icon: typeof Users; sub?: string; accent: string }) {
  return (
    <Card className="relative overflow-hidden p-4 md:p-5">
      <div className="absolute left-0 top-0 h-[3px] w-full" style={{ background: accent }} />
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[.09]" style={{ background: accent }} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.13em]" style={{ color: "var(--text-4)" }}>{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight" style={{ color: "var(--text-1)" }}>{value}</p>
          {sub && <p className="mt-1.5 text-xs font-semibold" style={{ color: accent }}>{sub}</p>}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${accent}14`, border: `1px solid ${accent}35` }}><Icon className="h-5 w-5" style={{ color: accent }} /></div>
      </div>
    </Card>
  );
}

function AdminDashboard() {
  const year = operationalYear();
  const { data: user } = useCurrentUser();
  const { data, isLoading, refetch, isFetching } = useQuery({ queryKey: ["admin-snapshot", year], queryFn: () => getOperationalSnapshot(year), staleTime: 60_000 });

  if (isLoading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  if (!data) return <Card className="p-8"><p style={{ color: "var(--text-3)" }}>Não foi possível carregar o dashboard.</p></Card>;

  const m = snapshotMetrics(data);
  const sectors = sectorMetrics(data);
  const risk = employeeRisk(data);
  const first = user?.nome?.split(" ")[0] || "Inspetor";
  const now = new Date();
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "2-digit", hourCycle: "h23", timeZone: "America/Maceio" }).format(now));
  const greeting = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const updatedAt = now.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Maceio" });
  const quick = [
    { to: "/equipe", label: "Equipe", icon: Users, accent: "#3b82f6" },
    { to: "/analytics", label: "Analytics", icon: BarChart3, accent: "#e11d48" },
    { to: "/cronograma", label: "Cronograma", icon: CalendarDays, accent: "#f59e0b" },
    { to: "/provas", label: "Provas", icon: FileText, accent: "#e11d48" },
    { to: "/risco", label: "Risco", icon: Target, accent: "#f59e0b" },
    { to: "/individual", label: "Individual", icon: BarChart3, accent: "#06b6d4" },
    { to: "/relatorios", label: "Relatórios", icon: FileSpreadsheet, accent: "#ec4899" },
    { to: "/avaliacao-pratica", label: "Avaliação", icon: ClipboardCheck, accent: "#8b5cf6" },
  ];
  const priority = risk.filter((r) => r.score > 0);
  const priorityCount = priority.length;
  const leaders = data.employees
    .filter((e) => e.status === "Ativo" && e.access_profile !== "Inspetor")
    .map((employee) => {
      const attempts = data.attempts.filter((attempt) => attempt.matricula === employee.matricula);
      const passed = attempts.filter((attempt) => attempt.passed).length;
      const averageScore = attempts.length ? Math.round((attempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0) / attempts.length) * 10) / 10 : 0;
      const approvalRate = attempts.length ? Math.round((passed / attempts.length) * 100) : 0;
      const cron = data.cronograma.filter((entry) => entry.employee_id === employee.id || entry.employee_matricula === employee.matricula);
      const realized = cron.filter((entry) => entry.status === "Realizado").length;
      const executionRate = cron.length ? Math.round((realized / cron.length) * 100) : 0;
      return { employee, attempts: attempts.length, averageScore, approvalRate, executionRate };
    })
    .sort((a, b) => Number(b.attempts > 0) - Number(a.attempts > 0) || b.approvalRate - a.approvalRate || b.averageScore - a.averageScore || b.executionRate - a.executionRate || a.employee.full_name.localeCompare(b.employee.full_name, "pt-BR"))
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-[1280px] space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-[1.75rem] px-5 py-6 md:px-7 md:py-7" style={{ background: "linear-gradient(135deg,#171117 0%,#310912 54%,#160f14 100%)", border: "1px solid rgba(200,16,46,.28)", boxShadow: "0 12px 38px rgba(80,0,18,.18)" }}>
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full" style={{ background: "radial-gradient(circle,rgba(200,16,46,.28),transparent 68%)" }} />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="hidden h-[68px] w-[118px] shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-lg sm:flex"><img src={LOGO_URL} alt="EMPAT" className="max-h-full max-w-full object-contain" /></div>
            <div><p className="text-[10px] font-black uppercase tracking-[.24em]" style={{ color: "rgba(255,255,255,.50)" }}>{greeting}</p><h1 className="mt-1 text-2xl font-black tracking-tight md:text-[2rem]" style={{ color: "#ffffff" }}>{first}</h1><p className="mt-1 text-xs md:text-sm" style={{ color: "rgba(255,255,255,.52)" }}>{updatedAt} · Operação {year}</p></div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.13)" }}><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /><span className="text-sm font-black" style={{ color: "#ffffff" }}>{m.activeEmployees} ativos</span><span style={{ color: "rgba(255,255,255,.24)" }}>·</span><span className="text-sm font-black" style={{ color: priorityCount > 0 ? "#ff5a72" : "#86efac" }}>{priorityCount} em risco</span></div>
            <button type="button" onClick={() => refetch()} disabled={isFetching} className="flex h-11 w-11 items-center justify-center rounded-2xl transition-opacity disabled:opacity-50" style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.13)", color: "#fff" }} aria-label="Atualizar dashboard"><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /></button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="Funcionários" value={m.activeEmployees} icon={Users} sub={`${m.pending} pendência${m.pending === 1 ? "" : "s"}`} accent="#3b82f6" />
        <KPI label="Taxa aprovação" value={`${m.approvalRate}%`} icon={Shield} sub={`${m.passed} aprovações`} accent="#10b981" />
        <KPI label="Média geral" value={m.averageScore} icon={BarChart3} sub={`${m.attempts} tentativas`} accent="#f59e0b" />
        <KPI label="Cobertura" value={`${m.executionRate}%`} icon={Target} sub={`${m.realized} realizados`} accent="#e11d48" />
      </div>

      <Card className="p-3 md:p-4">
        <div className="mb-3 flex items-center gap-2 px-1"><span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--accent-soft)" }}><Target className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} /></span><h2 className="text-xs font-black uppercase tracking-[.08em]" style={{ color: "var(--text-3)" }}>Acesso rápido</h2></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">{quick.map(({ to, label, icon: Icon, accent }) => <Link key={to} to={to as any}><div className="group relative flex h-full min-h-[82px] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl p-3 text-center transition-[border-color,transform] duration-150 hover:-translate-y-0.5" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}><div className="absolute -right-7 -top-7 h-16 w-16 rounded-full opacity-[.08]" style={{ background: accent }} /><div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${accent}12` }}><Icon className="h-4 w-4" style={{ color: accent }} /></div><span className="text-[11px] font-bold" style={{ color: "var(--text-3)" }}>{label}</span></div></Link>)}</div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center gap-2 p-4" style={{ borderBottom: "1px solid var(--border)" }}><BarChart3 className="h-4 w-4" style={{ color: "var(--accent)" }} /><h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Média por Setor</h2><div className="ml-auto hidden items-center gap-3 sm:flex">{sectors.slice(0, 3).map((s, i) => <span key={s.sector} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--text-4)" }}><span className="h-2 w-2 rounded-full" style={{ background: ["#e11d48", "#3b82f6", "#10b981"][i % 3] }} />{s.sector} {s.executionRate}%</span>)}</div></div>
          {sectors.length === 0 ? <div className="py-16 text-center"><BarChart3 className="mx-auto h-9 w-9" style={{ color: "var(--text-4)" }} /><p className="mt-2 text-sm font-bold" style={{ color: "var(--text-2)" }}>Sem dados por setor</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Os indicadores aparecem quando houver lançamentos no Cronograma.</p></div> : <div className="px-5 pb-5 pt-6"><div className="flex h-[210px] items-end justify-around gap-5 border-b border-dashed" style={{ borderColor: "var(--border)" }}>{sectors.map((s, i) => { const color = ["#e11d48", "#3b82f6", "#10b981", "#f59e0b"][i % 4]; const height = Math.max(8, Math.min(100, s.executionRate)); return <div key={s.sector} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-black" style={{ color }}>{s.executionRate}%</span><div className="w-full max-w-[78px] rounded-t-xl" style={{ height: `${height}%`, background: color, minHeight: 12 }} /><span className="max-w-full truncate text-[11px] font-semibold" style={{ color: "var(--text-4)" }}>{s.sector}</span></div>; })}</div></div>}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 p-4" style={{ borderBottom: "1px solid var(--border)" }}><AlertTriangle className="h-4 w-4 text-amber-500" /><h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Zona de Risco</h2><span className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-black" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{priorityCount}</span></div>
          <div className="max-h-[276px] space-y-2 overflow-y-auto p-3">{priority.slice(0, 6).map((r) => <div key={r.employee.id} className="rounded-xl p-3" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold" style={{ color: "var(--text-1)" }}>{r.employee.full_name}</p><p className="mt-0.5 text-xs" style={{ color: "var(--text-4)" }}>{r.employee.sector}</p></div><span className="rounded-lg px-2 py-1 text-[10px] font-black" style={{ color: r.level === "Alto" ? "#fb7185" : r.level === "Médio" ? "#f59e0b" : "#60a5fa", background: r.level === "Alto" ? "rgba(225,29,72,.10)" : r.level === "Médio" ? "rgba(245,158,11,.10)" : "rgba(59,130,246,.10)" }}>{r.level}</span></div></div>)}{priorityCount === 0 && <div className="py-9 text-center"><Shield className="mx-auto h-9 w-9 text-emerald-500" /><p className="mt-2 text-sm font-bold text-emerald-500">Sem alertas relevantes</p></div>}</div>
          <div className="px-4 pb-4"><Link to="/risco" className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--accent)" }}>Ver todos <ChevronRight className="h-3 w-3" /></Link></div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 p-4" style={{ borderBottom: "1px solid var(--border)" }}><Trophy className="h-4 w-4 text-amber-500" /><h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Ranking de Desempenho</h2><span className="ml-auto text-[11px] font-semibold" style={{ color: "var(--text-4)" }}>Top {leaders.length}</span></div>
        {leaders.length === 0 ? <div className="p-9 text-center"><Trophy className="mx-auto h-8 w-8" style={{ color: "var(--text-4)" }} /><p className="mt-2 text-sm font-bold" style={{ color: "var(--text-2)" }}>Sem ranking disponível</p></div> : <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">{leaders.map((item, i) => <div key={item.employee.id} className="rounded-xl p-4 text-center" style={{ background: i === 0 ? "rgba(200,16,46,.08)" : "var(--bg-surface-2)", border: i === 0 ? "1px solid rgba(200,16,46,.28)" : "1px solid var(--border-subtle)" }}><div className="text-2xl">{["🥇", "🥈", "🥉", "4º"][i]}</div><p className="mt-2 truncate text-sm font-black" style={{ color: "var(--text-1)" }}>{item.employee.full_name}</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>{item.employee.sector}</p><span className="mt-3 inline-flex rounded-lg px-2.5 py-1 text-xs font-black text-amber-500" style={{ background: "rgba(245,158,11,.10)" }}>{item.attempts ? `${item.averageScore.toFixed(1)} média · ${item.approvalRate}% aprovação` : `${item.executionRate}% execução`}</span></div>)}</div>}
      </Card>
    </div>
  );
}
