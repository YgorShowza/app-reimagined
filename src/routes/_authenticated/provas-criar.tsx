import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PlusCircle, Trash2, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  EXAM_STATUS, EXAM_TYPES, TARGET_SECTORS, createExam, emptyExamForm, emptyQuestion,
  getExam, updateExam, type ExamForm, type ExamQuestion, type QuestionType,
} from "@/lib/exams";
import { useCurrentUser } from "@/lib/useCurrentUser";

export const Route = createFileRoute("/_authenticated/provas-criar")({
  head: () => ({
    meta: [
      { title: "Criar prova · SEGEMPAT" },
      { name: "description", content: "Monte provas com questões objetivas e discursivas para as equipes." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { id?: string } => {
    const id = typeof search["id"] === "string" ? search["id"] : undefined;
    return id ? { id } : {};
  },
  component: CriarProva,
});

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--bg-surface-2)",
  color: "var(--text-1)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-4)" }}>
      {children}
    </p>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
      {children}
    </div>
  );
}

function CriarProva() {
  const navigate = useNavigate();
  const { id } = Route.useSearch();
  const { data: user } = useCurrentUser();
  const [form, setForm] = useState<ExamForm>(() => emptyExamForm());
  const examQuery = useQuery({ queryKey: ["exam-admin", id], queryFn: () => getExam(id!), enabled: !!id && !!user?.isAdmin });

  useEffect(() => {
    if (!examQuery.data) return;
    const exam = examQuery.data;
    setForm({
      title: exam.title,
      description: exam.description ?? "",
      exam_type: exam.exam_type,
      target_sector: exam.target_sector,
      min_approval_pct: exam.min_approval_pct,
      scheduled_date: exam.scheduled_date ?? "",
      status: exam.status,
      questions: exam.questions,
    });
  }, [examQuery.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Informe o título da prova.");
      if (!form.questions.length) throw new Error("Adicione pelo menos uma questão.");
      for (const question of form.questions) {
        if (!question.statement.trim()) throw new Error("Todas as questões precisam de enunciado.");
        if (question.type === "Múltipla escolha") {
          if (question.options.filter((option) => option.trim()).length < 2) throw new Error("Questões de múltipla escolha precisam de pelo menos duas alternativas.");
          if (!question.options[question.correct_index]?.trim()) throw new Error("Selecione uma alternativa correta válida.");
        } else if (!question.model_answer?.trim()) {
          throw new Error("Questões discursivas precisam de resposta-modelo.");
        }
      }
      if (id) await updateExam(id, form); else await createExam(form);
    },
    onSuccess: () => {
      toast.success(id ? "Prova atualizada" : "Prova criada");
      navigate({ to: "/provas" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!user?.isAdmin) return <Card className="mx-auto max-w-xl p-8 text-center"><p className="font-bold" style={{ color: "var(--text-1)" }}>Acesso restrito à Inspetoria.</p></Card>;
  if (id && examQuery.isLoading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;

  const setQuestion = (index: number, patch: Partial<ExamQuestion>) => setForm((current) => ({ ...current, questions: current.questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question) }));
  const addQuestion = () => setForm((current) => ({ ...current, questions: [...current.questions, emptyQuestion()] }));
  const removeQuestion = (index: number) => setForm((current) => ({ ...current, questions: current.questions.filter((_, questionIndex) => questionIndex !== index) }));

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-12">
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[1.7rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118,#310912 55%,#160f14)", border: "1px solid rgba(200,16,46,.28)" }}>
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">Avaliação formal</p>
        <h1 className="mt-2 text-2xl font-black text-white">{id ? "Editar prova" : "Criar nova prova"}</h1>
        <p className="mt-1 text-sm text-white/50">Defina setor, critérios e questões. A correção oficial acontece no servidor.</p>
      </motion.section>

      <Card className="p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Título</Label><input style={fieldStyle} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
          <div className="md:col-span-2"><Label>Descrição</Label><textarea style={{ ...fieldStyle, minHeight: 88 }} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
          <div><Label>Tipo</Label><select style={fieldStyle} value={form.exam_type} onChange={(event) => setForm({ ...form, exam_type: event.target.value })}>{EXAM_TYPES.map((value) => <option key={value}>{value}</option>)}</select></div>
          <div><Label>Setor-alvo</Label><select style={fieldStyle} value={form.target_sector} onChange={(event) => setForm({ ...form, target_sector: event.target.value })}>{TARGET_SECTORS.map((value) => <option key={value}>{value}</option>)}</select></div>
          <div><Label>Percentual mínimo</Label><input type="number" min={0} max={100} style={fieldStyle} value={form.min_approval_pct} onChange={(event) => setForm({ ...form, min_approval_pct: Number(event.target.value) })} /></div>
          <div><Label>Data prevista</Label><input type="date" style={fieldStyle} value={form.scheduled_date} onChange={(event) => setForm({ ...form, scheduled_date: event.target.value })} /></div>
          <div><Label>Situação</Label><select style={fieldStyle} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{EXAM_STATUS.map((value) => <option key={value}>{value}</option>)}</select></div>
        </div>
      </Card>

      <div className="space-y-4">
        {form.questions.map((question, index) => (
          <Card key={question.id} className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--accent)" }}>Questão {index + 1}</p><p className="text-xs" style={{ color: "var(--text-4)" }}>{question.type}</p></div><button onClick={() => removeQuestion(index)} disabled={form.questions.length === 1} className="rounded-lg p-2 text-red-500 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div>
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <div><Label>Tipo da questão</Label><select style={fieldStyle} value={question.type} onChange={(event) => setQuestion(index, { type: event.target.value as QuestionType })}><option>Múltipla escolha</option><option>Discursiva</option></select></div>
              <div><Label>Enunciado</Label><textarea style={{ ...fieldStyle, minHeight: 70 }} value={question.statement} onChange={(event) => setQuestion(index, { statement: event.target.value })} /></div>
            </div>
            {question.type === "Múltipla escolha" ? <div className="mt-4 grid gap-2 md:grid-cols-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className="flex items-center gap-2 rounded-xl p-2" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}><input type="radio" name={`correct-${question.id}`} checked={question.correct_index === optionIndex} onChange={() => setQuestion(index, { correct_index: optionIndex })} /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--text-1)" }} value={option} onChange={(event) => setQuestion(index, { options: question.options.map((value, idx) => idx === optionIndex ? event.target.value : value) })} placeholder={`Alternativa ${String.fromCharCode(65 + optionIndex)}`} /></label>)}</div> : <div className="mt-4"><Label>Resposta-modelo</Label><textarea style={{ ...fieldStyle, minHeight: 88 }} value={question.model_answer ?? ""} onChange={(event) => setQuestion(index, { model_answer: event.target.value })} /></div>}
            <div className="mt-4 max-w-[180px]"><Label>Pontos</Label><input type="number" min={1} style={fieldStyle} value={question.points} onChange={(event) => setQuestion(index, { points: Math.max(1, Number(event.target.value)) })} /></div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button onClick={addQuestion} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-2)" }}><PlusCircle className="h-4 w-4" /> Adicionar questão</button>
        <div className="flex gap-2"><button onClick={() => navigate({ to: "/provas" })} className="h-10 rounded-xl px-4 text-sm font-bold" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-2)" }}>Cancelar</button><button onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#C8102E] px-5 text-sm font-bold text-white disabled:opacity-50">{save.isPending ? <CheckCircle2 className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}{save.isPending ? "Salvando..." : "Salvar prova"}</button></div>
      </div>
    </div>
  );
}
