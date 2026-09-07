import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  CalendarClock,
  ChevronRight,
  FileBadge,
  Gauge,
  GraduationCap,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listTrainingModules, type TrainingModule } from "@/lib/training-modules";
import { getMyTrainingSchedule } from "@/lib/training-schedules";
import { getCurrentEmployeeByAuth } from "@/lib/insights";
import { useCurrentUser } from "@/lib/useCurrentUser";

function formatCycleDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function TrainingLibrary() {
  const { data: user } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TrainingModule | null>(null);

  const modulesQuery = useQuery({ queryKey: ["training-modules"], queryFn: listTrainingModules });
  const employeeQuery = useQuery({ queryKey: ["current-employee-training"], queryFn: getCurrentEmployeeByAuth, enabled: !user?.isAdmin, staleTime: 60_000 });
  const scheduleQuery = useQuery({ queryKey: ["my-training-schedule"], queryFn: getMyTrainingSchedule, enabled: !user?.isAdmin, staleTime: 60_000 });
  const sector = user?.isAdmin ? "" : employeeQuery.data?.sector || user?.setor || "";

  const modules = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (modulesQuery.data ?? [])
      .filter((module) => module.status === "Ativo")
      .filter((module) => user?.isAdmin || module.target_sector === "Todos" || module.target_sector === sector)
      .filter((module) => !query || [module.title, module.description, module.target_sector].some((value) => (value || "").toLowerCase().includes(query)))
      .sort((a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title, "pt-BR"));
  }, [modulesQuery.data, search, sector, user?.isAdmin]);

  if (selected) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 pb-10">
        <Button variant="ghost" onClick={() => setSelected(null)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar à Academia</Button>
        <section className="overflow-hidden rounded-[1.5rem]" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
          <div className="p-5 md:p-7" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)" }}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#C8A000,#FFD700)", color: "#111" }}><BookOpen className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/40">Módulo {selected.display_order}</p>
                <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">{selected.title}</h1>
                <p className="mt-2 text-sm text-white/55">{selected.description}</p>
                <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.72)" }}>{selected.target_sector}</span><span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: "rgba(200,16,46,.18)", color: "#ff8092" }}>Nota mínima {Number(selected.min_score).toLocaleString("pt-BR")}</span></div>
              </div>
            </div>
          </div>
          <article className="p-5 md:p-8">
            <div className="whitespace-pre-wrap text-sm leading-7" style={{ color: "var(--text-2)" }}>{selected.content || selected.description}</div>
          </article>
        </section>
      </div>
    );
  }

  const loading = modulesQuery.isLoading || (!user?.isAdmin && employeeQuery.isLoading);
  const loadError = modulesQuery.isError || (!user?.isAdmin && employeeQuery.isError);
  const schedule = scheduleQuery.data ?? null;
  const cycleColor = schedule?.status === "Em dia" ? "#10b981" : schedule?.status === "Próximo ao vencimento" ? "#f59e0b" : "#ef4444";
  const firstModule = modules[0] ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-[1.75rem] p-5 md:p-6 lg:p-7" style={{ background: "linear-gradient(135deg,#151017 0%,#310912 55%,#111216 100%)", border: "1px solid rgba(200,16,46,.26)", boxShadow: "0 14px 38px rgba(70,0,16,.16)" }}>
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle,rgba(255,215,0,.12),transparent 68%)" }} />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl p-3" style={{ background: "linear-gradient(135deg,#C8A000,#FFD700)", color: "#111", boxShadow: "0 12px 24px rgba(255,215,0,.12)" }}><GraduationCap className="h-6 w-6" /></div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-white/40"><Sparkles className="h-4 w-4" /> Desenvolvimento operacional</div>
              <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Academia SEGEMPAT</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">Capacitação contínua, prática controlada e acompanhamento do desenvolvimento profissional em um único ambiente.</p>
            </div>
          </div>
          {!user?.isAdmin && firstModule && <button type="button" onClick={() => setSelected(firstModule)} className="flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left xl:w-[360px]" style={{ background: "rgba(255,255,255,.09)", border: "1px solid rgba(255,255,255,.14)" }}><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/40">Continuar capacitação</p><p className="mt-1 truncate text-sm font-black text-white">{firstModule.title}</p><p className="mt-1 text-[10px] text-white/40">Abrir primeiro módulo disponível</p></div><ChevronRight className="h-5 w-5 shrink-0 text-white/50" /></button>}
        </div>
      </section>

      {!user?.isAdmin && (
        <section className="grid gap-3 md:grid-cols-3">
          <AcademyMetric label="Módulos disponíveis" value={loading ? "…" : String(modules.length)} icon={BookOpen} accent="#3b82f6" sub={sector || "Seu perfil"} />
          <AcademyMetric label="Ciclo de capacitação" value={scheduleQuery.isLoading ? "…" : schedule?.status || "Não configurado"} icon={CalendarClock} accent={schedule ? cycleColor : "#94a3b8"} sub={schedule ? `${schedule.cycle_days} dias` : "Aguardando configuração"} />
          <AcademyMetric label="Próximo vencimento" value={scheduleQuery.isLoading ? "…" : schedule ? formatCycleDate(schedule.window_end) : "—"} icon={Target} accent={schedule ? cycleColor : "#94a3b8"} sub={schedule ? `atenção em ${formatCycleDate(schedule.window_start)}` : "sem ciclo ativo"} />
        </section>
      )}

      {!user?.isAdmin && <section className="rounded-2xl p-4 md:p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: "var(--accent)" }}>Prática & desenvolvimento</p><h2 className="mt-1 text-lg font-black" style={{ color: "var(--text-1)" }}>Escolha como treinar agora</h2><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Ferramentas independentes, reunidas em uma única porta de entrada.</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AcademyTool path="/teste-rapido" icon={Zap} title="Teste Rápido" description="Revisão curta e objetiva para fixação de conteúdo." accent="#f59e0b" />
          <AcademyTool path="/simulador" icon={Gauge} title="Simulador" description="Treino estruturado com situações e tomada de decisão." accent="#3b82f6" />
          <AcademyTool path="/stress-test" icon={ShieldAlert} title="Stress Test" description="Exercícios de resposta sob maior pressão operacional." accent="#ef4444" />
          <AcademyTool path="/desafio-diario" icon={Award} title="Desafio Diário" description="Uma atividade recorrente para manter a rotina de aprendizagem." accent="#8b5cf6" />
          <AcademyTool path="/progresso" icon={TrendingUp} title="Meu Progresso" description="Acompanhe desempenho, evolução e pontos de atenção." accent="#10b981" />
          <AcademyTool path="/certificados" icon={FileBadge} title="Certificados" description="Consulte aprovações e documentos disponíveis." accent="#C8102E" />
        </div>
      </section>}

      {!user?.isAdmin && (
        scheduleQuery.isLoading ? <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><p className="text-sm" style={{ color: "var(--text-4)" }}>Carregando seu ciclo de capacitação...</p></section> : scheduleQuery.isError ? <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><div className="flex flex-wrap items-center gap-3"><AlertTriangle className="h-5 w-5 text-amber-500" /><div className="min-w-0 flex-1"><p className="text-sm font-black" style={{ color: "var(--text-1)" }}>Ciclo de capacitação indisponível</p><p className="mt-0.5 text-xs" style={{ color: "var(--text-4)" }}>Não foi possível consultar o vencimento do seu ciclo.</p></div><Button size="sm" variant="outline" onClick={() => scheduleQuery.refetch()}><RefreshCw className="mr-2 h-3.5 w-3.5" /> Tentar novamente</Button></div></section> : schedule ? <section className="rounded-2xl p-4 md:p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${cycleColor}14`, color: cycleColor }}><CalendarClock className="h-5 w-5" /></div><div><p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: "var(--text-4)" }}>Meu ciclo de capacitação</p><div className="mt-1 flex flex-wrap items-center gap-2"><p className="font-black" style={{ color: "var(--text-1)" }}>Ciclo de {schedule.cycle_days} dias</p><span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ color: cycleColor, background: `${cycleColor}12`, border: `1px solid ${cycleColor}28` }}>{schedule.status}</span></div></div></div><div className="grid grid-cols-3 gap-3 text-xs sm:text-right"><div><p style={{ color: "var(--text-4)" }}>Último</p><p className="mt-1 font-bold" style={{ color: "var(--text-2)" }}>{formatCycleDate(schedule.last_training_date)}</p></div><div><p style={{ color: "var(--text-4)" }}>Atenção</p><p className="mt-1 font-bold" style={{ color: "var(--text-2)" }}>{formatCycleDate(schedule.window_start)}</p></div><div><p style={{ color: "var(--text-4)" }}>Vence</p><p className="mt-1 font-black" style={{ color: cycleColor }}>{formatCycleDate(schedule.window_end)}</p></div></div></div></section> : <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><div className="flex items-center gap-3"><CalendarClock className="h-5 w-5" style={{ color: "var(--text-4)" }} /><div><p className="text-sm font-black" style={{ color: "var(--text-1)" }}>Ciclo ainda não configurado</p><p className="mt-0.5 text-xs" style={{ color: "var(--text-4)" }}>A Inspetoria ainda não cadastrou um ciclo de capacitação para sua matrícula.</p></div></div></section>
      )}

      <section id="biblioteca-treinamentos" className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: "var(--accent)" }}>Biblioteca</p><h2 className="mt-1 text-lg font-black" style={{ color: "var(--text-1)" }}>{user?.isAdmin ? "Módulos ativos" : "Conteúdos para sua função"}</h2></div><div className="relative w-full md:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-4)" }} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar treinamento..." className="pl-10" /></div></div>

        {loading ? <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div> : loadError ? (
          <section className="rounded-2xl p-10 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <AlertTriangle className="mx-auto h-9 w-9 text-amber-500" />
            <p className="mt-3 font-black" style={{ color: "var(--text-1)" }}>Não foi possível carregar os treinamentos.</p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>Tente novamente. Se o problema persistir, informe a Inspetoria.</p>
            <Button variant="outline" className="mt-4" onClick={() => { modulesQuery.refetch(); if (!user?.isAdmin) employeeQuery.refetch(); }}><RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente</Button>
          </section>
        ) : modules.length === 0 ? (
          <section className="rounded-2xl p-12 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><GraduationCap className="mx-auto h-10 w-10 opacity-25" /><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Nenhum treinamento disponível.</p></section>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {modules.map((module) => (
              <button key={module.id} onClick={() => setSelected(module)} className="w-full rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5 md:p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{module.display_order}</div>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black" style={{ color: "var(--text-1)" }}>{module.title}</h3><span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--bg-surface-3)", color: "var(--text-4)" }}><Target className="h-3 w-3" /> {module.target_sector}</span></div><p className="mt-1 line-clamp-2 text-sm" style={{ color: "var(--text-3)" }}>{module.description}</p></div>
                  <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "var(--text-4)" }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AcademyMetric({ label, value, icon: Icon, accent, sub }: { label: string; value: string; icon: typeof BookOpen; accent: string; sub: string }) {
  return <div className="relative overflow-hidden rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}><div className="absolute left-0 top-0 h-[3px] w-full" style={{ background: accent }} /><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.13em]" style={{ color: "var(--text-4)" }}>{label}</p><p className="mt-2 truncate text-xl font-black" style={{ color: "var(--text-1)" }}>{value}</p><p className="mt-1 truncate text-[10px] font-bold" style={{ color: accent }}>{sub}</p></div><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}12`, border: `1px solid ${accent}28` }}><Icon className="h-4 w-4" style={{ color: accent }} /></div></div></div>;
}

function AcademyTool({ path, icon: Icon, title, description, accent }: { path: string; icon: typeof Zap; title: string; description: string; accent: string }) {
  return <Link to={path} className="group rounded-2xl p-4 transition-transform hover:-translate-y-0.5" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}12`, color: accent }}><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-black" style={{ color: "var(--text-1)" }}>{title}</p><p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-4)" }}>{description}</p></div><ChevronRight className="mt-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: "var(--text-4)" }} /></div></Link>;
}
