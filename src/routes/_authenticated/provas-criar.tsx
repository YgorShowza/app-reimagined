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
import { QuestionBankPicker } from "@/components/exams/QuestionBankPicker";

export const Route = createFileRoute("/_authenticated/provas-criar")({
  head: () => ({
    meta: [
      { title: "Criar prova · SEGEMPAT" },
      { name: "description", content: "Monte provas com questões objetivas e discursivas para as equipes." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search["id"] === "string" ? search["id"] : undefined,
  }),
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--bg-surface)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)" }}
    >
      {children}
    </div>
  );
}

function CriarProva() {
  const navigate = useNavigate();
  const { id } = Route.useSearch();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.isAdmin ?? false;
  const [form, setForm] = useState<ExamForm>(() => emptyExamForm());

  const { data: existing } = useQuery({
    queryKey: ["exam", id],
    queryFn: () => getExam(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      title: existing.title,
      description: existing.description ?? "",
      exam_type: existing.exam_type,
      target_sector: existing.target_sector,
      min_approval_pct: existing.min_approval_pct,
      scheduled_date: existing.scheduled_date ?? "",
      status: existing.status,
      questions: existing.questions.length ? existing.questions : [emptyQuestion()],
    });
  }, [existing]);

  const save = useMutation({
    mutationFn: async (status: string) => {
      const payload = { ...form, status };
      if (id) await updateExam(id, payload);
      else await createExam(payload);
    },
    onSuccess: () => {
      toast.success(id ? "Prova atualizada" : "Prova criada");
      navigate({ to: "/provas" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof ExamForm>(key: K, value: ExamForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setQuestion = (qid: string, patch: Partial<ExamQuestion>) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
    }));

  const addBankQuestion = (question: ExamQuestion) => {
    setForm((current) => {
      const onlyBlank = current.questions.length === 1 && !current.questions[0]?.statement.trim();
      return {
        ...current,
        questions: onlyBlank ? [question] : [...current.questions, question],
      };
    });
    toast.success("Questão adicionada à prova");
  };

  const submit = (status: string) => {
    if (!form.title.trim()) return toast.error("Informe o título da prova");
    const invalid = form.questions.some((q) => !q.statement.trim());
    if (invalid) return toast.error("Todas as questões precisam de um enunciado");
    const objectiveWithoutAnswer = form.questions.some((q) =>
      q.type === "Múltipla escolha" && (!q.options.length || !q.options[q.correct_index]?.trim()),
    );
    if (objectiveWithoutAnswer) return toast.error("Toda questão objetiva precisa ter uma alternativa correta preenchida");
    save.mutate(status);
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-3)" }}>
          Apenas Inspetores podem criar provas.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-10">
      <div
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, #1a0509 0%, #2d0a10 100%)",
          border: "1.5px solid rgba(200,16,46,0.3)",
        }}
      >
        <h1 className="text-lg font-black text-white">{id ? "Editar prova" : "Criar prova"}</h1>
        <p className="text-xs" style={{ color: "#9ca3af" }}>
          {form.questions.length} questão(ões) ·{" "}
          {form.questions.reduce((s, q) => s + (q.points || 0), 0)} ponto(s)
        </p>
      </div>

      <Card>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <input
              style={fieldStyle}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex.: Procedimentos de acesso ao cais"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <textarea
              style={{ ...fieldStyle, minHeight: 70, resize: "vertical" }}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Contexto ou orientações para o colaborador"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Tipo</Label>
              <select style={fieldStyle} value={form.exam_type} onChange={(e) => set("exam_type", e.target.value)}>
                {EXAM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Setor alvo</Label>
              <select
                style={fieldStyle}
                value={form.target_sector}
                onChange={(e) => set("target_sector", e.target.value)}
              >
                {TARGET_SECTORS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Aprovação mínima (%)</Label>
              <input
                type="number"
                min={0}
                max={100}
                style={fieldStyle}
                value={form.min_approval_pct}
                onChange={(e) => set("min_approval_pct", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Data agendada</Label>
              <input
                type="date"
                style={fieldStyle}
                value={form.scheduled_date}
                onChange={(e) => set("scheduled_date", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Situação</Label>
            <select style={fieldStyle} value={form.status} onChange={(e) => set("status", e.target.value)}>
              {EXAM_STATUS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <QuestionBankPicker
        onAdd={addBankQuestion}
        existingStatements={form.questions.map((question) => question.statement)}
      />

      <div className="space-y-3">
        {form.questions.map((q, idx) => (
          <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: "#C8102E" }}>
                  Questão {idx + 1}
                </p>
                {form.questions.length > 1 && (
                  <button
                    onClick={() =>
                      setForm((f) => ({ ...f, questions: f.questions.filter((x) => x.id !== q.id) }))
                    }
                    className="rounded-lg p-1.5"
                    style={{ color: "#C8102E", background: "rgba(200,16,46,0.08)" }}
                    aria-label="Remover questão"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Formato</Label>
                    <select
                      style={fieldStyle}
                      value={q.type}
                      onChange={(e) => setQuestion(q.id, { type: e.target.value as QuestionType })}
                    >
                      <option value="Múltipla escolha">Múltipla escolha</option>
                      <option value="Discursiva">Discursiva</option>
                    </select>
                  </div>
                  <div>
                    <Label>Pontos</Label>
                    <input
                      type="number"
                      min={1}
                      style={fieldStyle}
                      value={q.points}
                      onChange={(e) => setQuestion(q.id, { points: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Enunciado</Label>
                  <textarea
                    style={{ ...fieldStyle, minHeight: 66, resize: "vertical" }}
                    value={q.statement}
                    onChange={(e) => setQuestion(q.id, { statement: e.target.value })}
                  />
                </div>

                {q.type === "Múltipla escolha" ? (
                  <div className="space-y-2">
                    <Label>Alternativas (marque a correta)</Label>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          onClick={() => setQuestion(q.id, { correct_index: oi })}
                          className="shrink-0 rounded-full p-1"
                          style={{ color: q.correct_index === oi ? "#10b981" : "var(--text-4)" }}
                          aria-label={`Marcar alternativa ${oi + 1} como correta`}
                        >
                          <CheckCircle2 className="h-4.5 w-4.5" />
                        </button>
                        <input
                          style={fieldStyle}
                          value={opt}
                          placeholder={`Alternativa ${String.fromCharCode(65 + oi)}`}
                          onChange={(e) =>
                            setQuestion(q.id, {
                              options: q.options.map((o, i2) => (i2 === oi ? e.target.value : o)),
                            })
                          }
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => setQuestion(q.id, { options: [...q.options, ""] })}
                      className="text-xs font-semibold"
                      style={{ color: "#C8102E" }}
                    >
                      + adicionar alternativa
                    </button>
                  </div>
                ) : (
                  <div>
                    <Label>Resposta esperada (referência)</Label>
                    <textarea
                      style={{ ...fieldStyle, minHeight: 60, resize: "vertical" }}
                      value={q.model_answer ?? ""}
                      onChange={(e) => setQuestion(q.id, { model_answer: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <button
        onClick={() => setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestion()] }))}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold"
        style={{ border: "1.5px dashed var(--border)", color: "var(--text-2)" }}
      >
        <PlusCircle className="h-4 w-4" /> Adicionar questão manualmente
      </button>

      <div className="flex flex-wrap gap-2">
        <button
          disabled={save.isPending}
          onClick={() => submit("Rascunho")}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
          style={{ background: "var(--bg-surface-3)", border: "1px solid var(--border)", color: "var(--text-1)" }}
        >
          <Save className="h-4 w-4" /> Salvar rascunho
        </button>
        <button
          disabled={save.isPending}
          onClick={() => submit("Publicada")}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
          style={{ background: "#C8102E" }}
        >
          <CheckCircle2 className="h-4 w-4" /> Publicar prova
        </button>
      </div>
    </div>
  );
}
