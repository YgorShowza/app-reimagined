import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, BookOpen, ChevronRight, GraduationCap, RefreshCw, Search, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listTrainingModules, type TrainingModule } from "@/lib/training-modules";
import { getCurrentEmployeeByAuth } from "@/lib/insights";
import { useCurrentUser } from "@/lib/useCurrentUser";

export function TrainingLibrary() {
  const { data: user } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TrainingModule | null>(null);

  const modulesQuery = useQuery({ queryKey: ["training-modules"], queryFn: listTrainingModules });
  const employeeQuery = useQuery({ queryKey: ["current-employee-training"], queryFn: getCurrentEmployeeByAuth, enabled: !user?.isAdmin, staleTime: 60_000 });
  const sector = user?.isAdmin ? "" : employeeQuery.data?.sector || user?.setor || "";

  const modules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (modulesQuery.data ?? [])
      .filter((module) => module.status === "Ativo")
      .filter((module) => user?.isAdmin || module.target_sector === "Todos" || module.target_sector === sector)
      .filter((module) => !q || [module.title, module.description, module.target_sector].some((value) => (value || "").toLowerCase().includes(q)))
      .sort((a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title, "pt-BR"));
  }, [modulesQuery.data, search, sector, user?.isAdmin]);

  if (selected) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 pb-10">
        <Button variant="ghost" onClick={() => setSelected(null)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos treinamentos</Button>
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

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <section className="rounded-[1.5rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#C8A000,#FFD700)", color: "#111" }}><GraduationCap className="h-6 w-6" /></div>
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/40">Capacitação contínua</p><h1 className="mt-1 text-2xl font-black text-white md:text-3xl">Treinamentos</h1><p className="mt-1 text-sm text-white/50">{user?.isAdmin ? "Visualização dos módulos ativos." : sector ? `Conteúdos disponíveis para ${sector}.` : "Conteúdos disponíveis para seu perfil."}</p></div>
        </div>
      </section>

      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-4)" }} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar treinamento..." className="pl-10" /></div>

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
        <div className="space-y-3">
          {modules.map((module) => (
            <button key={module.id} onClick={() => setSelected(module)} className="w-full rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5 md:p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{module.display_order}</div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-black" style={{ color: "var(--text-1)" }}>{module.title}</h2><span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--bg-surface-3)", color: "var(--text-4)" }}><Target className="h-3 w-3" /> {module.target_sector}</span></div><p className="mt-1 line-clamp-2 text-sm" style={{ color: "var(--text-3)" }}>{module.description}</p></div>
                <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "var(--text-4)" }} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
