import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, CheckCircle2, ChevronLeft, ChevronRight, CircleOff, Pencil, Plus, Search, Trash2, Layers3, ShieldCheck, Gauge, Crosshair } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  createQuestionBankItem,
  deleteQuestionBankItem,
  listQuestionBank,
  updateQuestionBankItem,
  type QuestionBankInput,
  type QuestionBankItem,
} from "@/lib/question-bank";

const PAGE_SIZE = 20;
const TARGET_SECTORS = ["Todos", "CFTV", "Vigilância", "Portaria", "Ronda", "Administrativo", "Operações"] as const;

const EMPTY: QuestionBankInput = {
  bank_type: "Múltipla escolha",
  question_text: "",
  options: ["", "", "", ""],
  correct_index: 0,
  correct_answer: null,
  explanation: null,
  target_sector: "Todos",
  difficulty: "Médio",
  theme: "",
  active: true,
};

function Metric({ label, value, icon: Icon, accent, sub }: { label: string; value: number; icon: typeof Layers3; accent: string; sub: string }) {
  return <div className="relative overflow-hidden rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}><div className="absolute left-0 top-0 h-[3px] w-full" style={{ background: accent }} /><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: "var(--text-4)" }}>{label}</p><p className="mt-2 text-3xl font-black" style={{ color: "var(--text-1)" }}>{value}</p><p className="mt-1 text-[11px] font-semibold" style={{ color: accent }}>{sub}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${accent}12`, border: `1px solid ${accent}30` }}><Icon className="h-4 w-4" style={{ color: accent }} /></div></div></div>;
}

