import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Printer, Search, ShieldCheck, Target, UserRound, XCircle } from "lucide-react";
import { getOperationalSnapshot } from "@/lib/insights";
import { operationalMonth } from "@/lib/operational-time";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function currentMonth() {
  return operationalMonth();
}

function monthLabel(value: string) {
  if (!value) return "";
  return new Date(`${value}-15T12:00:00`).toLocaleDateString("pt-BR", {
    timeZone: "America/Maceio",
    month: "long",
    year: "numeric",
  });
}

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const raw = value.length === 10 ? `${value}T12:00:00` : value;
  return new Date(raw).toLocaleDateString("pt-BR", {
    timeZone: "America/Maceio",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function MonthlyReportWorkspace() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [month, setMonth] = useState(currentMonth());
  const [search, setSearch] = useState("");
  const [openEmployee, setOpenEmployee] = useState<string | null>(null);
  const year = Number(month.slice(0, 4));

  const snapshot = useQuery({
    queryKey: ["monthly-report-snapshot", year],
    queryFn: () => getOperationalSnapshot(year),
    enabled: Boolean(user?.isAdmin),
    staleTime: 60_000,
  });

  const rows = useMemo(() => {
    if (!snapshot.data) return [];
    const data = snapshot.data;
    const examMap = new Map(data.exams.map((exam) => [exam.id, exam]));
    const s = search.trim().toLowerCase();

    return data.employees
      .filter((employee) => employee.status === "Ativo" && employee.access_profile !== "Inspetor")
      .filter((employee) => !s || employee.full_name.toLowerCase().includes(s) || employee.matricula.toLowerCase().includes(s) || employee.sector.toLowerCase().includes(s))
      .map((employee) => {
        const attemptsAll = data.attempts.filter((attempt) => attempt.matricula === employee.matricula);
        const attemptsMonth = attemptsAll.filter((attempt) => {
          const date = attempt.finished_at || attempt.created_at;
          return date ? operationalMonth(new Date(date)) === month : false;
        });
        const cron = data.cronograma.filter((entry) => (entry.employee_id === employee.id || entry.employee_matricula === employee.matricula) && entry.month === month);
        const realized = cron.filter((entry) => entry.status === "Realizado").length;
        const pending = cron.filter((entry) => entry.status === "Pendente").length;
        const justified = cron.filter((entry) => entry.status === "Justificado").length;
        const passed = attemptsMonth.filter((attempt) => attempt.passed).length;
        const avg = attemptsMonth.length
          ? Math.round((attemptsMonth.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0) / attemptsMonth.length) * 10) / 10
          : 0;
        return {
          employee,
          attemptsMonth: attemptsMonth.map((attempt) => ({ ...attempt, exam: examMap.get(attempt.exam_id) })),
          cron,
          realized,
          pending,
          justified,
          executionRate: cron.length ? Math.round((realized / cron.length) * 100) : 0,
          passed,
          approvalRate: attemptsMonth.length ? Math.round((passed / attemptsMonth.length) * 100) : 0,
          averageScore: avg,
        };
      })
      .sort((a, b) => a.employee.full_name.localeCompare(b.employee.full_name));
  }, [snapshot.data, month, search]);

  const totals = useMemo(() => ({
    employees: rows.length,
    planned: rows.reduce((sum, row) => sum + row.cron.length, 0),
    realized: rows.reduce((sum, row) => sum + row.realized, 0),
    attempts: rows.reduce((sum, row) => sum + row.attemptsMonth.length, 0),
  }), [rows]);

  if (userLoading) return <Loading />;
  if (!user?.isAdmin) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <ShieldCheck className="mx-auto mb-3 h-10 w-10" style={{ color: "var(--accent)" }} />
        <h1 className="text-lg font-black" style={{ color: "var(--text-1)" }}>Acesso restrito</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>O relatório mensal consolidado é exclusivo da Inspetoria.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-10">
      <header className="rounded-[1.5rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-white/40"><CalendarDays className="h-4 w-4" /> Fechamento mensal</div>
            <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Relatório Mensal</h1>
            <p className="mt-1 text-sm text-white/50">Performance individual, avaliações e execução do cronograma.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-10 rounded-xl px-3 text-sm outline-none"
              style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", color: "#fff" }}
            />
            <Button onClick={() => window.print()} variant="outline" className="gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white print:hidden">
              <Printer className="h-4 w-4" /> Imprimir visão atual
            </Button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Colaboradores" value={totals.employees} icon={UserRound} />
        <Metric label="Planejados" value={totals.planned} icon={ClipboardList} />
        <Metric label="Realizados" value={totals.realized} icon={Target} />
        <Metric label="Avaliações" value={totals.attempts} icon={Award} />
      </section>

      <section className="rounded-2xl p-4 print:hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-4)" }} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar colaborador, matrícula ou setor" className="pl-9" />
        </div>
      </section>

      <div className="space-y-3">
        {snapshot.isLoading ? <Loading /> : snapshot.isError ? (
          <div className="rounded-2xl p-8 text-center text-sm text-red-500" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>Não foi possível carregar os dados do relatório.</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Nenhum colaborador encontrado.</p>
          </div>
        ) : rows.map((row) => {
          const open = openEmployee === row.employee.id;
          return (
            <section key={row.employee.id} className="overflow-hidden rounded-2xl break-inside-avoid" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
              <button
                onClick={() => setOpenEmployee(open ? null : row.employee.id)}
                className="flex w-full items-center gap-3 p-4 text-left print:pointer-events-none"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black text-white" style={{ background: "linear-gradient(135deg,#C8102E,#861023)" }}>
                  {row.employee.full_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black" style={{ color: "var(--text-1)" }}>{row.employee.full_name}</p>
                  <p className="text-xs" style={{ color: "var(--text-4)" }}>Mat. {row.employee.matricula} · {row.employee.sector} · {monthLabel(month)}</p>
                </div>
                <div className="hidden items-center gap-5 md:flex">
                  <InlineStat label="Execução" value={`${row.executionRate}%`} good={row.executionRate >= 80} />
                  <InlineStat label="Média" value={row.attemptsMonth.length ? row.averageScore.toFixed(1) : "—"} good={row.averageScore >= 7} />
                  <InlineStat label="Aprovação" value={row.attemptsMonth.length ? `${row.approvalRate}%` : "—"} good={row.approvalRate >= 70} />
                </div>
                {open ? <ChevronUp className="h-4 w-4 print:hidden" style={{ color: "var(--text-4)" }} /> : <ChevronDown className="h-4 w-4 print:hidden" style={{ color: "var(--text-4)" }} />}
              </button>

              <div className={`${open ? "block" : "hidden"} border-t p-4 print:block`} style={{ borderColor: "var(--border-subtle)" }}>
                <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                  <SmallMetric label="Planejados" value={row.cron.length} />
                  <SmallMetric label="Realizados" value={row.realized} good />
                  <SmallMetric label="Pendentes" value={row.pending} warn={row.pending > 0} />
                  <SmallMetric label="Justificados" value={row.justified} />
                  <SmallMetric label="Avaliações" value={row.attemptsMonth.length} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <ReportBlock title="Cronograma do mês" icon={ClipboardList}>
                    {row.cron.length === 0 ? <Empty text="Sem itens no cronograma deste mês." /> : (
                      <div className="space-y-2">
                        {row.cron.map((entry) => (
                          <div key={entry.id} className="rounded-xl p-3" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold" style={{ color: "var(--text-1)" }}>{entry.theme}</p>
                                <p className="mt-1 text-[10px]" style={{ color: "var(--text-4)" }}>Prevista: {dateLabel(entry.planned_date)} · Realização: {dateLabel(entry.completion_date)}</p>
                              </div>
                              <StatusBadge status={entry.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ReportBlock>

                  <ReportBlock title="Avaliações do mês" icon={Award}>
                    {row.attemptsMonth.length === 0 ? <Empty text="Sem avaliações concluídas neste mês." /> : (
                      <div className="space-y-2">
                        {row.attemptsMonth.map((attempt) => (
                          <div key={attempt.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}>
                            {attempt.passed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold" style={{ color: "var(--text-1)" }}>{attempt.exam?.title ?? "Avaliação"}</p>
                              <p className="text-[10px]" style={{ color: "var(--text-4)" }}>{dateLabel(attempt.finished_at || attempt.created_at)}</p>
                            </div>
                            <span className="text-sm font-black" style={{ color: attempt.passed ? "#10b981" : "#ef4444" }}>{Number(attempt.score).toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ReportBlock>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof UserRound }) {
  return <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-4)" }}>{label}</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{value}</p></div><Icon className="h-4 w-4" style={{ color: "var(--accent)" }} /></div></div>;
}

function SmallMetric({ label, value, good = false, warn = false }: { label: string; value: number; good?: boolean; warn?: boolean }) {
  return <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}><p className="text-lg font-black" style={{ color: good ? "#10b981" : warn ? "#f59e0b" : "var(--text-1)" }}>{value}</p><p className="text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--text-4)" }}>{label}</p></div>;
}

function InlineStat({ label, value, good }: { label: string; value: string; good: boolean }) {
  return <div className="text-right"><p className="text-[9px] font-black uppercase" style={{ color: "var(--text-4)" }}>{label}</p><p className="text-xs font-black" style={{ color: good ? "#10b981" : "var(--text-2)" }}>{value}</p></div>;
}

function ReportBlock({ title, icon: Icon, children }: { title: string; icon: typeof Award; children: React.ReactNode }) {
  return <div><div className="mb-2 flex items-center gap-2"><Icon className="h-4 w-4" style={{ color: "var(--accent)" }} /><h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{title}</h3></div>{children}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const styles = status === "Realizado" ? { background: "rgba(16,185,129,.10)", color: "#10b981" } : status === "Justificado" ? { background: "rgba(59,130,246,.10)", color: "#3b82f6" } : { background: "rgba(245,158,11,.10)", color: "#f59e0b" };
  return <span className="rounded-full px-2 py-1 text-[9px] font-black" style={styles}>{status}</span>;
}

function Empty({ text }: { text: string }) { return <p className="rounded-xl p-4 text-center text-xs" style={{ background: "var(--bg-surface-2)", color: "var(--text-4)" }}>{text}</p>; }
function Loading() { return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>; }
