import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Search,
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
import { formatDate } from "@/lib/cronograma";
import { operationalDate, operationalMonth, operationalYear } from "@/lib/operational-time";

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

  const employees = useMemo(
    () => (query.data?.employees ?? []).filter((e) => e.status === "Ativo" && e.access_profile !== "Inspetor"),
    [query.data],
  );

  const employeeRows = useMemo(() => {
    if (!query.data) return [];
    return employees.map((employee) => {
      const attempts = query.data!.attempts.filter((a) => a.matricula === employee.matricula);
      const cron = query.data!.cronograma.filter((entry) => entry.employee_id === employee.id);
      const pendingEntries = cron.filter((entry) => entry.status === "Pendente");
      const overdue = pendingEntries.filter(
        (entry) => entry.month < currentMonth || Boolean(entry.planned_date && entry.planned_date < today),
      ).length;
      const passed = attempts.filter((a) => a.passed).length;
      const avg = attempts.length
        ? Math.round((attempts.reduce((sum, a) => sum + Number(a.score || 0), 0) / attempts.length) * 10) / 10
        : 0;
      const approval = attempts.length ? Math.round((passed / attempts.length) * 100) : 0;
      const level: PerfFilter = overdue > 0
        ? "atencao"
        : !attempts.length
          ? "sem-dados"
          : avg >= 9
            ? "excelente"
            : avg >= 7
              ? "bom"
              : "atencao";
      return { employee, attempts, cron, passed, avg, approval, overdue, level };
    });
  }, [currentMonth, employees, query.data, today]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employeeRows.filter((row) => {
      const matchSearch =
        !term ||
        row.employee.full_name.toLowerCase().includes(term) ||
        row.employee.matricula.toLowerCase().includes(term) ||
        row.employee.sector.toLowerCase().includes(term);
      const matchPerf = perfFilter === "todos" || row.level === perfFilter;
      return matchSearch && matchPerf;
    });
  }, [employeeRows, perfFilter, search]);

  if (query.isLoading) return <Loading />;
  if (query.isError || !query.data) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
        <p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>
          Não foi possível carregar a análise individual.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => query.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      </Card>
    );
  }

  const activeRow = employeeRows.find((row) => row.employee.id === selected) ?? filteredRows[0] ?? employeeRows[0];
  const employee = activeRow?.employee;
  const attempts = activeRow?.attempts ?? [];
  const cron = activeRow?.cron ?? [];
  const realized = cron.filter((entry) => entry.status === "Realizado").length;
  const pending = cron.filter((entry) => entry.status === "Pendente").length;
  const overdue = activeRow?.overdue ?? 0;
  const failed = attempts.filter((attempt) => !attempt.passed).length;
  const avg = activeRow?.avg ?? 0;
  const approval = activeRow?.approval ?? 0;
  const sortedAttempts = [...attempts].sort((a, b) => a.finished_at.localeCompare(b.finished_at));
  const lastScore = sortedAttempts.at(-1)?.score ?? 0;
  const previousScore = sortedAttempts.at(-2)?.score ?? lastScore;
  const trend = Number(lastScore) - Number(previousScore);

  const points = sortedAttempts.slice(-8).map((attempt, index, arr) => {
    const x = arr.length <= 1 ? 50 : (index / (arr.length - 1)) * 100;
    const y = 100 - Math.max(0, Math.min(10, Number(attempt.score || 0))) * 10;
    return `${x},${y}`;
  });

  const toneFor = (level: PerfFilter) => {
    if (level === "excelente") return { color: "#10b981", label: "Excelente" };
    if (level === "bom") return { color: "#3b82f6", label: "Bom" };
    if (level === "atencao") return { color: "#f59e0b", label: "Atenção" };
    return { color: "#7c8597", label: "Sem dados" };
  };

  return (
    <div className="mx-auto max-w-[1380px] space-y-4 pb-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: "rgba(200,16,46,.10)", border: "1px solid rgba(200,16,46,.28)" }}
          >
            <UserRoundSearch className="h-5 w-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight md:text-2xl" style={{ color: "var(--text-1)" }}>
              Painel de Análise Individual
            </h1>
            <p className="mt-0.5 text-xs md:text-sm" style={{ color: "var(--text-4)" }}>
              {employees.length} operadores ativos · selecione um colaborador para analisar
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <Card className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-4)" }} />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome ou matrícula..."
                className="pl-9"
              />
            </div>
            <div className="mt-2">
              <Select value={perfFilter} onValueChange={(value) => setPerfFilter(value as PerfFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os desempenhos</SelectItem>
                  <SelectItem value="sem-dados">Sem dados</SelectItem>
                  <SelectItem value="atencao">Atenção</SelectItem>
                  <SelectItem value="bom">Bom</SelectItem>
                  <SelectItem value="excelente">Excelente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <p className="px-1 text-xs font-semibold" style={{ color: "var(--text-4)" }}>
            {filteredRows.length} colaborador{filteredRows.length === 1 ? "" : "es"}
          </p>

          <div className="space-y-2">
            {filteredRows.map((row) => {
              const active = row.employee.id === employee?.id;
              const tone = toneFor(row.level);
              return (
                <button
                  key={row.employee.id}
                  onClick={() => setSelected(row.employee.id)}
                  className="w-full rounded-2xl p-3 text-left transition-[border-color,background]"
                  style={{
                    background: active ? "rgba(200,16,46,.08)" : "var(--bg-surface)",
                    border: active ? "1px solid rgba(200,16,46,.42)" : "1px solid var(--border)",
                    boxShadow: active ? "0 0 0 1px rgba(200,16,46,.08), var(--shadow-card)" : "var(--shadow-card)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-black"
                      style={{ background: active ? "#C8102E" : "var(--bg-surface-3)", color: active ? "#fff" : tone.color }}
                    >
                      {row.employee.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black" style={{ color: "var(--text-1)" }}>
                          {row.employee.full_name}
                        </p>
                        <span className="text-lg font-black" style={{ color: tone.color }}>
                          {row.attempts.length ? row.avg : "—"}
                        </span>
                      </div>
                      <p className="text-[11px]" style={{ color: "var(--text-4)" }}>
                        Mat. {row.employee.matricula} · {row.employee.sector}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span style={{ color: "var(--text-4)" }}>Aprovação</span>
                        <span className="font-black" style={{ color: tone.color }}>{row.approval}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-3)" }}>
                        <div className="h-full rounded-full" style={{ width: `${row.approval}%`, background: tone.color }} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          {!employee ? (
            <Card className="flex min-h-[360px] flex-col items-center justify-center p-10 text-center">
              <UserRoundSearch className="h-12 w-12" style={{ color: "var(--accent)" }} />
              <p className="mt-5 text-xl font-black" style={{ color: "var(--text-1)" }}>Selecione um colaborador</p>
              <p className="mt-2 text-sm" style={{ color: "var(--text-4)" }}>Clique na lista à esquerda para ver a análise completa.</p>
            </Card>
          ) : (
            <>
              <Card className="overflow-hidden">
                <div className="relative p-4 md:p-5" style={{ background: "linear-gradient(135deg,rgba(200,16,46,.12),rgba(200,16,46,.035))" }}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C8102E] text-lg font-black text-white">
                        {employee.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-base font-black" style={{ color: "var(--text-1)" }}>{employee.full_name}</p>
                        <p className="text-xs" style={{ color: "var(--text-4)" }}>Mat. {employee.matricula} · {employee.sector} · Operacional</p>
                      </div>
                    </div>
                    <span
                      className="self-start rounded-lg px-2.5 py-1 text-[10px] font-black uppercase sm:self-auto"
                      style={{ background: `${toneFor(activeRow.level).color}18`, color: toneFor(activeRow.level).color }}
                    >
                      {toneFor(activeRow.level).label}
                    </span>
                  </div>
                  <div className="mt-4 rounded-xl p-3" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}>
                    <p className="text-[10px] font-black uppercase tracking-[.12em]" style={{ color: "var(--accent)" }}>Análise automatizada</p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-3)" }}>
                      Média geral de {avg.toFixed(1)} com {approval}% de aprovação. {pending > 0 ? `${pending} pendência${pending === 1 ? "" : "s"} no cronograma${overdue > 0 ? `, sendo ${overdue} vencida${overdue === 1 ? "" : "s"}.` : ", nenhuma vencida."}` : "Sem pendências no cronograma."}
                    </p>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                  ["Registros", cron.length + attempts.length, "cronograma + avaliações", "#3b82f6", Target],
                  ["Média geral", avg.toFixed(1), "0 a 10", "#f59e0b", BarChart3],
                  ["Aprovação", `${approval}%`, `${activeRow.passed} aprovações`, "#10b981", CheckCircle2],
                  ["Tendência", trend === 0 ? "→" : trend > 0 ? "↑" : "↓", trend === 0 ? "Estável" : trend > 0 ? `+${trend.toFixed(1)}` : trend.toFixed(1), trend >= 0 ? "#10b981" : "#ef4444", trend >= 0 ? TrendingUp : TrendingDown],
                ].map(([label, value, sub, color, Icon]: any) => (
                  <Card key={label} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: "var(--text-4)" }}>{label}</p>
                        <p className="mt-2 text-2xl font-black" style={{ color }}>{value}</p>
                        <p className="mt-1 text-[10px]" style={{ color: "var(--text-4)" }}>{sub}</p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}14`, border: `1px solid ${color}35` }}>
                        <Icon className="h-4 w-4" style={{ color }} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <TrendingUp className="h-4 w-4" style={{ color: "var(--accent)" }} />
                  <h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Evolução de Desempenho</h2>
                </div>
                <div className="p-4 md:p-5">
                  {sortedAttempts.length < 2 ? (
                    <div className="py-12 text-center text-sm" style={{ color: "var(--text-4)" }}>São necessárias ao menos duas provas para gerar a curva de evolução.</div>
                  ) : (
                    <div className="relative h-[220px] rounded-xl p-4" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}>
                      <div className="absolute inset-x-4 top-1/2 border-t border-dashed" style={{ borderColor: "rgba(245,158,11,.35)" }} />
                      <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Evolução das notas">
                        <polyline points={points.join(" ")} fill="none" stroke="#e11d48" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                        {sortedAttempts.slice(-8).map((attempt, index, arr) => {
                          const x = arr.length <= 1 ? 50 : (index / (arr.length - 1)) * 100;
                          const y = 100 - Math.max(0, Math.min(10, Number(attempt.score || 0))) * 10;
                          return <circle key={attempt.id} cx={x} cy={y} r="2.2" fill="#fff" stroke="#e11d48" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />;
                        })}
                      </svg>
                    </div>
                  )}
                </div>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(239,68,68,.18)" }}>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Precisa Melhorar</h2>
                    <span className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: "rgba(239,68,68,.10)", color: "#ef4444" }}>{failed + overdue} item(ns)</span>
                  </div>
                  <div className="space-y-2 p-3">
                    {failed > 0 && <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,.06)" }}><p className="text-xs font-bold" style={{ color: "var(--text-2)" }}>{failed} reprovação{failed === 1 ? "" : "ões"} em provas</p></div>}
                    {overdue > 0 && <div className="rounded-xl p-3" style={{ background: "rgba(245,158,11,.06)" }}><p className="text-xs font-bold" style={{ color: "var(--text-2)" }}>{overdue} atividade{overdue === 1 ? "" : "s"} vencida{overdue === 1 ? "" : "s"} no cronograma</p></div>}
                    {failed + overdue === 0 && <p className="p-4 text-center text-xs" style={{ color: "var(--text-4)" }}>Nenhum ponto crítico identificado.</p>}
                  </div>
                </Card>

                <Card className="overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(16,185,129,.18)" }}>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Pontos Fortes</h2>
                    <span className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: "rgba(16,185,129,.10)", color: "#10b981" }}>{activeRow.passed} aprov. · {realized} real.</span>
                  </div>
                  <div className="space-y-2 p-3">
                    {activeRow.passed > 0 && <div className="rounded-xl p-3" style={{ background: "rgba(16,185,129,.06)" }}><p className="text-xs font-bold" style={{ color: "var(--text-2)" }}>{activeRow.passed} prova{activeRow.passed === 1 ? "" : "s"} aprovada{activeRow.passed === 1 ? "" : "s"}</p></div>}
                    {realized > 0 && <div className="rounded-xl p-3" style={{ background: "rgba(59,130,246,.06)" }}><p className="text-xs font-bold" style={{ color: "var(--text-2)" }}>{realized} atividade{realized === 1 ? "" : "s"} do cronograma realizada{realized === 1 ? "" : "s"}</p></div>}
                    {realized + activeRow.passed === 0 && <p className="p-4 text-center text-xs" style={{ color: "var(--text-4)" }}>Ainda não há histórico suficiente para destacar pontos fortes.</p>}
                  </div>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <Target className="h-4 w-4" style={{ color: "var(--accent)" }} />
                  <h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Histórico de Atividades</h2>
                  <span className="ml-auto text-[10px]" style={{ color: "var(--text-4)" }}>{attempts.length + cron.length} registros</span>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                  {attempts.length === 0 && cron.length === 0 ? (
                    <p className="p-7 text-center text-sm" style={{ color: "var(--text-4)" }}>Sem atividades registradas no período.</p>
                  ) : (
                    <>
                      {[...attempts].sort((a, b) => b.finished_at.localeCompare(a.finished_at)).slice(0, 6).map((attempt) => (
                        <div key={attempt.id} className="flex items-center gap-3 p-3 md:px-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: attempt.passed ? "rgba(16,185,129,.10)" : "rgba(239,68,68,.10)" }}>
                            {attempt.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black" style={{ color: "var(--text-2)" }}>Prova · nota {attempt.score}</p>
                            <p className="mt-0.5 text-[10px]" style={{ color: "var(--text-4)" }}>{new Date(attempt.finished_at).toLocaleDateString("pt-BR", { timeZone: "America/Maceio" })}</p>
                          </div>
                          <span className="text-xs font-black" style={{ color: attempt.passed ? "#10b981" : "#ef4444" }}>{attempt.passed ? "Aprovado" : "Reprovado"}</span>
                          <ChevronRight className="h-4 w-4" style={{ color: "var(--text-4)" }} />
                        </div>
                      ))}
                      {[...cron].sort((a, b) => (b.planned_date || "").localeCompare(a.planned_date || "")).slice(0, 4).map((entry) => (
                        <div key={entry.id} className="flex items-center gap-3 p-3 md:px-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--accent-soft)" }}><Target className="h-4 w-4" style={{ color: "var(--accent)" }} /></div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-black" style={{ color: "var(--text-2)" }}>{entry.theme}</p>
                            <p className="mt-0.5 text-[10px]" style={{ color: "var(--text-4)" }}>{formatDate(entry.planned_date)}</p>
                          </div>
                          <span className="text-[10px] font-black" style={{ color: entry.status === "Realizado" ? "#10b981" : entry.status === "Pendente" ? "#f59e0b" : "#60a5fa" }}>{entry.status}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} />
    </div>
  );
}
