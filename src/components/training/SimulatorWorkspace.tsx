import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { submitTrainingActivity } from "@/lib/training-activities";
import { useCurrentUser } from "@/lib/useCurrentUser";

interface Scenario {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  target_sector: string | null;
  difficulty: string | null;
  theme: string | null;
}

async function listScenarios(): Promise<Scenario[]> {
  const { data, error } = await (supabase as any)
    .from("question_bank")
    .select("id,question_text,options,correct_index,explanation,target_sector,difficulty,theme")
    .eq("bank_type", "simulacoes")
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ ...row, options: Array.isArray(row.options) ? row.options : [] })) as Scenario[];
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function SimulatorWorkspace() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const scenariosQuery = useQuery({ queryKey: ["simulator-scenarios"], queryFn: listScenarios, staleTime: 60_000 });
  const [sector, setSector] = useState("Todos");
  const [difficulty, setDifficulty] = useState("Básico");
  const [session, setSession] = useState<Scenario[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<{ scenarioId: string; selectedIndex: number; correct: boolean }[]>([]);
  const [finished, setFinished] = useState<{ correct: number; score: number; xp: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const available = useMemo(() => {
    const rows = scenariosQuery.data ?? [];
    return rows.filter((row) => {
      const sectorOk = sector === "Todos" ? true : row.target_sector === "Todos" || row.target_sector === sector;
      const difficultyOk = !difficulty || row.difficulty === difficulty;
      return sectorOk && difficultyOk;
    });
  }, [scenariosQuery.data, sector, difficulty]);

  const start = () => {
    const picked = shuffle(available).slice(0, Math.min(4, available.length));
    setSession(picked);
    setCurrent(0);
    setSelected(null);
    setResults([]);
    setFinished(null);
  };

  const scenario = session[current];
  const alreadyAnswered = selected !== null;
  const selectedCorrect = alreadyAnswered && scenario ? selected === scenario.correct_index : false;

  const choose = (index: number) => {
    if (!scenario || selected !== null) return;
    setSelected(index);
    setResults((prev) => [...prev, { scenarioId: scenario.id, selectedIndex: index, correct: index === scenario.correct_index }]);
  };

  const next = async () => {
    if (!scenario || selected === null) return;
    if (current < session.length - 1) {
      setCurrent((value) => value + 1);
      setSelected(null);
      return;
    }

    const correct = results.filter((item) => item.correct).length;
    const score = session.length ? Number(((correct / session.length) * 10).toFixed(1)) : 0;
    setSubmitting(true);
    try {
      const response = await submitTrainingActivity({
        activityType: "Simulador",
        activityTitle: `Simulador ${difficulty}`,
        answers: results.map((item) => ({ scenario_id: item.scenarioId, selected_index: item.selectedIndex, correct: item.correct })),
        score,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["employees-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["training-activities-my"] }),
      ]);
      setFinished({ correct, score, xp: response.points_earned });
    } finally {
      setSubmitting(false);
    }
  };

  if (scenariosQuery.isLoading) {
    return <div className="flex justify-center py-20"><div className="h-9 w-9 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 py-6 text-center">
        <div className="text-6xl">🎯</div>
        <section className="rounded-3xl p-7" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
          <p className="text-[10px] font-black uppercase tracking-[.2em]" style={{ color: "var(--text-4)" }}>Simulação concluída</p>
          <h1 className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{finished.correct}/{session.length} cenários corretos</h1>
          <p className="mt-3 text-5xl font-black" style={{ color: finished.score >= 7 ? "#10b981" : "#C8102E" }}>{finished.score.toFixed(1)}</p>
          <div className="mt-4 inline-flex rounded-full px-4 py-2 text-sm font-black text-white" style={{ background: "#0ea5e9" }}>{finished.xp > 0 ? `+${finished.xp} XP` : "XP diário já recebido"}</div>
        </section>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={start}>Nova simulação</Button>
          <Button asChild className="bg-[#C8102E] text-white hover:bg-[#A00D24]"><a href="/painel">Voltar ao painel</a></Button>
        </div>
      </div>
    );
  }

  if (!session.length) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 pb-10">
        <section className="rounded-[1.6rem] p-6 text-center" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 52%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
          <div className="text-5xl">🎯</div>
          <h1 className="mt-3 text-2xl font-black text-white">Simulador de Ocorrências</h1>
          <p className="mt-1 text-sm text-white/55">Cenários operacionais com decisão, feedback imediato e treino livre.</p>
        </section>

        <section className="rounded-2xl p-5 space-y-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-4)" }}>Setor</span><select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}><option>Todos</option><option>Vigilância</option><option>CFTV</option></select></label>
            <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-4)" }}>Dificuldade</span><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}><option>Básico</option><option>Intermediário</option><option>Avançado</option></select></label>
          </div>
          <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(14,165,233,.08)", border: "1px solid rgba(14,165,233,.2)", color: "#0ea5e9" }}>Disponíveis para este filtro: <strong>{available.length}</strong> cenário(s). A sessão usa até 4 cenários. A primeira conclusão do dia rende até 20 XP.</div>
          <Button onClick={start} disabled={available.length === 0} className="w-full bg-[#C8102E] text-white hover:bg-[#A00D24]"><Play className="mr-2 h-4 w-4" /> Iniciar simulação</Button>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em]" style={{ color: "var(--text-4)" }}>Simulador</p><h1 className="text-xl font-black" style={{ color: "var(--text-1)" }}>{scenario?.theme || "Cenário operacional"}</h1></div><span className="rounded-full px-3 py-1 text-xs font-black text-white" style={{ background: "#C8102E" }}>{current + 1}/{session.length}</span></div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-3)" }}><div className="h-full rounded-full bg-[#C8102E] transition-[width] duration-200" style={{ width: `${((current + 1) / session.length) * 100}%` }} /></div>

      <section className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}><p className="text-sm font-bold leading-6" style={{ color: "var(--text-1)" }}>{scenario?.question_text}</p></section>

      <div className="space-y-2.5">{scenario?.options.map((option, index) => {
        const correct = alreadyAnswered && index === scenario.correct_index;
        const wrong = alreadyAnswered && index === selected && !correct;
        return <button key={index} onClick={() => choose(index)} disabled={alreadyAnswered} className="w-full rounded-xl p-4 text-left text-sm font-semibold transition-colors" style={{ background: correct ? "rgba(16,185,129,.08)" : wrong ? "rgba(239,68,68,.08)" : "var(--bg-surface)", border: `1.5px solid ${correct ? "rgba(16,185,129,.45)" : wrong ? "rgba(239,68,68,.45)" : "var(--border)"}`, color: correct ? "#10b981" : wrong ? "#ef4444" : "var(--text-2)" }}><span className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black" style={{ background: correct ? "#10b981" : wrong ? "#ef4444" : "var(--bg-surface-2)", color: correct || wrong ? "white" : "var(--text-4)" }}>{String.fromCharCode(65 + index)}</span><span className="flex-1">{option}</span>{correct ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : wrong ? <XCircle className="h-4 w-4 shrink-0" /> : null}</span></button>;
      })}</div>

      {alreadyAnswered && <section className="rounded-xl p-4" style={{ background: selectedCorrect ? "rgba(16,185,129,.07)" : "rgba(245,158,11,.08)", border: `1px solid ${selectedCorrect ? "rgba(16,185,129,.25)" : "rgba(245,158,11,.3)"}` }}><p className="text-sm font-black" style={{ color: selectedCorrect ? "#10b981" : "#f59e0b" }}>{selectedCorrect ? "Decisão correta" : "Não foi a melhor escolha"}</p><p className="mt-1 text-sm leading-6" style={{ color: "var(--text-2)" }}>{scenario?.explanation || "Revise a melhor conduta operacional para este cenário."}</p></section>}

      {alreadyAnswered && <Button onClick={next} disabled={submitting} className="w-full bg-[#C8102E] text-white hover:bg-[#A00D24]">{current < session.length - 1 ? <>Próximo cenário <ArrowRight className="ml-2 h-4 w-4" /></> : submitting ? "Registrando..." : "Finalizar simulação"}</Button>}
      <p className="text-center text-[11px]" style={{ color: "var(--text-4)" }}>Perfil: {user?.nome || "Operador"} · {difficulty} · {sector}</p>
    </div>
  );
}
