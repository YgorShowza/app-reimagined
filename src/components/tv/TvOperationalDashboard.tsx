import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleGauge,
  Clock3,
  Expand,
  ExternalLink,
  RefreshCcw,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { getTvDashboardData, type TvDashboardData, type TvMonthPoint } from "@/lib/tv-dashboard";
import { operationalYear } from "@/lib/operational-time";

const RED = "#e31837";
const GREEN = "#22c98b";
const AMBER = "#f4aa35";
const BLUE = "#4f8df7";
const PURPLE = "#9b7cf6";
const BG = "#080a0f";
const PANEL = "rgba(20,23,31,.92)";
const BORDER = "rgba(255,255,255,.085)";
const TEXT = "#f5f7fb";
const MUTED = "#8d94a4";

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Maceio",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDate(date: Date) {
  const text = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Maceio",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
  return text.replace(/\./g, "").toUpperCase();
}

function timeOnly(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : formatTime(date);
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`relative overflow-hidden rounded-[1.15rem] ${className}`}
      style={{ background: PANEL, border: `1px solid ${BORDER}`, boxShadow: "0 18px 45px rgba(0,0,0,.22)" }}
    >
      {children}
    </section>
  );
}

function PanelTitle({ icon: Icon, title, subtitle, accent = RED }: { icon: typeof Activity; title: string; subtitle?: string; accent?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}16`, border: `1px solid ${accent}34` }}>
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-[clamp(.82rem,1vw,1.05rem)] font-black tracking-tight" style={{ color: TEXT }}>{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-[clamp(.55rem,.62vw,.7rem)] font-medium" style={{ color: MUTED }}>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, detail, icon: Icon, accent, alert = false }: { label: string; value: string | number; detail: string; icon: typeof Users; accent: string; alert?: boolean }) {
  return (
    <div
      className="relative min-w-0 overflow-hidden rounded-[1rem] px-[clamp(.7rem,.85vw,1rem)] py-[clamp(.55rem,.72vh,.8rem)]"
      style={{ background: "linear-gradient(145deg,rgba(27,31,42,.98),rgba(15,18,25,.98))", border: `1px solid ${alert ? `${accent}50` : BORDER}` }}
    >
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: alert ? accent : `${accent}9a` }} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[clamp(.48rem,.55vw,.64rem)] font-black uppercase tracking-[.14em]" style={{ color: MUTED }}>{label}</p>
          <p className="mt-[clamp(.16rem,.3vh,.3rem)] truncate text-[clamp(1.25rem,2vw,2.15rem)] font-black leading-none tracking-tight" style={{ color: alert ? accent : TEXT }}>{value}</p>
        </div>
        <div className="flex h-[clamp(1.7rem,2.4vw,2.35rem)] w-[clamp(1.7rem,2.4vw,2.35rem)] shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}13`, border: `1px solid ${accent}25` }}>
          <Icon className="h-[clamp(.75rem,1vw,1rem)] w-[clamp(.75rem,1vw,1rem)]" style={{ color: accent }} />
        </div>
      </div>
      <p className="mt-[clamp(.18rem,.3vh,.35rem)] truncate text-[clamp(.47rem,.53vw,.61rem)] font-semibold" style={{ color: alert ? `${accent}d9` : MUTED }}>{detail}</p>
    </div>
  );
}

function MiniLegend({ color, label, value }: { color: string; label: string; value: string }) {
  return <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} /><span className="text-[clamp(.5rem,.58vw,.66rem)] font-bold" style={{ color: MUTED }}>{label}</span><span className="text-[clamp(.5rem,.58vw,.66rem)] font-black" style={{ color: TEXT }}>{value}</span></div>;
}

