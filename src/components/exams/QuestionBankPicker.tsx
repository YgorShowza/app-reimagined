import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LibraryBig, Search, Plus, CheckCircle2 } from "lucide-react";
import { listQuestionBank, type QuestionBankItem } from "@/lib/training";
import { type ExamQuestion } from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function toExamQuestion(item: QuestionBankItem): ExamQuestion {
  const multipleChoice = item.options.length > 0;
  return {
    id: crypto.randomUUID(),
    type: multipleChoice ? "Múltipla escolha" : "Discursiva",
    statement: item.question_text,
    options: multipleChoice ? item.options : [],
    correct_index: multipleChoice ? Math.max(0, item.correct_index ?? 0) : 0,
    model_answer: multipleChoice ? undefined : item.correct_answer ?? "",
    points: 1,
  };
}

export function QuestionBankPicker({
  onAdd,
  existingStatements,
}: {
  onAdd: (question: ExamQuestion) => void;
  existingStatements: string[];
}) {
  const { data = [], isLoading } = useQuery({ queryKey: ["question-bank"], queryFn: listQuestionBank });
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("Todos");
  const [difficulty, setDifficulty] = useState("Todas");

  const normalizedExisting = useMemo(
    () => new Set(existingStatements.map((statement) => statement.trim().toLowerCase()).filter(Boolean)),
    [existingStatements],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((item) => {
      if (!item.active) return false;
      if (sector !== "Todos" && item.target_sector !== "Todos" && item.target_sector !== sector) return false;
      if (difficulty !== "Todas" && item.difficulty !== difficulty) return false;
      if (!q) return true;
      return [item.question_text, item.theme ?? "", item.target_sector, item.difficulty]
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [data, search, sector, difficulty]);

  const sectors = useMemo(
    () => ["Todos", ...Array.from(new Set(data.map((item) => item.target_sector).filter((value) => value && value !== "Todos")))],
    [data],
  );

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-surface)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)" }}
    >
      <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
            <LibraryBig className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h2 className="font-black text-sm" style={{ color: "var(--text-1)" }}>Banco de Questões</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-4)" }}>Reaproveite questões cadastradas sem perder a edição manual.</p>
          </div>
        </div>
        <span className="text-[10px] font-black px-2.5 py-1.5 rounded-full" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>
          {filtered.length} disponível(is)
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid gap-2 md:grid-cols-[1fr_160px_160px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-4)" }} />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por tema, enunciado ou setor..." className="pl-10" />
          </div>
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{sectors.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["Todas", "Básico", "Intermediário", "Avançado"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs" style={{ color: "var(--text-4)" }}>Carregando banco...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs" style={{ color: "var(--text-4)" }}>Nenhuma questão encontrada com esses filtros.</div>
        ) : (
          <div className="grid gap-2 max-h-72 overflow-y-auto pr-1">
            {filtered.map((item) => {
              const alreadyAdded = normalizedExisting.has(item.question_text.trim().toLowerCase());
              return (
                <article key={item.id} className="rounded-xl p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {item.theme && <span className="text-[9px] font-black px-2 py-1 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{item.theme}</span>}
                      <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ background: "var(--bg-surface-3)", color: "var(--text-4)" }}>{item.difficulty}</span>
                      <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ background: "var(--bg-surface-3)", color: "var(--text-4)" }}>{item.target_sector}</span>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>{item.question_text}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={alreadyAdded ? "outline" : "default"}
                    disabled={alreadyAdded}
                    onClick={() => onAdd(toExamQuestion(item))}
                    className={alreadyAdded ? "shrink-0" : "shrink-0 bg-[#C8102E] hover:bg-[#A00D24] text-white"}
                  >
                    {alreadyAdded ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Adicionada</> : <><Plus className="w-3.5 h-3.5 mr-1.5" /> Usar</>}
                  </Button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
