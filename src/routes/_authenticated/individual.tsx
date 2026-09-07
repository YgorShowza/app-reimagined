import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Gauge,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserRoundSearch,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getOperationalSnapshot } from "@/lib/insights";
import { formatDate, type CronogramaEntry } from "@/lib/cronograma";
import { operationalDate, operationalMonth, operationalYear } from "@/lib/operational-time";
import type { Exam, ExamAttempt } from "@/lib/exams";
import { getIndividualAttemptEvidence } from "@/lib/individual-analysis";

export const Route = createFileRoute("/_authenticated/individual")({
  head: () => ({ meta: [{ title: "Análise Individual · SEGEMPAT" }] }),
  component: IndividualPage,
});

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card, var(--shadow-md))",
      }}
    >
      {children}
    </div>
  );
}

type PerfFilter = "todos" | "sem-dados" | "atencao" | "bom" | "excelente";
type PeriodFilter = "year" | "90d" | "30d";

function unresolvedFailedExamCount(attempts: ExamAttempt[]) {
  const failedExamIds = new Set(attempts.filter((attempt) => !attempt.passed).map((attempt) => attempt.exam_id));
  const passedExamIds = new Set(attempts.filter((attempt) => attempt.passed).map((attempt) => attempt.exam_id));
  return Array.from(failedExamIds).filter((examId) => !passedExamIds.has(examId)).length;
}

function scoreTone(score: number) {
  if (score >= 9) return { color: "#10b981", soft: "rgba(16,185,129,.10)", label: "Excelente" };
  if (score >= 7) return { color: "#3b82f6", soft: "rgba(59,130,246,.10)", label: "Bom" };
  if (score >= 5) return { color: "#f59e0b", soft: "rgba(245,158,11,.10)", label: "Atenção" };
  return { color: "#ef4444", soft: "rgba(239,68,68,.10)", label: "Crítico" };
}

function perfTone(level: PerfFilter) {
  if (level === "excelente") return { color: "#10b981", label: "Excelente" };
  if (level === "bom") return { color: "#3b82f6", label: "Bom" };
  if (level === "atencao") return { color: "#f59e0b", label: "Atenção" };
  return { color: "#7c8597", label: "Sem dados" };
}

function formatAttemptDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "America/Maceio",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function shortAttemptDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "America/Maceio",
    day: "2-digit",
    month: "2-digit",
  });
}

function withinPeriod(value: string | null | undefined, period: PeriodFilter) {
  if (period === "year") return true;
  if (!value) return false;
  const time = new Date(value.length === 10 ? `${value}T12:00:00-03:00` : value).getTime();
  if (!Number.isFinite(time)) return false;
  const days = period === "30d" ? 30 : 90;
  return time >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function metricAverage(attempts: ExamAttempt[]) {
  if (!attempts.length) return 0;
  return Math.round((attempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0) / attempts.length) * 10) / 10;
}

function metricApproval(attempts: ExamAttempt[]) {
  if (!attempts.length) return 0;
  return Math.round((attempts.filter((attempt) => attempt.passed).length / attempts.length) * 100);
}

function targetForExam(exam?: Exam) {
  return Math.max(0, Math.min(10, Number(exam?.min_approval_pct ?? 70) / 10));
}

function targetForAttempts(attempts: ExamAttempt[], examMap: Map<string, Exam>) {
  if (!attempts.length) return 7;
  return attempts.reduce((sum, attempt) => sum + targetForExam(examMap.get(attempt.exam_id)), 0) / attempts.length;
}