function linePath(values: number[], width: number, height: number, max = 100) {
  if (!values.length) return "";
  return values.map((raw, index) => {
    const value = Math.max(0, Math.min(max, raw));
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - (value / max) * height;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function TrendChart({ months }: { months: TvMonthPoint[] }) {
  const currentMonth = months.findIndex((row) => row.month === new Intl.DateTimeFormat("en-CA", { timeZone: "America/Maceio", year: "numeric", month: "2-digit" }).format(new Date()).replace("/", "-"));
  const lastIndex = currentMonth >= 0 ? currentMonth : Math.max(0, months.findLastIndex((row) => row.executionRate || row.attempts));
  const start = Math.max(0, lastIndex - 5);
  const visible = months.slice(start, lastIndex + 1);
  const points = visible.length ? visible : months.slice(0, 6);
  const width = 600;
  const height = 180;
  const execution = points.map((row) => row.executionRate);
  const approval = points.map((row) => row.approvalRate);
  return (
    <div className="mt-[clamp(.45rem,.8vh,.75rem)] flex h-[calc(100%-2.5rem)] min-h-0 flex-col">
      <div className="mb-1.5 flex flex-wrap gap-x-4 gap-y-1"><MiniLegend color={RED} label="Execução" value={`${execution.at(-1) ?? 0}%`} /><MiniLegend color={GREEN} label="Aprovação" value={`${approval.at(-1) ?? 0}%`} /></div>
      <div className="min-h-0 flex-1">
        <svg viewBox={`-28 -10 ${width + 44} ${height + 42}`} className="h-full w-full" preserveAspectRatio="none" aria-label="Evolução mensal de execução e aprovação">
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = height - (tick / 100) * height;
            return <g key={tick}><line x1="0" x2={width} y1={y} y2={y} stroke="rgba(255,255,255,.07)" strokeDasharray={tick === 0 ? undefined : "4 6"} /><text x="-8" y={y + 4} textAnchor="end" fill="#6f7686" fontSize="11">{tick}</text></g>;
          })}
          <path d={linePath(execution, width, height)} fill="none" stroke={RED} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={linePath(approval, width, height)} fill="none" stroke={GREEN} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {points.map((point, index) => {
            const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
            const executionY = height - (point.executionRate / 100) * height;
            const approvalY = height - (point.approvalRate / 100) * height;
            return <g key={point.month}><circle cx={x} cy={executionY} r="5" fill={BG} stroke={RED} strokeWidth="3" vectorEffect="non-scaling-stroke" /><circle cx={x} cy={approvalY} r="4" fill={BG} stroke={GREEN} strokeWidth="3" vectorEffect="non-scaling-stroke" /><text x={x} y={height + 24} textAnchor="middle" fill="#8d94a4" fontSize="12" fontWeight="700">{point.label}</text></g>;
          })}
        </svg>
      </div>
    </div>
  );
}

function PerformanceChart({ months, average }: { months: TvMonthPoint[]; average: number }) {
  const active = months.filter((row) => row.attempts > 0 || row.averageScore > 0).slice(-6);
  const visible = active.length ? active : months.slice(-6);
  const width = 520;
  const height = 160;
  const values = visible.map((row) => row.averageScore);
  return (
    <div className="mt-[clamp(.45rem,.7vh,.7rem)] flex h-[calc(100%-2.2rem)] min-h-0 flex-col">
      <div className="flex items-end justify-between gap-3">
        <div><span className="text-[clamp(1.25rem,2vw,2.2rem)] font-black leading-none" style={{ color: TEXT }}>{average.toFixed(1)}</span><span className="ml-1 text-[clamp(.55rem,.65vw,.75rem)] font-bold" style={{ color: MUTED }}>/ 10 média geral</span></div>
        <div className="rounded-lg px-2 py-1 text-[clamp(.48rem,.55vw,.62rem)] font-black" style={{ color: average >= 7 ? GREEN : AMBER, background: average >= 7 ? `${GREEN}12` : `${AMBER}12`, border: `1px solid ${average >= 7 ? GREEN : AMBER}24` }}>{average >= 7 ? "ACIMA DA META" : "ABAIXO DA META"}</div>
      </div>
      <div className="mt-1 min-h-0 flex-1">
        <svg viewBox={`-24 -8 ${width + 38} ${height + 38}`} className="h-full w-full" preserveAspectRatio="none" aria-label="Evolução da média de desempenho">
          {[0, 5, 7, 10].map((tick) => {
            const y = height - (tick / 10) * height;
            return <g key={tick}><line x1="0" x2={width} y1={y} y2={y} stroke={tick === 7 ? `${AMBER}80` : "rgba(255,255,255,.065)"} strokeDasharray={tick === 7 ? "7 6" : "4 6"} /><text x="-7" y={y + 4} textAnchor="end" fill={tick === 7 ? AMBER : "#6f7686"} fontSize="11">{tick}</text></g>;
          })}
          <path d={linePath(values, width, height, 10)} fill="none" stroke={BLUE} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {visible.map((point, index) => {
            const x = visible.length === 1 ? width / 2 : (index / (visible.length - 1)) * width;
            const y = height - (point.averageScore / 10) * height;
            return <g key={point.month}><circle cx={x} cy={y} r="5" fill={BG} stroke={BLUE} strokeWidth="3" vectorEffect="non-scaling-stroke" /><text x={x} y={height + 23} textAnchor="middle" fill="#8d94a4" fontSize="12" fontWeight="700">{point.label}</text></g>;
          })}
        </svg>
      </div>
    </div>
  );
}

