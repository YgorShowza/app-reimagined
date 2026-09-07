import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Target,
  UserRoundSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  getInspectorAttentionCenter,
  type AttentionCategory,
  type AttentionItem,
  type AttentionPriority,
} from "@/lib/attention-center";
import { operationalYear } from "@/lib/operational-time";

// O routeTree é regenerado pelo plugin TanStack durante o build. Até essa
// geração ocorrer, o arquivo tipado versionado ainda não conhece esta rota.
// @ts-expect-error rota file-based registrada pelo gerador TanStack no build
export const Route = createFileRoute("/_authenticated/atencao")({
  head: () => ({ meta: [{ title: "Central de Atenção · SEGEMPAT" }] }),
  component: AttentionCenterPage,
});

const PRIORITY = {
  critical: { label: "Crítica", color: "#ef4444", soft: "rgba(239,68,68,.10)", icon: ShieldAlert },
  attention: { label: "Atenção", color: "#f59e0b", soft: "rgba(245,158,11,.10)", icon: AlertTriangle },
  monitor: { label: "Acompanhar", color: "#3b82f6", soft: "rgba(59,130,246,.10)", icon: Target },
} satisfies Record<AttentionPriority, { label: string; color: string; soft: string; icon: typeof AlertTriangle }>;

const CATEGORY_ICON: Record<AttentionCategory, typeof AlertTriangle> = {
  Cronograma: CalendarClock,
  Equipe: UserRoundSearch,
  Ocorrências: CircleAlert,
  "Avaliação Prática": ClipboardCheck,
  Certificados: FileCheck2,
  Treinamento: GraduationCap,
};

function Surface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}
    >
      {children}
    </div>
  );
}

function displayDate(value: string | null) {
  if (!value) return null;
  const raw = value.length === 10 ? `${value}T12:00:00` : value;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Maceio",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(".", "");
}

