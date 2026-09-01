import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/exams/SignaturePad";
import { getExamForAttempt, saveAttempt, signAttempt, type ExamAttempt } from "@/lib/exams";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/prova-realizar")({
  validateSearch: (search: Record<string, unknown>) => ({ id: typeof search["id"] === "string" ? search["id"] : "" }),
  head: () => ({ meta: [{ title: "Realizar Prova · SEGEMPAT" }] }),
  component: TakeExamPage,
});

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>{children}</div>;
}

function TakeExamPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: exam, isLoading, isError } = useQuery({ queryKey: ["exam-attempt", id], queryFn: () => getExamForAttempt(id), enabled: !!id });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [finished, setFinished] = useState<{ score: number; percent: number; passed: boolean; attempt: ExamAttempt } | null>(null);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  const question = exam?.questions[index];
  const answered = exam ? exam.questions.filter((q) => answers[q.id] !== undefined && String(answers[q.id]).trim() !== "").length : 0;

  if (isLoading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  if (isError || !exam || exam.status !== "Publicada") return <Card className="mx-auto max-w-2xl p-10 text-center"><AlertTriangle className="mx-auto h-10 w-10 text-amber-500" /><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Prova indisponível.</p><Button className="mt-4" variant="outline" onClick={() => navigate({ to: "/provas" })}>Voltar</Button></Card>;

  const finish = async () => {
    if (answered < exam.questions.length && !confirm(`Você respondeu ${answered} de ${exam.questions.length} questões. Deseja finalizar mesmo assim?`)) return;
    setSaving(true);
    try {
      const attempt = await saveAttempt({ exam_id: exam.id, answers });
      const score = Number(attempt.score || 0);
      const percent = Math.max(0, Math.min(100, Math.round(score * 10)));
      const passed = Boolean(attempt.passed);
      setFinished({ score, percent, passed, attempt });
    } catch (error: any) {
      alert(error.message || "Não foi possível salvar a prova");
    } finally { setSaving(false); }
  };

  const confirmSignature = async (blob: Blob) => {
    if (!finished) return;
    setSigning(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão inválida");
      const attempt = await signAttempt({ attemptId: finished.attempt.id, userId: auth.user.id, signerName: user?.nome || user?.matricula || "Operador", pngBlob: blob });
      setFinished((current) => current ? { ...current, attempt } : current);
      setSigned(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exam-attempts-my"] }),
        queryClient.invalidateQueries({ queryKey: ["employees-profile"] }),
      ]);
    } catch (error: any) {
      alert(error.message || "Não foi possível registrar a assinatura");
      throw error;
    } finally { setSigning(false); }
  };

  if (finished) {
    const codeLabel = signed && finished.passed && finished.attempt.certificate_code
      ? "Código verificável do certificado"
      : finished.passed && finished.attempt.certificate_code
        ? "Código da aprovação — assinatura pendente"
        : "Identificador da tentativa";

    return (
      <div className="mx-auto max-w-3xl space-y-5 pb-10">
        <div className="rounded-[1.5rem] p-7 text-center" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
          {finished.passed ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" /> : <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />}
          <h1 className="mt-4 text-2xl font-black text-white">{finished.passed ? "Aprovado" : "Não aprovado"}</h1>
          <p className="mt-2 text-white/50">Resultado calculado e registrado pelo servidor. A conclusão formal exige sua assinatura eletrônica.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center"><p className="text-[10px] font-black uppercase" style={{ color: "var(--text-4)" }}>Nota</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{finished.score}</p></Card>
          <Card className="p-4 text-center"><p className="text-[10px] font-black uppercase" style={{ color: "var(--text-4)" }}>Percentual</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{finished.percent}%</p></Card>
          <Card className="p-4 text-center"><p className="text-[10px] font-black uppercase" style={{ color: "var(--text-4)" }}>Mínimo</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{exam.min_approval_pct}%</p></Card>
        </div>

        <Card className="p-4">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" /><div><p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: "var(--text-4)" }}>{codeLabel}</p><p className="mt-1 break-all font-mono text-sm font-black" style={{ color: "var(--text-1)" }}>{finished.attempt.certificate_code || finished.attempt.id}</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Mat. {user?.matricula || "—"} · {exam.title}</p></div></div>
        </Card>

        <SignaturePad signerName={user?.nome || user?.matricula || "Operador"} saving={signing} onConfirm={confirmSignature} />

        <div>
          <h2 className="mb-3 text-xs font-black uppercase tracking-[.16em]" style={{ color: "var(--text-4)" }}>Respostas enviadas</h2>
          <div className="space-y-2">
            {exam.questions.map((q, qIndex) => {
              const selected = answers[q.id];
              const chosen = q.type === "Múltipla escolha" ? q.options[Number(selected)] : String(selected ?? "");
              return <Card key={q.id} className="p-4"><div className="flex items-start gap-2"><ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" /><div><p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>{qIndex + 1}. {q.statement}</p><p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>Sua resposta: {chosen || "(não respondida)"}</p></div></div></Card>;
            })}
          </div>
        </div>

        <Button disabled={!signed} className="w-full bg-[#C8102E] text-white hover:bg-[#A00D24] disabled:opacity-40" onClick={() => navigate({ to: "/progresso" })}>{signed ? "Ver meu progresso" : "Assine acima para concluir"}</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <div className="rounded-[1.5rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-white/40"><ClipboardCheck className="h-4 w-4" /> Avaliação</div>
        <h1 className="mt-2 text-xl font-black text-white md:text-2xl">{exam.title}</h1>
        <p className="mt-1 text-sm text-white/50">Questão {index + 1} de {exam.questions.length} · {answered} respondida(s)</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#C8102E]" style={{ width: `${exam.questions.length ? ((index + 1) / exam.questions.length) * 100 : 0}%` }} /></div>
      </div>

      <Card className="p-5 md:p-6">
        <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: "var(--accent)" }}>Questão {index + 1} · {question?.points || 1} ponto(s)</p>
        <h2 className="mt-3 text-base font-bold leading-relaxed md:text-lg" style={{ color: "var(--text-1)" }}>{question?.statement}</h2>
        {question?.type === "Múltipla escolha" ? <div className="mt-5 space-y-2">{question.options.map((option, optionIndex) => <button key={optionIndex} onClick={() => setAnswers({ ...answers, [question.id]: optionIndex })} className="w-full rounded-xl p-4 text-left transition-all" style={answers[question.id] === optionIndex ? { background: "var(--accent-soft)", border: "1px solid rgba(200,16,46,.3)", color: "var(--text-1)" } : { background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}><span className="mr-3 font-black">{String.fromCharCode(65 + optionIndex)}</span>{option}</button>)}</div> : <textarea className="mt-5 min-h-36 w-full rounded-xl p-3 text-sm" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }} value={question ? String(answers[question.id] ?? "") : ""} onChange={(event) => question && setAnswers({ ...answers, [question.id]: event.target.value })} placeholder="Digite sua resposta..." />}
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}><ChevronLeft className="mr-2 h-4 w-4" />Anterior</Button>
        {index < exam.questions.length - 1 ? <Button className="bg-[#C8102E] text-white hover:bg-[#A00D24]" onClick={() => setIndex((value) => value + 1)}>Próxima<ChevronRight className="ml-2 h-4 w-4" /></Button> : <Button className="bg-[#C8102E] text-white hover:bg-[#A00D24]" disabled={saving} onClick={finish}>{saving ? "Salvando..." : "Finalizar prova"}</Button>}
      </div>
    </div>
  );
}