function RiskDonut({ data }: { data: TvDashboardData["risk"] }) {
  const values = [data.normal, data.low, data.medium, data.high];
  const colors = [GREEN, BLUE, AMBER, RED];
  const total = values.reduce((sum, value) => sum + value, 0);
  let offset = 0;
  const circumference = 2 * Math.PI * 46;
  return (
    <div className="mt-[clamp(.35rem,.7vh,.65rem)] grid h-[calc(100%-2rem)] min-h-0 grid-cols-[1fr_.95fr] items-center gap-2">
      <div className="relative mx-auto aspect-square h-[min(16vh,9vw)] min-h-[88px] max-h-[150px]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="14" />
          {values.map((value, index) => {
            const length = total ? (value / total) * circumference : 0;
            const item = <circle key={index} cx="60" cy="60" r="46" fill="none" stroke={colors[index]} strokeWidth="14" strokeLinecap="butt" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />;
            offset += length;
            return item;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[clamp(1.2rem,1.9vw,2rem)] font-black leading-none" style={{ color: TEXT }}>{total}</span><span className="mt-1 text-[clamp(.45rem,.5vw,.58rem)] font-black uppercase tracking-[.14em]" style={{ color: MUTED }}>equipe</span></div>
      </div>
      <div className="space-y-[clamp(.28rem,.55vh,.5rem)]">
        {[['Normal', data.normal, GREEN], ['Baixo', data.low, BLUE], ['Médio', data.medium, AMBER], ['Alto', data.high, RED]].map(([label, value, color]) => <div key={String(label)} className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: String(color) }} /><span className="text-[clamp(.52rem,.62vw,.72rem)] font-bold" style={{ color: MUTED }}>{label}</span></div><span className="text-[clamp(.65rem,.75vw,.9rem)] font-black" style={{ color: TEXT }}>{value}</span></div>)}
      </div>
    </div>
  );
}

function SectorBars({ sectors }: { sectors: TvDashboardData["sectors"] }) {
  const rows = sectors.slice(0, 6);
  return <div className="mt-[clamp(.35rem,.55vh,.55rem)] grid h-[calc(100%-2.2rem)] min-h-0 content-center gap-[clamp(.26rem,.48vh,.48rem)]">{rows.length ? rows.map((sector) => <div key={sector.sector} className="grid grid-cols-[minmax(68px,1.15fr)_2.4fr_42px] items-center gap-2"><span className="truncate text-[clamp(.48rem,.56vw,.66rem)] font-bold" style={{ color: MUTED }}>{sector.sector}</span><div className="h-[clamp(.35rem,.55vh,.55rem)] overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.065)" }}><div className="h-full rounded-full" style={{ width: `${sector.executionRate}%`, background: sector.executionRate >= 80 ? GREEN : sector.executionRate >= 55 ? AMBER : RED }} /></div><span className="text-right text-[clamp(.52rem,.62vw,.72rem)] font-black" style={{ color: sector.executionRate >= 80 ? GREEN : sector.executionRate >= 55 ? AMBER : RED }}>{sector.executionRate}%</span></div>) : <p className="text-center text-xs" style={{ color: MUTED }}>Sem dados setoriais.</p>}</div>;
}