function PerformanceChart({ attempts, examMap }: { attempts: ExamAttempt[]; examMap: Map<string, Exam> }) {
  const data = [...attempts].sort((a, b) => a.finished_at.localeCompare(b.finished_at)).slice(-12);
  if (!data.length) {
    return <div className="py-14 text-center text-sm" style={{ color: "var(--text-4)" }}>Sem avaliações no período selecionado.</div>;
  }

  const width = Math.max(680, data.length * 92);
  const height = 300;
  const left = 52;
  const right = 24;
  const top = 25;
  const bottom = 48;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const goal = targetForAttempts(data, examMap);
  const xAt = (index: number) => data.length === 1 ? left + chartWidth / 2 : left + (index / (data.length - 1)) * chartWidth;
  const yAt = (score: number) => top + ((10 - Math.max(0, Math.min(10, score))) / 10) * chartHeight;
  const points = data.map((attempt, index) => ({
    attempt,
    x: xAt(index),
    y: yAt(Number(attempt.score || 0)),
  }));
  const pointText = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaText = `${left},${top + chartHeight} ${pointText} ${points.at(-1)?.x ?? left},${top + chartHeight}`;
  const gridValues = [10, 7.5, 5, 2.5, 0];

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Curva de evolução das notas do colaborador">
          <defs>
            <linearGradient id="individual-performance-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C8102E" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#C8102E" stopOpacity="0.015" />
            </linearGradient>
          </defs>

          {gridValues.map((value) => {
            const y = yAt(value);
            return (
              <g key={value}>
                <line x1={left} y1={y} x2={width - right} y2={y} stroke="currentColor" strokeOpacity="0.11" strokeDasharray="5 6" />
                <text x={left - 12} y={y + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.48">{value.toFixed(value % 1 ? 1 : 0)}</text>
              </g>
            );
          })}

          <line x1={left} y1={yAt(goal)} x2={width - right} y2={yAt(goal)} stroke="#f59e0b" strokeOpacity="0.72" strokeDasharray="8 6" />
          <text x={width - right} y={yAt(goal) - 8} textAnchor="end" fontSize="10" fontWeight="700" fill="#f59e0b">Meta média {goal.toFixed(1)}</text>

          <polygon points={areaText} fill="url(#individual-performance-area)" />
          {data.length > 1 && <polyline points={pointText} fill="none" stroke="#C8102E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}

          {points.map(({ attempt, x, y }) => {
            const score = Number(attempt.score || 0);
            const tone = scoreTone(score);
            const exam = examMap.get(attempt.exam_id);
            return (
              <g key={attempt.id}>
                <title>{`${exam?.title ?? "Avaliação"} · Nota ${score.toFixed(1)} · ${formatAttemptDate(attempt.finished_at)}`}</title>
                <circle cx={x} cy={y} r="8" fill="var(--bg-surface)" stroke={tone.color} strokeWidth="3" />
                <circle cx={x} cy={y} r="3" fill={tone.color} />
                <text x={x} y={Math.max(14, y - 14)} textAnchor="middle" fontSize="11" fontWeight="800" fill={tone.color}>{score.toFixed(1)}</text>
                <text x={x} y={height - 20} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.5">{shortAttemptDate(attempt.finished_at)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px]" style={{ color: "var(--text-4)" }}>
        <span>Até 12 avaliações mais recentes no filtro atual</span>
        <span>Linha tracejada = média das metas de aprovação</span>
      </div>
    </div>
  );
}

function AttemptHistoryItem({ attempt, exam }: { attempt: ExamAttempt; exam?: Exam }) {
  const [open, setOpen] = useState(false);
  const detail = useQuery({
    queryKey: ["individual-attempt-evidence", attempt.id],
    queryFn: () => getIndividualAttemptEvidence(attempt, exam as Exam),
    enabled: open && Boolean(exam),
    staleTime: Infinity,
  });
  const score = Number(attempt.score || 0);
  const tone = scoreTone(score);

  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-black/[.02] md:px-4 md:py-4 dark:hover:bg-white/[.02]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: attempt.passed ? "rgba(16,185,129,.10)" : "rgba(239,68,68,.10)", border: `1px solid ${attempt.passed ? "rgba(16,185,129,.22)" : "rgba(239,68,68,.22)"}` }}>
          {attempt.passed ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black" style={{ color: "var(--text-1)" }}>{exam?.title ?? "Avaliação"}</p>
            <span className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase" style={{ background: attempt.passed ? "rgba(16,185,129,.10)" : "rgba(239,68,68,.10)", color: attempt.passed ? "#10b981" : "#ef4444" }}>{attempt.passed ? "Aprovado" : "Reprovado"}</span>
          </div>
          <p className="mt-1 text-[10px]" style={{ color: "var(--text-4)" }}>Prova · {formatAttemptDate(attempt.finished_at)} · clique para ver as questões</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black" style={{ color: tone.color }}>{score.toFixed(1)}</p>
          <p className="text-[9px] font-bold" style={{ color: "var(--text-4)" }}>nota</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
          {open ? <ChevronDown className="h-4 w-4" style={{ color: "var(--text-3)" }} /> : <ChevronRight className="h-4 w-4" style={{ color: "var(--text-3)" }} />}
        </div>
      </button>

      {open && (
        <div className="px-3 pb-4 md:px-4 md:pb-5">
          {!exam ? (
            <div className="rounded-xl p-4 text-sm text-amber-600" style={{ background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.18)" }}>A prova original desta tentativa não foi localizada.</div>
          ) : detail.isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl py-10 text-xs" style={{ background: "var(--bg-surface-2)", color: "var(--text-4)" }}><RefreshCw className="h-4 w-4 animate-spin" /> Carregando evidência da avaliação...</div>
          ) : detail.isError || !detail.data ? (
            <div className="rounded-xl p-4 text-sm text-red-500" style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.16)" }}>Não foi possível abrir o detalhamento desta avaliação.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
              <div className="p-4 md:p-5" style={{ background: attempt.passed ? "linear-gradient(135deg,rgba(16,185,129,.09),transparent)" : "linear-gradient(135deg,rgba(239,68,68,.08),transparent)" }}>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {[
                    ["Questões", detail.data.total_questions, "#64748b"],
                    ["Acertos", detail.data.correct_count, "#10b981"],
                    ["Aproveitamento", `${detail.data.accuracy_pct}%`, detail.data.passed ? "#10b981" : "#ef4444"],
                  ].map(([label, value, color]) => (
                    <div key={String(label)} className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                      <p className="text-xl font-black md:text-2xl" style={{ color: String(color) }}>{value}</p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-[.08em]" style={{ color: "var(--text-4)" }}>{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-3)" }}>
                  <div className="h-full rounded-full" style={{ width: `${detail.data.accuracy_pct}%`, background: detail.data.passed ? "#10b981" : "#ef4444" }} />
                </div>
              </div>

              <div className="space-y-3 p-3 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: "var(--text-4)" }}>Detalhamento por questão</p>
                  <span className="text-[10px]" style={{ color: "var(--text-4)" }}>{detail.data.total_questions} registro(s)</span>
                </div>
                {detail.data.questions.map((question) => (
                  <div key={question.id} className="overflow-hidden rounded-2xl" style={{ background: "var(--bg-surface)", border: `1px solid ${question.correct ? "rgba(16,185,129,.24)" : "rgba(239,68,68,.24)"}` }}>
                    <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: question.correct ? "rgba(16,185,129,.08)" : "rgba(239,68,68,.07)" }}>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-black text-white" style={{ background: question.correct ? "#10b981" : "#ef4444" }}>{question.order}</span>
                        <span className="text-xs font-black" style={{ color: question.correct ? "#10b981" : "#ef4444" }}>{question.correct ? "ACERTOU" : "ERROU"}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase" style={{ color: "var(--text-4)" }}>{question.type}</span>
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[.1em]" style={{ color: "var(--text-4)" }}>Pergunta</p>
                        <p className="mt-1.5 text-sm font-semibold leading-relaxed" style={{ color: "var(--text-1)" }}>{question.statement}</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl p-3" style={{ background: question.correct ? "rgba(16,185,129,.06)" : "rgba(239,68,68,.06)", border: `1px solid ${question.correct ? "rgba(16,185,129,.18)" : "rgba(239,68,68,.18)"}` }}>
                          <p className="text-[9px] font-black uppercase" style={{ color: question.correct ? "#10b981" : "#ef4444" }}>Resposta do colaborador</p>
                          <p className="mt-1.5 text-sm" style={{ color: "var(--text-2)" }}>{question.answer}</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.18)" }}>
                          <p className="text-[9px] font-black uppercase text-emerald-500">Resposta correta</p>
                          <p className="mt-1.5 text-sm" style={{ color: "var(--text-2)" }}>{question.correct_answer}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CronHistoryItem({ entry }: { entry: CronogramaEntry }) {
  const [open, setOpen] = useState(false);
  const statusColor = entry.status === "Realizado" ? "#10b981" : entry.status === "Pendente" ? "#f59e0b" : "#60a5fa";
  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-black/[.02] md:px-4 md:py-4 dark:hover:bg-white/[.02]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${statusColor}12`, border: `1px solid ${statusColor}28` }}><Target className="h-5 w-5" style={{ color: statusColor }} /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black" style={{ color: "var(--text-1)" }}>{entry.theme}</p>
          <p className="mt-1 text-[10px]" style={{ color: "var(--text-4)" }}>Cronograma · {formatDate(entry.completion_date || entry.planned_date)}</p>
        </div>
        <span className="rounded-full px-2 py-1 text-[9px] font-black uppercase" style={{ background: `${statusColor}12`, color: statusColor }}>{entry.status}</span>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>{open ? <ChevronDown className="h-4 w-4" style={{ color: "var(--text-3)" }} /> : <ChevronRight className="h-4 w-4" style={{ color: "var(--text-3)" }} />}</div>
      </button>
      {open && (
        <div className="px-3 pb-4 md:px-4">
          <div className="grid gap-3 rounded-xl p-4 text-xs md:grid-cols-2" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
            <div><p className="font-black uppercase" style={{ color: "var(--text-4)" }}>Data planejada</p><p className="mt-1 font-semibold" style={{ color: "var(--text-2)" }}>{formatDate(entry.planned_date)}</p></div>
            <div><p className="font-black uppercase" style={{ color: "var(--text-4)" }}>Conclusão</p><p className="mt-1 font-semibold" style={{ color: "var(--text-2)" }}>{formatDate(entry.completion_date)}</p></div>
            <div><p className="font-black uppercase" style={{ color: "var(--text-4)" }}>Tipo</p><p className="mt-1 font-semibold" style={{ color: "var(--text-2)" }}>{entry.type}</p></div>
            <div><p className="font-black uppercase" style={{ color: "var(--text-4)" }}>Justificativa</p><p className="mt-1 font-semibold" style={{ color: "var(--text-2)" }}>{entry.justification || "—"}</p></div>
            {entry.notes && <div className="md:col-span-2"><p className="font-black uppercase" style={{ color: "var(--text-4)" }}>Observações</p><p className="mt-1 leading-relaxed" style={{ color: "var(--text-2)" }}>{entry.notes}</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}

function IndividualPage() {
  const year = operationalYear();
  const currentMonth = operationalMonth();
  const today = operationalDate();
  const query = useQuery({
    queryKey: ["individual-snapshot", year],
    queryFn: () => getOperationalSnapshot(year),
    staleTime: 60_000,
  });
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [perfFilter, setPerfFilter] = useState<PerfFilter>("todos");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("year");
  const [themeFilter, setThemeFilter] = useState("all");

  const employees = useMemo(
    () => (query.data?.employees ?? []).filter((employee) => employee.status === "Ativo" && employee.access_profile !== "Inspetor"),
    [query.data],
  );

  const employeeRows = useMemo(() => {
    if (!query.data) return [];
    return employees.map((employee) => {
      const attempts = query.data!.attempts.filter((attempt) => attempt.matricula === employee.matricula);
      const cron = query.data!.cronograma.filter((entry) => entry.employee_id === employee.id);
      const pendingEntries = cron.filter((entry) => entry.status === "Pendente");
      const overdue = pendingEntries.filter((entry) => entry.month < currentMonth || Boolean(entry.planned_date && entry.planned_date < today)).length;
      const unresolvedFailed = unresolvedFailedExamCount(attempts);
      const passed = attempts.filter((attempt) => attempt.passed).length;
      const avg = metricAverage(attempts);
      const approval = metricApproval(attempts);
      const level: PerfFilter = overdue > 0 || unresolvedFailed > 0
        ? "atencao"
        : !attempts.length
          ? "sem-dados"
          : avg >= 9
            ? "excelente"
            : avg >= 7
              ? "bom"
              : "atencao";
      return { employee, attempts, cron, passed, avg, approval, overdue, unresolvedFailed, level };
    });
  }, [currentMonth, employees, query.data, today]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employeeRows.filter((row) => {
      const matchSearch = !term || row.employee.full_name.toLowerCase().includes(term) || row.employee.matricula.toLowerCase().includes(term) || row.employee.sector.toLowerCase().includes(term);
      const matchPerf = perfFilter === "todos" || row.level === perfFilter;
      return matchSearch && matchPerf;
    });
  }, [employeeRows, perfFilter, search]);

  if (query.isLoading) return <Loading />;
  if (query.isError || !query.data) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
        <p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Não foi possível carregar a análise individual.</p>
        <Button variant="outline" className="mt-4" onClick={() => query.refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente</Button>
      </Card>
    );
  }

  const activeRow = employeeRows.find((row) => row.employee.id === selected) ?? filteredRows[0] ?? employeeRows[0];
  const employee = activeRow?.employee;
  const allAttempts = activeRow?.attempts ?? [];
  const cron = activeRow?.cron ?? [];
  const examMap = new Map(query.data.exams.map((exam) => [exam.id, exam]));
  const periodAttempts = allAttempts.filter((attempt) => withinPeriod(attempt.finished_at, periodFilter));
  const attempts = themeFilter === "all" ? periodAttempts : periodAttempts.filter((attempt) => attempt.exam_id === themeFilter);
  const selectedThemeTitle = themeFilter === "all" ? null : examMap.get(themeFilter)?.title ?? null;
  const filteredCron = cron.filter((entry) => {
    const date = entry.completion_date || entry.planned_date || `${entry.month}-01`;
    if (!withinPeriod(date, periodFilter)) return false;
    if (themeFilter === "all") return true;
    return entry.exam_id === themeFilter || Boolean(selectedThemeTitle && (entry.exam_title === selectedThemeTitle || entry.theme === selectedThemeTitle));
  });

  const realized = cron.filter((entry) => entry.status === "Realizado").length;
  const pending = cron.filter((entry) => entry.status === "Pendente").length;
  const overdue = activeRow?.overdue ?? 0;
  const failed = activeRow?.unresolvedFailed ?? 0;
  const avg = metricAverage(attempts);
  const approval = metricApproval(attempts);
  const passed = attempts.filter((attempt) => attempt.passed).length;
  const sortedAttempts = [...attempts].sort((a, b) => a.finished_at.localeCompare(b.finished_at));
  const lastScore = Number(sortedAttempts.at(-1)?.score ?? 0);
  const previousScore = Number(sortedAttempts.at(-2)?.score ?? lastScore);
  const trend = sortedAttempts.length >= 2 ? Math.round((lastScore - previousScore) * 10) / 10 : 0;

  const themeStats = Array.from(attempts.reduce((map, attempt) => {
    const exam = examMap.get(attempt.exam_id);
    const current = map.get(attempt.exam_id) ?? { examId: attempt.exam_id, title: exam?.title ?? "Avaliação", scores: [] as number[], passed: 0, target: targetForExam(exam) };
    current.scores.push(Number(attempt.score || 0));
    if (attempt.passed) current.passed += 1;
    map.set(attempt.exam_id, current);
    return map;
  }, new Map<string, { examId: string; title: string; scores: number[]; passed: number; target: number }>()).values()).map((item) => ({
    ...item,
    avg: Math.round((item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length) * 10) / 10,
    approval: Math.round((item.passed / item.scores.length) * 100),
    attempts: item.scores.length,
  })).sort((a, b) => b.avg - a.avg || a.title.localeCompare(b.title, "pt-BR"));

  const strongThemes = themeStats.filter((item) => item.avg >= item.target).slice(0, 3);
  const weakThemes = [...themeStats].filter((item) => item.avg < item.target).sort((a, b) => a.avg - b.avg).slice(0, 3);
  const strongest = strongThemes[0];
  const weakest = weakThemes[0];
  const tone = perfTone(activeRow?.level ?? "sem-dados");
  const themeOptions = Array.from(new Set(allAttempts.map((attempt) => attempt.exam_id))).map((id) => examMap.get(id)).filter((exam): exam is Exam => Boolean(exam));
  const activityCount = attempts.length + filteredCron.length;
  const trendLabel = sortedAttempts.length < 2 ? "Sem comparação" : Math.abs(trend) < 0.05 ? "Estável" : trend > 0 ? "Em alta" : "Em queda";
  const trendColor = sortedAttempts.length < 2 ? "#7c8597" : Math.abs(trend) < 0.05 ? "#f59e0b" : trend > 0 ? "#10b981" : "#ef4444";

  const automatedAnalysis = !attempts.length
    ? "Ainda não há avaliações suficientes no filtro selecionado para gerar uma leitura de desempenho."
    : `Média ${avg.toFixed(1)} em ${attempts.length} avaliação${attempts.length === 1 ? "" : "ões"}, com ${approval}% de aprovação. ${weakest ? `Principal oportunidade: ${weakest.title}, média ${weakest.avg.toFixed(1)} frente à meta ${weakest.target.toFixed(1)}.` : "Nenhum tema ficou abaixo da meta no período."} ${strongest ? `Melhor desempenho: ${strongest.title}, média ${strongest.avg.toFixed(1)}.` : ""} ${sortedAttempts.length >= 2 ? `Tendência recente ${trendLabel.toLowerCase()} (${trend > 0 ? "+" : ""}${trend.toFixed(1)} ponto${Math.abs(trend) === 1 ? "" : "s"}).` : ""}`;

  const chooseEmployee = (id: string) => {
    setSelected(id);
    setThemeFilter("all");
  };

  const history = [
    ...attempts.map((attempt) => ({ type: "attempt" as const, id: `attempt-${attempt.id}`, date: attempt.finished_at, attempt })),
    ...filteredCron.map((entry) => ({ type: "cron" as const, id: `cron-${entry.id}`, date: entry.completion_date || entry.planned_date || `${entry.month}-01`, entry })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 pb-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(200,16,46,.10)", border: "1px solid rgba(200,16,46,.28)" }}><UserRoundSearch className="h-5 w-5" style={{ color: "var(--accent)" }} /></div>
          <div>
            <h1 className="text-xl font-black tracking-tight md:text-2xl" style={{ color: "var(--text-1)" }}>Análise Individual</h1>
            <p className="mt-0.5 text-xs md:text-sm" style={{ color: "var(--text-4)" }}>Desempenho, evolução, temas e evidência detalhada de cada atividade.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}><RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /> Atualizar</Button>
      </header>

      <Card className="p-3 lg:hidden">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[.12em]" style={{ color: "var(--text-4)" }}>Colaborador analisado</p>
        <Select value={employee?.id ?? ""} onValueChange={chooseEmployee}>
          <SelectTrigger><SelectValue placeholder="Selecione um colaborador" /></SelectTrigger>
          <SelectContent>{employeeRows.map((row) => <SelectItem key={row.employee.id} value={row.employee.id}>{row.employee.full_name} · {row.employee.matricula}</SelectItem>)}</SelectContent>
        </Select>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="hidden space-y-3 lg:block">
          <div className="sticky top-4 space-y-3">
            <Card className="p-3">
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-4)" }} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, matrícula ou setor..." className="pl-9" /></div>
              <div className="mt-2"><Select value={perfFilter} onValueChange={(value) => setPerfFilter(value as PerfFilter)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os desempenhos</SelectItem><SelectItem value="sem-dados">Sem dados</SelectItem><SelectItem value="atencao">Atenção</SelectItem><SelectItem value="bom">Bom</SelectItem><SelectItem value="excelente">Excelente</SelectItem></SelectContent></Select></div>
            </Card>
            <p className="px-1 text-xs font-semibold" style={{ color: "var(--text-4)" }}>{filteredRows.length} colaborador{filteredRows.length === 1 ? "" : "es"}</p>
            <div className="max-h-[calc(100vh-220px)] space-y-2 overflow-y-auto pr-1">
              {filteredRows.map((row) => {
                const active = row.employee.id === employee?.id;
                const rowTone = perfTone(row.level);
                return (
                  <button key={row.employee.id} onClick={() => chooseEmployee(row.employee.id)} className="w-full rounded-2xl p-3 text-left transition-[border-color,background]" style={{ background: active ? "rgba(200,16,46,.08)" : "var(--bg-surface)", border: active ? "1px solid rgba(200,16,46,.42)" : "1px solid var(--border)", boxShadow: active ? "0 0 0 1px rgba(200,16,46,.08), var(--shadow-card)" : "var(--shadow-card)" }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-black" style={{ background: active ? "#C8102E" : "var(--bg-surface-3)", color: active ? "#fff" : rowTone.color }}>{row.employee.full_name.charAt(0)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-black" style={{ color: "var(--text-1)" }}>{row.employee.full_name}</p><span className="text-lg font-black" style={{ color: rowTone.color }}>{row.attempts.length ? row.avg.toFixed(1) : "—"}</span></div>
                        <p className="text-[11px]" style={{ color: "var(--text-4)" }}>Mat. {row.employee.matricula} · {row.employee.sector}</p>
                        <div className="mt-2 flex items-center justify-between text-[10px]"><span style={{ color: "var(--text-4)" }}>Aprovação</span><span className="font-black" style={{ color: rowTone.color }}>{row.approval}%</span></div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-3)" }}><div className="h-full rounded-full" style={{ width: `${row.approval}%`, background: rowTone.color }} /></div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!filteredRows.length && <Card className="p-5 text-center text-xs" style={{ color: "var(--text-4)" } as React.CSSProperties}>Nenhum colaborador encontrado.</Card>}
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          {!employee ? (
            <Card className="flex min-h-[360px] flex-col items-center justify-center p-10 text-center"><UserRoundSearch className="h-12 w-12" style={{ color: "var(--accent)" }} /><p className="mt-5 text-xl font-black" style={{ color: "var(--text-1)" }}>Selecione um colaborador</p><p className="mt-2 text-sm" style={{ color: "var(--text-4)" }}>Escolha um profissional para abrir o dossiê de desempenho.</p></Card>
          ) : (
            <>
              <div className="overflow-hidden rounded-[1.6rem]" style={{ background: "linear-gradient(135deg,#15111c 0%,#1c1727 55%,#250b14 100%)", border: "1px solid rgba(200,16,46,.30)", boxShadow: "0 18px 45px rgba(0,0,0,.18)" }}>
                <div className="p-5 md:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white" style={{ background: "linear-gradient(135deg,#C8102E,#ef334f)", boxShadow: "0 0 0 5px rgba(200,16,46,.13),0 12px 28px rgba(200,16,46,.25)" }}>{employee.full_name.charAt(0)}</div>
                      <div className="min-w-0"><h2 className="text-xl font-black leading-tight text-white md:text-2xl">{employee.full_name}</h2><p className="mt-1 text-sm text-white/50">Mat. {employee.matricula} · {employee.sector} · Operacional</p><span className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black" style={{ background: `${tone.color}16`, color: tone.color, border: `1px solid ${tone.color}40` }}><span className="h-2 w-2 rounded-full" style={{ background: tone.color }} />{tone.label}</span></div>
                    </div>
                    <div className="grid w-full gap-2 sm:grid-cols-2 md:w-auto md:min-w-[440px]">
                      <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}><SelectTrigger className="border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="year">Todo período · {year}</SelectItem><SelectItem value="90d">Últimos 90 dias</SelectItem><SelectItem value="30d">Últimos 30 dias</SelectItem></SelectContent></Select>
                      <Select value={themeFilter} onValueChange={setThemeFilter}><SelectTrigger className="border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os temas</SelectItem>{themeOptions.map((exam) => <SelectItem key={exam.id} value={exam.id}>{exam.title}</SelectItem>)}</SelectContent></Select>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl p-4" style={{ background: "rgba(123,92,246,.08)", border: "1px solid rgba(167,139,250,.20)" }}>
                    <div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(139,92,246,.16)", border: "1px solid rgba(167,139,250,.22)" }}><Sparkles className="h-4 w-4 text-violet-300" /></div><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-violet-300">Análise automatizada</p><p className="mt-1.5 text-sm leading-relaxed text-white/68">{automatedAnalysis}</p></div></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                  ["Atividades", activityCount, "no filtro atual", "#4f7df3", Activity],
                  ["Média geral", attempts.length ? avg.toFixed(1) : "—", "escala de 0 a 10", "#f59e0b", Gauge],
                  ["Aprovação", attempts.length ? `${approval}%` : "—", attempts.length ? `${passed} aprovada${passed === 1 ? "" : "s"}` : "sem avaliações", "#10b981", CheckCircle2],
                  ["Tendência", sortedAttempts.length >= 2 ? trend > 0 ? "↑" : trend < 0 ? "↓" : "→" : "—", trendLabel, trendColor, trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : BarChart3],
                ].map(([label, value, sub, color, Icon]: any) => (
                  <Card key={label} className="relative overflow-hidden p-4 md:p-5"><div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: color }} /><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: "var(--text-4)" }}>{label}</p><p className="mt-2 text-2xl font-black md:text-3xl" style={{ color }}>{value}</p><p className="mt-1 text-[10px]" style={{ color: "var(--text-4)" }}>{sub}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}12`, border: `1px solid ${color}28` }}><Icon className="h-5 w-5" style={{ color }} /></div></div></Card>
                ))}
              </div>

              <Card className="overflow-hidden">
                <div className="flex flex-col gap-2 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5" style={{ borderBottom: "1px solid var(--border)" }}><div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(200,16,46,.08)", border: "1px solid rgba(200,16,46,.20)" }}><TrendingUp className="h-4 w-4" style={{ color: "var(--accent)" }} /></div><div><h2 className="text-base font-black" style={{ color: "var(--text-1)" }}>Evolução de Desempenho</h2><p className="text-[10px]" style={{ color: "var(--text-4)" }}>Notas em ordem cronológica com meta média de aprovação.</p></div></div><span className="self-start rounded-full px-3 py-1 text-[10px] font-black md:self-auto" style={{ background: `${trendColor}12`, color: trendColor }}>{trendLabel}{sortedAttempts.length >= 2 ? ` · ${trend > 0 ? "+" : ""}${trend.toFixed(1)}` : ""}</span></div>
                <div className="p-3 md:p-5"><PerformanceChart attempts={attempts} examMap={examMap} /></div>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: "1px solid rgba(239,68,68,.16)" }}><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10"><Target className="h-4 w-4 text-red-500" /></div><div><h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Oportunidades de Reforço</h2><p className="text-[10px]" style={{ color: "var(--text-4)" }}>Temas abaixo da meta no período.</p></div><span className="ml-auto rounded-full px-2 py-1 text-[9px] font-black text-red-500" style={{ background: "rgba(239,68,68,.08)" }}>{weakThemes.length} tema(s)</span></div>
                  <div className="space-y-2 p-3 md:p-4">{weakThemes.length ? weakThemes.map((item) => <div key={item.examId} className="rounded-xl p-3" style={{ background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.14)" }}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black" style={{ color: "var(--text-1)" }}>{item.title}</p><p className="mt-1 text-[10px]" style={{ color: "var(--text-4)" }}>{item.attempts} tentativa(s) · {item.approval}% aprovação · meta {item.target.toFixed(1)}</p></div><span className="text-lg font-black text-red-500">{item.avg.toFixed(1)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-3)" }}><div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(100, item.avg * 10)}%` }} /></div></div>) : <div className="py-8 text-center"><Award className="mx-auto h-8 w-8 text-emerald-500/40" /><p className="mt-2 text-xs font-semibold" style={{ color: "var(--text-4)" }}>Nenhum tema abaixo da meta no filtro atual.</p></div>}</div>
                </Card>

                <Card className="overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: "1px solid rgba(16,185,129,.16)" }}><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10"><Award className="h-4 w-4 text-emerald-500" /></div><div><h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Pontos Fortes</h2><p className="text-[10px]" style={{ color: "var(--text-4)" }}>Temas em desempenho igual ou superior à meta.</p></div><span className="ml-auto rounded-full px-2 py-1 text-[9px] font-black text-emerald-500" style={{ background: "rgba(16,185,129,.08)" }}>{strongThemes.length} tema(s)</span></div>
                  <div className="space-y-2 p-3 md:p-4">{strongThemes.length ? strongThemes.map((item) => <div key={item.examId} className="rounded-xl p-3" style={{ background: "rgba(16,185,129,.05)", border: "1px solid rgba(16,185,129,.14)" }}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black" style={{ color: "var(--text-1)" }}>{item.title}</p><p className="mt-1 text-[10px]" style={{ color: "var(--text-4)" }}>{item.attempts} tentativa(s) · {item.approval}% aprovação · meta {item.target.toFixed(1)}</p></div><span className="text-lg font-black text-emerald-500">{item.avg.toFixed(1)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-3)" }}><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, item.avg * 10)}%` }} /></div></div>) : <div className="py-8 text-center"><BookOpenCheck className="mx-auto h-8 w-8 opacity-30" style={{ color: "var(--text-4)" }} /><p className="mt-2 text-xs font-semibold" style={{ color: "var(--text-4)" }}>Ainda não há temas acima da meta neste filtro.</p></div>}</div>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-4 md:px-5" style={{ borderBottom: "1px solid var(--border)" }}><div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(79,125,243,.08)", border: "1px solid rgba(79,125,243,.18)" }}><BarChart3 className="h-4 w-4 text-blue-500" /></div><div><h2 className="text-sm font-black md:text-base" style={{ color: "var(--text-1)" }}>Média por Tema</h2><p className="text-[10px]" style={{ color: "var(--text-4)" }}>Comparação objetiva entre os assuntos avaliados.</p></div></div>
                <div className="space-y-4 p-4 md:p-5">{themeStats.length ? themeStats.map((item) => { const itemTone = scoreTone(item.avg); return <div key={item.examId}><div className="mb-2 flex items-end justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-black md:text-sm" style={{ color: "var(--text-1)" }}>{item.title}</p><p className="mt-0.5 text-[10px]" style={{ color: "var(--text-4)" }}>{item.attempts} tentativa(s) · {item.approval}% aprovação</p></div><div className="text-right"><p className="text-lg font-black" style={{ color: itemTone.color }}>{item.avg.toFixed(1)}</p><p className="text-[9px]" style={{ color: "var(--text-4)" }}>meta {item.target.toFixed(1)}</p></div></div><div className="relative h-3 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-3)" }}><div className="h-full rounded-full" style={{ width: `${Math.min(100, item.avg * 10)}%`, background: itemTone.color }} /><div className="absolute inset-y-0 w-[2px] bg-amber-500" style={{ left: `${Math.min(100, item.target * 10)}%` }} /></div></div>; }) : <div className="py-10 text-center text-sm" style={{ color: "var(--text-4)" }}>Nenhum tema com avaliações no filtro atual.</div>}</div>
              </Card>

              <Card className="overflow-hidden">
                <div className="flex flex-col gap-2 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5" style={{ borderBottom: "1px solid var(--border)" }}><div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(200,16,46,.08)", border: "1px solid rgba(200,16,46,.20)" }}><ClipboardCheck className="h-4 w-4" style={{ color: "var(--accent)" }} /></div><div><h2 className="text-sm font-black md:text-base" style={{ color: "var(--text-1)" }}>Histórico de Atividades</h2><p className="text-[10px]" style={{ color: "var(--text-4)" }}>Abra a seta de uma prova para visualizar questões, respostas e resultado detalhado.</p></div></div><span className="self-start rounded-full px-3 py-1 text-[10px] font-black md:self-auto" style={{ background: "var(--bg-surface-2)", color: "var(--text-4)" }}>{history.length} registros</span></div>
                <div>{history.length ? history.map((item) => item.type === "attempt" ? <AttemptHistoryItem key={item.id} attempt={item.attempt} exam={examMap.get(item.attempt.exam_id)} /> : <CronHistoryItem key={item.id} entry={item.entry} />) : <div className="py-12 text-center"><CalendarDays className="mx-auto h-9 w-9 opacity-30" style={{ color: "var(--text-4)" }} /><p className="mt-3 text-sm font-semibold" style={{ color: "var(--text-4)" }}>Sem atividades registradas no filtro atual.</p></div>}</div>
              </Card>

              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="p-4"><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-amber-500" /><div><p className="text-[9px] font-black uppercase" style={{ color: "var(--text-4)" }}>Pendências anuais</p><p className="mt-1 text-lg font-black" style={{ color: "var(--text-1)" }}>{pending}</p></div></div></Card>
                <Card className="p-4"><div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-red-500" /><div><p className="text-[9px] font-black uppercase" style={{ color: "var(--text-4)" }}>Vencidas</p><p className="mt-1 text-lg font-black" style={{ color: "var(--text-1)" }}>{overdue}</p></div></div></Card>
                <Card className="p-4"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><div><p className="text-[9px] font-black uppercase" style={{ color: "var(--text-4)" }}>Realizadas no ano</p><p className="mt-1 text-lg font-black" style={{ color: "var(--text-1)" }}>{realized}</p></div></div></Card>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Loading() {
  return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
}