export function QuestionBankAdmin() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("Todos");
  const [difficulty, setDifficulty] = useState("Todas");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionBankItem | null>(null);
  const [form, setForm] = useState<QuestionBankInput>(EMPTY);

  const query = useQuery({ queryKey: ["question-bank-admin"], queryFn: listQuestionBank });
  const rows = query.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (sector !== "Todos" && row.target_sector !== sector) return false;
      if (difficulty !== "Todas" && row.difficulty !== difficulty) return false;
      return !q || [row.theme, row.question_text, row.bank_type, row.target_sector].some((value) => (value || "").toLowerCase().includes(q));
    });
  }, [difficulty, rows, search, sector]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [currentPage, filtered]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.question_text.trim()) throw new Error("Informe o enunciado da questão");
      if (!form.theme.trim()) throw new Error("Informe o tema");
      if (form.bank_type === "Múltipla escolha") {
        const options = form.options.map((o) => o.trim()).filter(Boolean);
        if (options.length < 2) throw new Error("Informe ao menos duas alternativas");
        if (form.correct_index == null || form.correct_index < 0 || form.correct_index >= options.length) throw new Error("Selecione a alternativa correta");
        const payload = { ...form, options, correct_answer: null };
        if (editing) await updateQuestionBankItem(editing.id, payload); else await createQuestionBankItem(payload);
      } else {
        if (!form.correct_answer?.trim()) throw new Error("Informe a resposta esperada");
        const payload = { ...form, options: [], correct_index: null };
        if (editing) await updateQuestionBankItem(editing.id, payload); else await createQuestionBankItem(payload);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Questão atualizada" : "Questão criada");
      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
      qc.invalidateQueries({ queryKey: ["question-bank-admin"] });
      qc.invalidateQueries({ queryKey: ["question-bank-active"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteQuestionBankItem,
    onSuccess: () => {
      toast.success("Questão excluída");
      qc.invalidateQueries({ queryKey: ["question-bank-admin"] });
      qc.invalidateQueries({ queryKey: ["question-bank-active"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateQuestionBankItem(id, { active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["question-bank-admin"] });
      qc.invalidateQueries({ queryKey: ["question-bank-active"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!user?.isAdmin) {
    return <div className="mx-auto max-w-3xl rounded-2xl p-10 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><p className="font-bold" style={{ color: "var(--text-1)" }}>Acesso exclusivo do Inspetor.</p></div>;
  }

  const openNew = () => { setEditing(null); setForm({ ...EMPTY, options: [...EMPTY.options] }); setOpen(true); };
  const openEdit = (item: QuestionBankItem) => {
    setEditing(item);
    setForm({ bank_type: item.bank_type, question_text: item.question_text, options: item.options.length ? [...item.options] : ["", "", "", ""], correct_index: item.correct_index, correct_answer: item.correct_answer, explanation: item.explanation, target_sector: item.target_sector, difficulty: item.difficulty, theme: item.theme, active: item.active });
    setOpen(true);
  };

  const activeCount = rows.filter((row) => row.active).length;
  const hardCount = rows.filter((row) => row.difficulty === "Difícil").length;
  const sectorCount = new Set(rows.map((row) => row.target_sector).filter(Boolean)).size;

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-[1.75rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171117 0%,#310912 55%,#160f14 100%)", border: "1px solid rgba(200,16,46,.28)", boxShadow: "0 12px 38px rgba(80,0,18,.16)" }}>
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle,rgba(200,16,46,.25),transparent 68%)" }} />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em]" style={{ color: "rgba(255,255,255,.44)" }}><BookOpenCheck className="h-4 w-4" /> Conteúdo avaliativo</div><h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">Banco de Questões</h1><p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,.52)" }}>Questões reutilizáveis para provas, cronograma e avaliações.</p></div>
          <Button onClick={openNew} className="w-full bg-[#e0142f] font-bold text-white shadow-lg shadow-red-950/20 hover:bg-[#C8102E] md:w-auto"><Plus className="mr-2 h-4 w-4" /> Nova questão</Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Total" value={rows.length} icon={Layers3} accent="#3b82f6" sub="questões cadastradas" />
        <Metric label="Ativas" value={activeCount} icon={ShieldCheck} accent="#10b981" sub="disponíveis para uso" />
        <Metric label="Difíceis" value={hardCount} icon={Gauge} accent="#f59e0b" sub="nível avançado" />
        <Metric label="Setores" value={sectorCount} icon={Crosshair} accent="#e11d48" sub="segmentações configuradas" />
      </div>

      <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
        <div className="grid gap-3 md:grid-cols-[1fr_180px_160px]">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-4)" }} /><Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por tema ou enunciado..." className="pl-10" /></div>
          <Select value={sector} onValueChange={(value) => { setSector(value); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TARGET_SECTORS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
          <Select value={difficulty} onValueChange={(value) => { setDifficulty(value); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Todas", "Fácil", "Médio", "Difícil"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
        </div>
        {!query.isLoading && filtered.length > 0 && <p className="mt-3 text-[11px]" style={{ color: "var(--text-4)" }}>{filtered.length} questão(ões) encontrada(s) · exibindo {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}</p>}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {paged.map((item) => {
          const difficultyColor = item.difficulty === "Difícil" ? "#e11d48" : item.difficulty === "Fácil" ? "#10b981" : "#f59e0b";
          return <article key={item.id} className="relative overflow-hidden rounded-2xl p-4 pl-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
            <div className="absolute bottom-0 left-0 top-0 w-[3px]" style={{ background: item.active ? difficultyColor : "#64748b" }} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{item.theme || "Sem tema"}</span><span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: `${difficultyColor}12`, color: difficultyColor, border: `1px solid ${difficultyColor}30` }}>{item.difficulty}</span><span className="text-[10px] font-bold" style={{ color: "var(--text-4)" }}>{item.target_sector} · {item.bank_type}</span></div>
                <p className="mt-3 break-words text-sm font-black leading-relaxed" style={{ color: "var(--text-1)" }}>{item.question_text}</p>
                {item.bank_type === "Múltipla escolha" && item.options.length > 0 && <div className="mt-3 space-y-1.5">{item.options.map((option, index) => <div key={`${item.id}-${index}`} className="break-words rounded-lg px-2.5 py-1.5 text-xs" style={{ background: index === item.correct_index ? "rgba(16,185,129,.08)" : "var(--bg-surface-2)", color: index === item.correct_index ? "#10b981" : "var(--text-3)", border: index === item.correct_index ? "1px solid rgba(16,185,129,.18)" : "1px solid transparent" }}>{String.fromCharCode(65 + index)}. {option}</div>)}</div>}
                {item.bank_type !== "Múltipla escolha" && item.correct_answer && <p className="mt-3 break-words text-xs" style={{ color: "var(--text-3)" }}><strong>Resposta esperada:</strong> {item.correct_answer}</p>}
                {item.explanation && <p className="mt-2 break-words text-xs" style={{ color: "var(--text-4)" }}>{item.explanation}</p>}
              </div>
              <div className="flex shrink-0 justify-end gap-1 self-end sm:self-start"><Button size="icon" variant="ghost" onClick={() => toggle.mutate({ id: item.id, active: !item.active })} title={item.active ? "Desativar" : "Ativar"}>{item.active ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <CircleOff className="h-4 w-4" />}</Button><Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-red-500" onClick={() => { if (confirm("Excluir esta questão?")) remove.mutate(item.id); }}><Trash2 className="h-4 w-4" /></Button></div>
            </div>
          </article>;
        })}
      </div>

      {!query.isLoading && filtered.length === 0 && <section className="rounded-2xl p-12 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><BookOpenCheck className="mx-auto h-10 w-10 opacity-25" /><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Nenhuma questão encontrada.</p></section>}

      {!query.isLoading && filtered.length > PAGE_SIZE && <div className="flex flex-col items-center justify-between gap-3 rounded-2xl p-3 sm:flex-row" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><p className="text-xs font-bold" style={{ color: "var(--text-4)" }}>Página {currentPage} de {totalPages}</p><div className="flex w-full gap-2 sm:w-auto"><Button variant="outline" className="flex-1 sm:flex-none" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="mr-1 h-4 w-4" /> Anterior</Button><Button variant="outline" className="flex-1 sm:flex-none" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Próxima <ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar questão" : "Nova questão"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3"><div className="space-y-1.5"><Label>Tipo</Label><Select value={form.bank_type} onValueChange={(v) => setForm({ ...form, bank_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Múltipla escolha">Múltipla escolha</SelectItem><SelectItem value="Discursiva">Discursiva</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label>Setor</Label><Select value={form.target_sector} onValueChange={(v) => setForm({ ...form, target_sector: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TARGET_SECTORS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Dificuldade</Label><Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Fácil", "Médio", "Difícil"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div></div>
            <div className="space-y-1.5"><Label>Tema *</Label><Input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} placeholder="Ex: Controle de acesso" /></div>
            <div className="space-y-1.5"><Label>Enunciado *</Label><textarea value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} className="min-h-24 w-full rounded-xl p-3 text-sm" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }} /></div>
            {form.bank_type === "Múltipla escolha" ? <div className="space-y-2"><Label>Alternativas</Label>{form.options.map((option, index) => <div key={index} className="flex items-center gap-2"><input type="radio" checked={form.correct_index === index} onChange={() => setForm({ ...form, correct_index: index })} /><Input value={option} onChange={(e) => { const options = [...form.options]; options[index] = e.target.value; setForm({ ...form, options }); }} placeholder={`Alternativa ${String.fromCharCode(65 + index)}`} /></div>)}</div> : <div className="space-y-1.5"><Label>Resposta esperada *</Label><textarea value={form.correct_answer || ""} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} className="min-h-20 w-full rounded-xl p-3 text-sm" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }} /></div>}
            <div className="space-y-1.5"><Label>Explicação / referência</Label><textarea value={form.explanation || ""} onChange={(e) => setForm({ ...form, explanation: e.target.value || null })} className="min-h-20 w-full rounded-xl p-3 text-sm" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-[#C8102E] text-white hover:bg-[#A00D24]">{save.isPending ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