function OccurrenceBars({ occurrence }: { occurrence: TvDashboardData["occurrence"] }) {
  const total = occurrence.open + occurrence.analysis + occurrence.concluded;
  const active = occurrence.open + occurrence.analysis;
  const rows = [
    { label: "Abertas", value: occurrence.open, color: RED },
    { label: "Em análise", value: occurrence.analysis, color: AMBER },
    { label: "Concluídas", value: occurrence.concluded, color: GREEN },
  ];
  return <div className="mt-[clamp(.35rem,.6vh,.6rem)] flex h-[calc(100%-2.1rem)] min-h-0 flex-col justify-between"><div className="flex items-end justify-between"><div><span className="text-[clamp(1.2rem,1.8vw,2rem)] font-black" style={{ color: active ? AMBER : GREEN }}>{active}</span><span className="ml-1 text-[clamp(.48rem,.55vw,.62rem)] font-bold" style={{ color: MUTED }}>ativas</span></div><span className="text-[clamp(.48rem,.55vw,.62rem)] font-bold" style={{ color: MUTED }}>{total} registros</span></div><div className="space-y-[clamp(.28rem,.5vh,.5rem)]">{rows.map((row) => <div key={row.label}><div className="mb-1 flex justify-between"><span className="text-[clamp(.48rem,.56vw,.66rem)] font-bold" style={{ color: MUTED }}>{row.label}</span><span className="text-[clamp(.5rem,.6vw,.7rem)] font-black" style={{ color: row.color }}>{row.value}</span></div><div className="h-[clamp(.3rem,.45vh,.45rem)] rounded-full" style={{ background: "rgba(255,255,255,.06)" }}><div className="h-full rounded-full" style={{ width: `${total ? Math.max(4, (row.value / total) * 100) : 0}%`, background: row.color }} /></div></div>)}</div></div>;
}

function AttentionRadar({ items }: { items: TvDashboardData["attention"] }) {
  const colors = { info: GREEN, warning: AMBER, critical: RED };
  return <div className="mt-[clamp(.3rem,.5vh,.5rem)] grid h-[calc(100%-2rem)] min-h-0 content-center gap-[clamp(.25rem,.45vh,.45rem)]">{items.map((item) => <div key={item.id} className="grid grid-cols-[4px_1fr] gap-2.5 rounded-xl px-2.5 py-[clamp(.3rem,.48vh,.5rem)]" style={{ background: "rgba(255,255,255,.025)", border: `1px solid ${BORDER}` }}><span className="h-full rounded-full" style={{ background: colors[item.level] }} /><div className="min-w-0"><p className="truncate text-[clamp(.5rem,.58vw,.68rem)] font-black" style={{ color: TEXT }}>{item.title}</p><p className="mt-0.5 truncate text-[clamp(.43rem,.5vw,.58rem)] font-semibold" style={{ color: MUTED }}>{item.detail}</p></div></div>)}</div>;
}

function LoadingScreen() {
  return <div className="flex h-screen items-center justify-center" style={{ background: BG }}><div className="text-center"><div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#e31837]" /><p className="mt-4 text-xs font-black uppercase tracking-[.22em] text-white/45">Montando sala operacional</p></div></div>;
}

