import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Maximize2,
  RefreshCw,
  Shield,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { employeeRisk, getOperationalSnapshot, sectorMetrics, snapshotMetrics } from "@/lib/insights";
import { operationalYear } from "@/lib/operational-time";

const LOGO_URL = "https://media.base44.com/images/public/6a1117d573bbf85981b1abee/8271ac857_IMG_9226.png";

function Surface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl ${className}`}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card, var(--shadow-md))",
      }}
    >
      {children}
    </section>
  );
}

function KPI({
  label,
  value,
  icon: Icon,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  sub: string;
  accent: string;
}) {
  return (
    <Surface className="relative min-h-[126px] overflow-hidden p-4 xl:p-5">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[.08]" style={{ background: accent }} />
      <div className="relative flex h-full items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[.15em]" style={{ color: "var(--text-4)" }}>{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight xl:text-[2rem]" style={{ color: "var(--text-1)" }}>{value}</p>
          <p className="mt-1.5 truncate text-xs font-semibold" style={{ color: accent }}>{sub}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${accent}12`, border: `1px solid ${accent}30` }}>
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
      </div>
    </Surface>
  );
}

export function AdminDashboardV2() {
  const year = operationalYear();
  const { data: user } = useCurrentUser();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-snapshot", year],
    queryFn: () => getOperationalSnapshot(year),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  }
  if (!data) return <Surface className="mx-auto max-w-3xl p-8"><p style={{ color: "var(--text-3)" }}>Não foi possível carregar o dashboard.</p></Surface>;

  const metrics = snapshotMetrics(data);
  const sectors = sectorMetrics(data);
  const risk = employeeRisk(data);
  const priority = risk.filter((item) => item.score > 0);
  const priorityCount = priority.length;
  const first = user?.nome?.split(" ")[0] || "Inspetor";
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "2-digit", hourCycle: "h23", timeZone: "America/Maceio" }).format(now));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const updatedAt = now.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Maceio" });

  const quick = [
    { to: "/equipe", label: "Equipe", icon: Users, accent: "#3b82f6" },
    { to: "/analytics", label: "Analytics", icon: BarChart3, accent: "#e11d48" },
    { to: "/cronograma", label: "Cronograma", icon: CalendarDays, accent: "#f59e0b" },
    { to: "/ocorrencias", label: "Ocorrências", icon: AlertTriangle, accent: "#ef4444" },
    { to: "/provas", label: "Provas", icon: FileText, accent: "#8b5cf6" },
    { to: "/risco", label: "Zona de Risco", icon: Target, accent: "#f59e0b" },
    { to: "/individual", label: "Análise Individual", icon: BarChart3, accent: "#06b6d4" },
    { to: "/relatorios", label: "Relatórios", icon: FileSpreadsheet, accent: "#ec4899" },
  ];

  const leaders = data.employees
    .filter((employee) => employee.status === "Ativo" && employee.access_profile !== "Inspetor")
    .map((employee) => {
      const attempts = data.attempts.filter((attempt) => attempt.matricula === employee.matricula);
      const passed = attempts.filter((attempt) => attempt.passed).length;
      const averageScore = attempts.length
        ? Math.round((attempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0) / attempts.length) * 10) / 10
        : 0;
      const approvalRate = attempts.length ? Math.round((passed / attempts.length) * 100) : 0;
      const cron = data.cronograma.filter((entry) => entry.employee_id === employee.id || entry.employee_matricula === employee.matricula);
      const realized = cron.filter((entry) => entry.status === "Realizado").length;
      const executionRate = cron.length ? Math.round((realized / cron.length) * 100) : 0;
      return { employee, attempts: attempts.length, averageScore, approvalRate, executionRate };
    })
    .sort((a, b) => Number(b.attempts > 0) - Number(a.attempts > 0) || b.approvalRate - a.approvalRate || b.averageScore - a.averageScore || b.executionRate - a.executionRate || a.employee.full_name.localeCompare(b.employee.full_name, "pt-BR"))
    .slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-[1536px] space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-[1.75rem] px-5 py-6 md:px-7 lg:px-8 lg:py-7" style={{ background: "linear-gradient(135deg,#171117 0%,#310912 54%,#160f14 100%)", border: "1px solid rgba(200,16,46,.28)", boxShadow: "0 12px 38px rgba(80,0,18,.18)" }}>
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full" style={{ background: "radial-gradient(circle,rgba(200,16,46,.28),transparent 68%)" }} />
        <div className="relative grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
          <div className="flex min-w-0 items-center gap-5">
            <div className="hidden h-[72px] w-[124px] shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-lg sm:flex"><img src={LOGO_URL} alt="EMPAT" className="max-h-full max-w-full object-contain" /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[.24em]" style={{ color: "rgba(255,255,255,.50)" }}>{greeting}</p>
              <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-white md:text-[2rem] xl:text-[2.2rem]">{first}</h1>
              <p className="mt-1 text-xs md:text-sm" style={{ color: "rgba(255,255,255,.54)" }}>{updatedAt} · Operação {year}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-white" style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)" }}><span className="h-2 w-2 rounded-full bg-emerald-500" />{metrics.activeEmployees} ativos</span>
                <span className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: priorityCount ? "rgba(225,29,72,.12)" : "rgba(16,185,129,.10)", border: priorityCount ? "1px solid rgba(251,113,133,.20)" : "1px solid rgba(134,239,172,.18)", color: priorityCount ? "#ff7b90" : "#86efac" }}><AlertTriangle className="h-3.5 w-3.5" />{priorityCount} em risco</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <Link to="/atencao" className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-black text-white" style={{ background: "rgba(200,16,46,.22)", border: "1px solid rgba(255,104,128,.26)" }}><BellRing className="h-4 w-4" />Central de Atenção</Link>
            <Link to="/tv" className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white" style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.13)" }}><Maximize2 className="h-4 w-4" />Painel TV</Link>
            <button type="button" onClick={() => refetch()} disabled={isFetching} className="flex h-11 w-11 items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-50" style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.13)" }} aria-label="Atualizar dashboard"><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /></button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KPI label="Equipe ativa" value={metrics.activeEmployees} icon={Users} sub={`${metrics.pending} pendência${metrics.pending === 1 ? "" : "s"}`} accent="#3b82f6" />
        <KPI label="Taxa aprovação" value={`${metrics.approvalRate}%`} icon={Shield} sub={`${metrics.passed} aprovações`} accent="#10b981" />
        <KPI label="Média geral" value={metrics.averageScore} icon={BarChart3} sub={`${metrics.attempts} tentativas`} accent="#f59e0b" />
        <KPI label="Execução anual" value={`${metrics.executionRate}%`} icon={Target} sub={`${metrics.realized} realizados`} accent="#e11d48" />
      </div>

      <Surface className="p-3.5 lg:p-4">
        <div className="mb-3 flex items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--accent-soft)" }}><Target className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} /></span><div><h2 className="text-xs font-black uppercase tracking-[.08em]" style={{ color: "var(--text-2)" }}>Acesso rápido</h2><p className="hidden text-[10px] xl:block" style={{ color: "var(--text-4)" }}>Rotinas mais usadas pela Inspetoria</p></div></div>
          <span className="hidden text-[10px] font-bold uppercase tracking-[.12em] xl:block" style={{ color: "var(--text-4)" }}>8 atalhos</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">{quick.map(({ to, label, icon: Icon, accent }) => <Link key={to} to={to as never}><div className="group relative flex min-h-[88px] h-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl p-3 text-center transition-[border-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-sm" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}><div className="absolute -right-7 -top-7 h-16 w-16 rounded-full opacity-[.08]" style={{ background: accent }} /><div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${accent}12`, border: `1px solid ${accent}20` }}><Icon className="h-4 w-4" style={{ color: accent }} /></div><span className="text-[11px] font-bold" style={{ color: "var(--text-2)" }}>{label}</span></div></Link>)}</div>
      </Surface>

      <div className="grid gap-4 xl:grid-cols-12">
        <Surface className="overflow-hidden xl:col-span-8">
          <div className="flex items-center gap-2 p-4 lg:px-5" style={{ borderBottom: "1px solid var(--border)" }}><BarChart3 className="h-4 w-4" style={{ color: "var(--accent)" }} /><div><h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Execução por Setor</h2><p className="text-[10px]" style={{ color: "var(--text-4)" }}>Percentual realizado no cronograma do período</p></div><div className="ml-auto hidden items-center gap-3 2xl:flex">{sectors.slice(0, 4).map((sector, index) => <span key={sector.sector} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--text-4)" }}><span className="h-2 w-2 rounded-full" style={{ background: ["#e11d48", "#3b82f6", "#10b981", "#f59e0b"][index % 4] }} />{sector.sector} {sector.executionRate}%</span>)}</div></div>
          {sectors.length === 0 ? <div className="py-20 text-center"><BarChart3 className="mx-auto h-9 w-9" style={{ color: "var(--text-4)" }} /><p className="mt-2 text-sm font-bold" style={{ color: "var(--text-2)" }}>Sem dados por setor</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Os indicadores aparecem quando houver lançamentos no Cronograma.</p></div> : <div className="px-5 pb-5 pt-6 lg:px-6"><div className="flex h-[260px] items-end justify-around gap-5 border-b border-dashed 2xl:h-[300px]" style={{ borderColor: "var(--border)" }}>{sectors.map((sector, index) => { const color = ["#e11d48", "#3b82f6", "#10b981", "#f59e0b"][index % 4]; const height = Math.max(8, Math.min(100, sector.executionRate)); return <div key={sector.sector} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-black" style={{ color }}>{sector.executionRate}%</span><div className="w-full max-w-[96px] rounded-t-xl" style={{ height: `${height}%`, background: `linear-gradient(180deg,${color},${color}cc)`, minHeight: 14 }} /><span className="max-w-full truncate text-[11px] font-semibold" style={{ color: "var(--text-4)" }}>{sector.sector}</span></div>; })}</div></div>}
        </Surface>

        <Surface className="overflow-hidden xl:col-span-4">
          <div className="flex items-center gap-2 p-4 lg:px-5" style={{ borderBottom: "1px solid var(--border)" }}><AlertTriangle className="h-4 w-4 text-amber-500" /><div><h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Zona de Risco</h2><p className="text-[10px]" style={{ color: "var(--text-4)" }}>Profissionais que exigem acompanhamento</p></div><span className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-black" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{priorityCount}</span></div>
          <div className="max-h-[324px] space-y-2 overflow-y-auto p-3 lg:p-4">{priority.slice(0, 7).map((item) => <Link key={item.employee.id} to="/individual"><div className="rounded-xl p-3 transition-colors" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold" style={{ color: "var(--text-1)" }}>{item.employee.full_name}</p><p className="mt-0.5 text-xs" style={{ color: "var(--text-4)" }}>{item.employee.sector}</p></div><span className="rounded-lg px-2 py-1 text-[10px] font-black" style={{ color: item.level === "Alto" ? "#fb7185" : item.level === "Médio" ? "#f59e0b" : "#60a5fa", background: item.level === "Alto" ? "rgba(225,29,72,.10)" : item.level === "Médio" ? "rgba(245,158,11,.10)" : "rgba(59,130,246,.10)" }}>{item.level}</span></div></div></Link>)}{priorityCount === 0 && <div className="py-12 text-center"><Shield className="mx-auto h-9 w-9 text-emerald-500" /><p className="mt-2 text-sm font-bold text-emerald-500">Sem alertas relevantes</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Nenhum profissional exige ação neste momento.</p></div>}</div>
          <div className="px-4 pb-4 lg:px-5"><Link to="/risco" className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--accent)" }}>Abrir Zona de Risco <ChevronRight className="h-3 w-3" /></Link></div>
        </Surface>
      </div>

      <Surface className="overflow-hidden">
        <div className="flex items-center gap-2 p-4 lg:px-5" style={{ borderBottom: "1px solid var(--border)" }}><Trophy className="h-4 w-4 text-amber-500" /><div><h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Ranking de Desempenho</h2><p className="text-[10px]" style={{ color: "var(--text-4)" }}>Leitura combinada de aprovação, média e execução</p></div><span className="ml-auto text-[11px] font-semibold" style={{ color: "var(--text-4)" }}>Top {leaders.length}</span></div>
        {leaders.length === 0 ? <div className="p-10 text-center"><Trophy className="mx-auto h-8 w-8" style={{ color: "var(--text-4)" }} /><p className="mt-2 text-sm font-bold" style={{ color: "var(--text-2)" }}>Sem ranking disponível</p></div> : <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4 lg:p-4">{leaders.map((item, index) => <Link key={item.employee.id} to="/individual"><div className="h-full rounded-xl p-4 text-left transition-transform hover:-translate-y-0.5" style={{ background: index === 0 ? "rgba(200,16,46,.08)" : "var(--bg-surface-2)", border: index === 0 ? "1px solid rgba(200,16,46,.28)" : "1px solid var(--border-subtle)" }}><div className="flex items-start justify-between gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl text-lg" style={{ background: "var(--bg-surface)" }}>{["🥇", "🥈", "🥉", "4º"][index]}</div><ChevronRight className="h-4 w-4" style={{ color: "var(--text-4)" }} /></div><p className="mt-3 truncate text-sm font-black" style={{ color: "var(--text-1)" }}>{item.employee.full_name}</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>{item.employee.sector}</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-lg px-2.5 py-1 text-xs font-black text-amber-500" style={{ background: "rgba(245,158,11,.10)" }}>{item.attempts ? `${item.averageScore.toFixed(1)} média` : `${item.executionRate}% execução`}</span>{item.attempts > 0 && <span className="rounded-lg px-2.5 py-1 text-xs font-black text-emerald-500" style={{ background: "rgba(16,185,129,.09)" }}>{item.approvalRate}% aprovação</span>}</div></div></Link>)}</div>}
      </Surface>
    </div>
  );
}