function AttentionCenterPage() {
  const year = operationalYear();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const query = useQuery({
    queryKey: ["inspector-attention-center", year],
    queryFn: () => getInspectorAttentionCenter(year),
    enabled: Boolean(user?.isAdmin),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const [priorityFilter, setPriorityFilter] = useState<"all" | AttentionPriority>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | AttentionCategory>("all");

  if (userLoading) return <Loading />;
  if (!user?.isAdmin) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <ShieldCheck className="mx-auto h-10 w-10" style={{ color: "var(--accent)" }} />
        <h1 className="mt-3 text-lg font-black" style={{ color: "var(--text-1)" }}>Acesso restrito</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>A Central de Atenção é uma visão gerencial exclusiva da Inspetoria.</p>
      </div>
    );
  }
  if (query.isLoading) return <Loading />;
  if (query.isError || !query.data) {
    return (
      <Surface className="mx-auto max-w-xl p-8 text-center">
        <AlertTriangle className="mx-auto h-9 w-9 text-amber-500" />
        <p className="mt-3 font-black" style={{ color: "var(--text-1)" }}>Não foi possível consolidar a Central de Atenção.</p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>Nenhuma conclusão operacional é exibida enquanto a consolidação não terminar corretamente.</p>
        <Button className="mt-4" variant="outline" onClick={() => query.refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente</Button>
      </Surface>
    );
  }

  const data = query.data;
  const critical = data.items.filter((item) => item.priority === "critical");
  const attention = data.items.filter((item) => item.priority === "attention");
  const monitor = data.items.filter((item) => item.priority === "monitor");
  const failedSources = data.sourceStatus.filter((source) => !source.ok);
  const operationalState = critical.length > 0 ? "Crítico" : attention.length > 0 ? "Atenção" : monitor.length > 0 ? "Acompanhamento" : "Normal";
  const stateColor = critical.length > 0 ? "#ef4444" : attention.length > 0 ? "#f59e0b" : monitor.length > 0 ? "#3b82f6" : "#10b981";
  const categories = Array.from(new Set(data.items.map((item) => item.category))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const filtered = data.items.filter((item) =>
    (priorityFilter === "all" || item.priority === priorityFilter) &&
    (categoryFilter === "all" || item.category === categoryFilter),
  );
  const generated = new Date(data.generatedAt).toLocaleTimeString("pt-BR", {
    timeZone: "America/Maceio",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5 pb-10">
      <section
        className="relative overflow-hidden rounded-[1.8rem] p-5 md:p-7"
        style={{ background: "linear-gradient(135deg,#151014 0%,#330912 54%,#120f12 100%)", border: "1px solid rgba(200,16,46,.30)", boxShadow: "0 16px 44px rgba(80,0,18,.20)" }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full" style={{ background: `radial-gradient(circle,${stateColor}33,transparent 68%)` }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-white/45"><BellRing className="h-4 w-4" /> Prioridades da Inspetoria</div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-4xl">Central de Atenção</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">O que exige ação, acompanhamento ou decisão da Inspetoria agora. A Central consolida sinais dos módulos sem alterar o histórico de origem.</p>
          </div>
          <div className="flex min-w-[230px] items-center gap-4 rounded-2xl px-4 py-4" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)" }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${stateColor}18`, border: `1px solid ${stateColor}45` }}><ShieldAlert className="h-5 w-5" style={{ color: stateColor }} /></div>
            <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/40">Situação atual</p><p className="mt-1 text-xl font-black" style={{ color: stateColor }}>{operationalState}</p><p className="mt-1 text-[10px] text-white/35">Atualizado às {generated}</p></div>
            <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 disabled:opacity-50" aria-label="Atualizar Central"><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /></button>
          </div>
        </div>
      </section>

      {failedSources.length > 0 && (
        <Surface className="p-4">
          <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" /><div><p className="text-sm font-black" style={{ color: "var(--text-1)" }}>Consolidação parcial</p><p className="mt-1 text-xs leading-5" style={{ color: "var(--text-4)" }}>Não foi possível consultar: {failedSources.map((source) => source.source).join(", ")}. Os demais módulos continuam sendo exibidos, mas a situação geral pode estar incompleta.</p></div></div>
        </Surface>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Ações críticas" value={critical.length} icon={ShieldAlert} color="#ef4444" sub="prioridade imediata" />
        <Metric label="Em atenção" value={attention.length} icon={AlertTriangle} color="#f59e0b" sub="requer decisão" />
        <Metric label="Acompanhar" value={monitor.length} icon={Target} color="#3b82f6" sub="monitoramento" />
        <Metric label="Total sinalizado" value={data.items.length} icon={BellRing} color="var(--accent)" sub="todos os módulos" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Surface className="p-3 md:p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                <FilterButton active={priorityFilter === "all"} label={`Tudo · ${data.items.length}`} onClick={() => setPriorityFilter("all")} />
                <FilterButton active={priorityFilter === "critical"} label={`Críticas · ${critical.length}`} color="#ef4444" onClick={() => setPriorityFilter("critical")} />
                <FilterButton active={priorityFilter === "attention"} label={`Atenção · ${attention.length}`} color="#f59e0b" onClick={() => setPriorityFilter("attention")} />
                <FilterButton active={priorityFilter === "monitor"} label={`Acompanhar · ${monitor.length}`} color="#3b82f6" onClick={() => setPriorityFilter("monitor")} />
              </div>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as "all" | AttentionCategory)} className="h-9 rounded-xl px-3 text-xs font-bold outline-none" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                <option value="all">Todos os módulos</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
          </Surface>

          {filtered.length === 0 ? (
            <Surface className="p-10 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(16,185,129,.10)", border: "1px solid rgba(16,185,129,.20)" }}><CheckCircle2 className="h-7 w-7 text-emerald-500" /></div><p className="mt-4 font-black" style={{ color: "var(--text-1)" }}>Nenhuma prioridade neste filtro.</p><p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>Quando um módulo exigir atenção, o sinal aparecerá automaticamente aqui.</p></Surface>
          ) : (
            <div className="space-y-3">{filtered.map((item) => <AttentionCard key={item.id} item={item} />)}</div>
          )}
        </div>

        <aside className="space-y-4">
          <Surface className="overflow-hidden">
            <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}><p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: "var(--text-4)" }}>Leitura por módulo</p><h2 className="mt-1 text-base font-black" style={{ color: "var(--text-1)" }}>Radar de prioridades</h2></div>
            <div className="space-y-1 p-3">
              {data.sourceStatus.map((source) => {
                const count = data.items.filter((item) => item.category === source.source).length;
                const Icon = CATEGORY_ICON[source.source];
                return (
                  <button type="button" key={source.source} onClick={() => setCategoryFilter(source.source)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-[var(--bg-surface-2)]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: source.ok ? "var(--accent-soft)" : "rgba(245,158,11,.10)" }}><Icon className="h-4 w-4" style={{ color: source.ok ? "var(--accent)" : "#f59e0b" }} /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-black" style={{ color: "var(--text-1)" }}>{source.source}</p><p className="mt-0.5 text-[10px]" style={{ color: "var(--text-4)" }}>{source.ok ? `${count} sinal${count === 1 ? "" : "is"}` : "consulta indisponível"}</p></div>
                    <span className="text-lg font-black" style={{ color: count > 0 ? "var(--text-1)" : "var(--text-4)" }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </Surface>

          <Surface className="p-4">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /><p className="text-xs font-black" style={{ color: "var(--text-1)" }}>Como a Central funciona</p></div>
            <p className="mt-2 text-xs leading-5" style={{ color: "var(--text-4)" }}>Ela não altera ocorrências, notas ou cronogramas. Cada ação é concluída no módulo de origem, mantendo permissões, histórico e auditoria.</p>
          </Surface>
        </aside>
      </section>
    </div>
  );
}

function AttentionCard({ item }: { item: AttentionItem }) {
  const tone = PRIORITY[item.priority];
  const PriorityIcon = tone.icon;
  const CategoryIcon = CATEGORY_ICON[item.category];
  return (
    <Surface className="group relative overflow-hidden">
      <div className="absolute bottom-0 left-0 top-0 w-[4px]" style={{ background: tone.color }} />
      <div className="p-4 pl-5 md:p-5 md:pl-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: tone.soft, border: `1px solid ${tone.color}28` }}><CategoryIcon className="h-5 w-5" style={{ color: tone.color }} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[.10em]" style={{ background: tone.soft, color: tone.color }}><PriorityIcon className="h-3 w-3" />{tone.label}</span><span className="text-[10px] font-black uppercase tracking-[.08em]" style={{ color: "var(--text-4)" }}>{item.category}</span></div>
              <h3 className="mt-2 break-words text-sm font-black md:text-base" style={{ color: "var(--text-1)" }}>{item.title}</h3>
              <p className="mt-1 text-xs leading-5 md:text-sm" style={{ color: "var(--text-3)" }}>{item.description}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold" style={{ color: "var(--text-4)" }}>{item.context && <span>{item.context}</span>}{item.date && <span>{displayDate(item.date)}</span>}</div>
            </div>
          </div>
          <Link to={item.href as any} className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black transition-transform group-hover:translate-x-0.5 md:w-auto" style={{ background: tone.soft, border: `1px solid ${tone.color}28`, color: tone.color }}>{item.actionLabel}<ChevronRight className="h-3.5 w-3.5" /></Link>
        </div>
      </div>
    </Surface>
  );
}

function Metric({ label, value, icon: Icon, color, sub }: { label: string; value: number; icon: typeof AlertTriangle; color: string; sub: string }) {
  return (
    <Surface className="relative overflow-hidden p-4 md:p-5">
      <div className="absolute left-0 top-0 h-[3px] w-full" style={{ background: color }} />
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[.08]" style={{ background: color }} />
      <div className="relative flex items-start justify-between gap-3">
        <div><p className="text-[9px] font-black uppercase tracking-[.14em] md:text-[10px]" style={{ color: "var(--text-4)" }}>{label}</p><p className="mt-2 text-3xl font-black" style={{ color: "var(--text-1)" }}>{value}</p><p className="mt-1 text-[10px] font-bold md:text-[11px]" style={{ color }}>{sub}</p></div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}12`, border: `1px solid ${color}25` }}><Icon className="h-4 w-4" style={{ color }} /></div>
      </div>
    </Surface>
  );
}

function FilterButton({ active, label, onClick, color = "var(--accent)" }: { active: boolean; label: string; onClick: () => void; color?: string }) {
  return <button type="button" onClick={onClick} className="rounded-xl px-3 py-2 text-[10px] font-black transition-colors md:text-xs" style={active ? { background: `${color}14`, border: `1px solid ${color}40`, color } : { background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-4)" }}>{label}</button>;
}

function Loading() {
  return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
}