export function TvOperationalDashboard() {
  const navigate = useNavigate();
  const year = operationalYear();
  const [clock, setClock] = useState(() => new Date());
  const query = useQuery({
    queryKey: ["tv-operational-dashboard", year],
    queryFn: () => getTvDashboardData(year),
    refetchInterval: 60_000,
    staleTime: 45_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const levelColor = query.data?.level === "Crítica" ? RED : query.data?.level === "Atenção" ? AMBER : GREEN;
  const scoreAccent = (query.data?.metrics.averageScore ?? 0) >= 7 ? GREEN : AMBER;
  const fullScreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      // Navegadores de algumas Smart TVs não expõem a Fullscreen API; o painel continua funcional.
    }
  };

  const operationDetail = useMemo(() => {
    const data = query.data;
    if (!data) return "Carregando indicadores...";
    if (data.level === "Normal") return "Operação dentro do esperado";
    if (data.level === "Atenção") return "Acompanhamento requerido";
    return "Prioridade operacional";
  }, [query.data]);

  if (query.isLoading) return <LoadingScreen />;
  if (query.isError || !query.data) return <div className="flex h-screen items-center justify-center px-8 text-center" style={{ background: BG, color: TEXT }}><div><AlertTriangle className="mx-auto h-10 w-10" style={{ color: AMBER }} /><h1 className="mt-4 text-xl font-black">Painel TV indisponível</h1><p className="mt-2 text-sm" style={{ color: MUTED }}>Não foi possível consolidar os indicadores operacionais.</p><button onClick={() => query.refetch()} className="mt-5 rounded-xl px-4 py-2 text-sm font-black" style={{ background: RED, color: "white" }}>Tentar novamente</button></div></div>;

  const data = query.data;
  return (
    <div className="min-h-screen overflow-auto xl:h-screen xl:min-h-0 xl:overflow-hidden" style={{ background: `radial-gradient(circle at 78% 0%,rgba(227,24,55,.09),transparent 28%),radial-gradient(circle at 10% 100%,rgba(79,141,247,.055),transparent 30%),${BG}`, color: TEXT, fontFamily: "Inter, sans-serif" }}>
      <div className="mx-auto grid min-h-[900px] w-full min-w-[320px] max-w-[2200px] grid-rows-[auto_auto_auto_auto] gap-3 p-3 sm:p-4 xl:h-screen xl:min-h-0 xl:grid-rows-[8.5vh_14vh_40vh_31vh] xl:gap-[1.1vh] xl:p-[1.35vh_1.15vw]">
        <header className="flex min-h-[72px] items-center justify-between gap-4 rounded-[1.15rem] px-[clamp(.85rem,1.15vw,1.35rem)] py-2" style={{ background: "linear-gradient(90deg,rgba(18,20,28,.96),rgba(13,15,21,.94))", border: `1px solid ${BORDER}` }}>
          <div className="flex min-w-0 items-center gap-[clamp(.65rem,1vw,1.1rem)]">
            <div className="flex h-[clamp(2.5rem,3.6vw,3.5rem)] w-[clamp(2.5rem,3.6vw,3.5rem)] shrink-0 items-center justify-center rounded-[1rem]" style={{ background: "linear-gradient(145deg,#ef2847,#a90925)", boxShadow: "0 10px 28px rgba(227,24,55,.18)" }}><span className="text-[clamp(1rem,1.35vw,1.35rem)] font-black text-white">S</span></div>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-[clamp(1rem,1.55vw,1.6rem)] font-black tracking-[-.04em]">SEGEMPAT <span style={{ color: "#687080" }}>·</span> SALA OPERACIONAL</h1>{data.isDemo && <span className="rounded-md px-2 py-1 text-[clamp(.42rem,.48vw,.56rem)] font-black uppercase tracking-[.12em]" style={{ color: AMBER, background: `${AMBER}12`, border: `1px solid ${AMBER}30` }}>DADOS FICTÍCIOS</span>}</div><p className="mt-0.5 truncate text-[clamp(.48rem,.58vw,.68rem)] font-semibold" style={{ color: MUTED }}>Visão situacional agregada · Sem exposição de dados individuais · Porto de Maceió</p></div>
          </div>

          <div className="flex shrink-0 items-center gap-[clamp(.45rem,.75vw,.85rem)]">
            <div className="hidden min-w-[150px] lg:block"><div className="flex items-center gap-2"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-30" style={{ background: levelColor }} /><span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: levelColor }} /></span><span className="text-[clamp(.5rem,.58vw,.68rem)] font-black uppercase tracking-[.12em]" style={{ color: levelColor }}>{data.level}</span></div><p className="mt-1 text-[clamp(.42rem,.48vw,.56rem)] font-semibold" style={{ color: MUTED }}>{operationDetail}</p></div>
            <div className="hidden border-l pl-[clamp(.55rem,.8vw,.9rem)] sm:block" style={{ borderColor: BORDER }}><p className="text-right text-[clamp(.95rem,1.35vw,1.4rem)] font-black tabular-nums tracking-tight">{formatTime(clock)}</p><p className="text-right text-[clamp(.42rem,.5vw,.58rem)] font-bold" style={{ color: MUTED }}>{formatDate(clock)}</p></div>
            <button onClick={() => query.refetch()} title="Atualizar agora" className="flex h-[clamp(2rem,2.6vw,2.6rem)] w-[clamp(2rem,2.6vw,2.6rem)] items-center justify-center rounded-xl transition hover:bg-white/10" style={{ border: `1px solid ${BORDER}`, color: MUTED }}><RefreshCcw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /></button>
            <button onClick={fullScreen} title="Tela cheia" className="flex h-[clamp(2rem,2.6vw,2.6rem)] w-[clamp(2rem,2.6vw,2.6rem)] items-center justify-center rounded-xl transition hover:bg-white/10" style={{ border: `1px solid ${BORDER}`, color: MUTED }}><Expand className="h-4 w-4" /></button>
            <button onClick={() => navigate({ to: "/admin" })} title="Sair do Painel TV" className="flex h-[clamp(2rem,2.6vw,2.6rem)] w-[clamp(2rem,2.6vw,2.6rem)] items-center justify-center rounded-xl transition hover:bg-white/10" style={{ border: `1px solid ${BORDER}`, color: MUTED }}><X className="h-4 w-4" /></button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
          <KpiCard label="Situação" value={data.level} detail={data.levelReason} icon={ShieldCheck} accent={levelColor} alert={data.level !== "Normal"} />
          <KpiCard label="Equipe ativa" value={data.metrics.activeEmployees} detail="profissionais operacionais" icon={Users} accent={BLUE} />
          <KpiCard label="Execução mês" value={`${data.metrics.monthExecutionRate}%`} detail={`${data.metrics.annualExecutionRate}% no ano`} icon={Target} accent={data.metrics.monthExecutionRate >= 80 ? GREEN : AMBER} />
          <KpiCard label="Vencidas" value={data.metrics.overdue} detail={`${data.metrics.pending} pendência(s) total`} icon={Clock3} accent={data.metrics.overdue ? RED : GREEN} alert={data.metrics.overdue > 0} />
          <KpiCard label="Aprovação" value={`${data.metrics.approvalRate}%`} detail="provas concluídas" icon={CheckCircle2} accent={data.metrics.approvalRate >= 75 ? GREEN : AMBER} />
          <KpiCard label="Média" value={data.metrics.averageScore.toFixed(1)} detail="desempenho de 0 a 10" icon={TrendingUp} accent={scoreAccent} />
          <KpiCard label="Ocorrências" value={data.metrics.activeOccurrences} detail={data.metrics.criticalOccurrences ? `${data.metrics.criticalOccurrences} crítica(s)` : "ativas em tratamento"} icon={AlertTriangle} accent={data.metrics.criticalOccurrences ? RED : AMBER} alert={data.metrics.criticalOccurrences > 0} />
          <KpiCard label="Práticas" value={data.metrics.practicalPending} detail={`${data.metrics.practicalApprovalRate}% aprovação`} icon={CircleGauge} accent={PURPLE} />
        </div>

        <div className="grid min-h-0 gap-2.5 xl:grid-cols-[1.35fr_.72fr_1fr]">
          <Panel className="min-h-[300px] p-[clamp(.75rem,1vw,1.1rem)]"><PanelTitle icon={BarChart3} title="Ritmo Operacional" subtitle="Execução do Cronograma × aprovação nas avaliações" /><TrendChart months={data.months} /></Panel>
          <Panel className="min-h-[260px] p-[clamp(.75rem,1vw,1.1rem)]"><PanelTitle icon={ShieldCheck} title="Saúde da Equipe" subtitle="Distribuição agregada do risco de desempenho" accent={GREEN} /><RiskDonut data={data.risk} /></Panel>
          <Panel className="min-h-[300px] p-[clamp(.75rem,1vw,1.1rem)]"><PanelTitle icon={TrendingUp} title="Desempenho" subtitle="Evolução da média mensal · meta 7,0" accent={BLUE} /><PerformanceChart months={data.months} average={data.metrics.averageScore} /></Panel>
        </div>

        <div className="grid min-h-0 gap-2.5 pb-1 md:grid-cols-2 xl:grid-cols-[1.18fr_.72fr_1.12fr]">
          <Panel className="min-h-[220px] p-[clamp(.7rem,.92vw,1rem)]"><PanelTitle icon={Target} title="Execução por Setor" subtitle="Percentual realizado sobre o planejado" accent={PURPLE} /><SectorBars sectors={data.sectors} /></Panel>
          <Panel className="min-h-[220px] p-[clamp(.7rem,.92vw,1rem)]"><PanelTitle icon={AlertTriangle} title="Ocorrências" subtitle="Situação consolidada dos registros" accent={AMBER} /><OccurrenceBars occurrence={data.occurrence} /></Panel>
          <Panel className="min-h-[220px] p-[clamp(.7rem,.92vw,1rem)]"><div className="flex items-center justify-between gap-3"><PanelTitle icon={Activity} title="Radar Operacional" subtitle="O que merece sua atenção agora" accent={RED} /><div className="hidden items-center gap-1.5 2xl:flex"><span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} /><span className="text-[.55rem] font-bold" style={{ color: MUTED }}>Atualizado {timeOnly(data.generatedAt)}</span></div></div><AttentionRadar items={data.attention} /></Panel>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-1.5 right-3 hidden items-center gap-1 text-[9px] font-semibold text-white/20 xl:flex"><ExternalLink className="h-2.5 w-2.5" /> Atualização automática a cada 60 s</div>
    </div>
  );
}
