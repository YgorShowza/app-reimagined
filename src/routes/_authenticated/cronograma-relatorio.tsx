import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileSpreadsheet, Printer, Download, CalendarDays, BarChart3,
  CheckCircle2, Clock3, ShieldCheck, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  annualSummary,
  cronogramaMetrics,
  currentMonthStr,
  formatDate,
  formatMonth,
  listCronogramaEntries,
  listCronogramaEntriesByYear,
  shiftMonth,
  type CronogramaEntry,
} from "@/lib/cronograma";

export const Route = createFileRoute("/_authenticated/cronograma-relatorio")({
  head: () => ({ meta: [{ title: "Relatório do Cronograma · SEGEMPAT" }] }),
  component: CronogramaReport,
});

type Mode = "mensal" | "anual";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
      {children}
    </section>
  );
}

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportEntries(entries: CronogramaEntry[], filename: string) {
  const rows: string[][] = [
    ["Mês", "Matrícula", "Colaborador", "Setor", "Tema", "Situação", "Tipo", "Data prevista", "Data de conclusão", "Justificativa", "Prova vinculada", "Observações"],
    ...entries.map((entry) => [
      entry.month,
      entry.employee_matricula,
      entry.employee_name,
      entry.employee_sector,
      entry.theme,
      entry.status,
      entry.type,
      formatDate(entry.planned_date),
      formatDate(entry.completion_date),
      entry.justification ?? "",
      entry.exam_title ?? "",
      entry.notes ?? "",
    ]),
  ];
  downloadCsv(filename, rows);
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof CalendarDays }) {
  return (
    <Card className="p-4 print:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[.14em] font-black" style={{ color: "var(--text-4)" }}>{label}</p>
          <p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{value}</p>
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center print:hidden" style={{ background: "var(--accent-soft)" }}>
          <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
        </div>
      </div>
    </Card>
  );
}

function CronogramaReport() {
  const initialMonth = currentMonthStr();
  const [mode, setMode] = useState<Mode>("mensal");
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(Number(initialMonth.slice(0, 4)));

  const monthQuery = useQuery({
    queryKey: ["cronograma-report-month", month],
    queryFn: () => listCronogramaEntries(month),
    enabled: mode === "mensal",
  });
  const yearQuery = useQuery({
    queryKey: ["cronograma-report-year", year],
    queryFn: () => listCronogramaEntriesByYear(year),
    enabled: mode === "anual",
  });

  const entries = mode === "mensal" ? (monthQuery.data ?? []) : (yearQuery.data ?? []);
  const metrics = cronogramaMetrics(entries);
  const yearly = useMemo(() => annualSummary(yearQuery.data ?? [], year), [yearQuery.data, year]);
  const loading = mode === "mensal" ? monthQuery.isLoading : yearQuery.isLoading;

  const title = mode === "mensal" ? formatMonth(month) : `Ano ${year}`;

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10 print:max-w-none print:space-y-3 print:p-0">
      <div className="relative overflow-hidden rounded-[1.5rem] p-5 md:p-6 print:bg-white print:border print:border-gray-300" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40 print:text-gray-500"><FileSpreadsheet className="w-4 h-4" /> Fechamento documental</div>
            <h1 className="mt-2 text-2xl md:text-3xl font-black text-white print:text-black">Relatório do Cronograma</h1>
            <p className="mt-1 text-sm text-white/50 print:text-gray-600">Visão consolidada para conferência, exportação e impressão.</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" onClick={() => exportEntries(entries, `SEGEMPAT_Cronograma_${mode === "mensal" ? month : year}.csv`)} disabled={!entries.length}>
              <Download className="w-4 h-4 mr-2" /> CSV / Excel
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Imprimir / PDF
            </Button>
          </div>
        </div>
      </div>

      <Card className="p-2 print:hidden">
        <div className="grid grid-cols-2 gap-1 max-w-md">
          {(["mensal", "anual"] as Mode[]).map((value) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className="h-10 rounded-xl text-xs font-black transition-all"
              style={mode === value ? { background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid rgba(200,16,46,.2)" } : { color: "var(--text-4)", border: "1px solid transparent" }}
            >
              {value === "mensal" ? "Relatório mensal" : "Relatório anual"}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4 print:shadow-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase font-black tracking-[.14em]" style={{ color: "var(--text-4)" }}>Período selecionado</p>
            <p className="mt-1 text-lg font-black capitalize" style={{ color: "var(--text-1)" }}>{title}</p>
          </div>
          <div className="flex items-center rounded-xl overflow-hidden print:hidden" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
            <button className="w-10 h-9 flex items-center justify-center" style={{ color: "var(--text-3)" }} onClick={() => mode === "mensal" ? setMonth((value) => shiftMonth(value, -1)) : setYear((value) => value - 1)}><ChevronLeft className="w-4 h-4" /></button>
            <button className="px-4 h-9 text-xs font-black min-w-[145px]" style={{ color: "var(--text-1)", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }} onClick={() => mode === "mensal" ? setMonth(initialMonth) : setYear(Number(initialMonth.slice(0, 4)))}>{title}</button>
            <button className="w-10 h-9 flex items-center justify-center" style={{ color: "var(--text-3)" }} onClick={() => mode === "mensal" ? setMonth((value) => shiftMonth(value, 1)) : setYear((value) => value + 1)}><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Metric label="Planejados" value={metrics.total} icon={CalendarDays} />
            <Metric label="Realizados" value={metrics.realizado} icon={CheckCircle2} />
            <Metric label="Pendentes" value={metrics.pendente} icon={Clock3} />
            <Metric label="Justificados" value={metrics.justificado} icon={ShieldCheck} />
            <Metric label="Execução" value={`${metrics.executionRate}%`} icon={BarChart3} />
          </div>

          {mode === "anual" && (
            <Card className="overflow-hidden print:shadow-none">
              <div className="px-4 py-3 font-black text-sm" style={{ color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>Resumo por mês</div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                {yearly.map((item) => (
                  <div key={item.month} className="p-4 text-center" style={{ borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                    <p className="text-xs font-black capitalize" style={{ color: "var(--text-2)" }}>{formatMonth(item.month).replace(/ de \d{4}$/i, "")}</p>
                    <p className="mt-2 text-xl font-black" style={{ color: item.executionRate >= 80 ? "#10b981" : item.executionRate >= 50 ? "#f59e0b" : item.total ? "var(--accent)" : "var(--text-4)" }}>{item.total ? `${item.executionRate}%` : "—"}</p>
                    <p className="mt-1 text-[10px]" style={{ color: "var(--text-4)" }}>{item.realizado}/{item.total} realizados</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="overflow-hidden print:shadow-none">
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="font-black text-sm" style={{ color: "var(--text-1)" }}>Registros do período</h2>
              <span className="text-[10px] font-black" style={{ color: "var(--text-4)" }}>{entries.length} registro(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead style={{ background: "var(--bg-surface-2)" }}>
                  <tr>
                    {["Mês", "Colaborador", "Matrícula", "Setor", "Tema", "Prevista", "Conclusão", "Situação"].map((head) => <th key={head} className="px-3 py-3 font-black uppercase tracking-[.08em]" style={{ color: "var(--text-4)", borderBottom: "1px solid var(--border)" }}>{head}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-3 py-3" style={{ color: "var(--text-4)" }}>{entry.month}</td>
                      <td className="px-3 py-3 font-semibold" style={{ color: "var(--text-1)" }}>{entry.employee_name}</td>
                      <td className="px-3 py-3" style={{ color: "var(--text-3)" }}>{entry.employee_matricula}</td>
                      <td className="px-3 py-3" style={{ color: "var(--text-3)" }}>{entry.employee_sector}</td>
                      <td className="px-3 py-3" style={{ color: "var(--text-2)" }}>{entry.theme}</td>
                      <td className="px-3 py-3" style={{ color: "var(--text-3)" }}>{formatDate(entry.planned_date)}</td>
                      <td className="px-3 py-3" style={{ color: "var(--text-3)" }}>{formatDate(entry.completion_date)}</td>
                      <td className="px-3 py-3 font-black" style={{ color: entry.status === "Realizado" ? "#10b981" : entry.status === "Pendente" ? "#f59e0b" : "#60a5fa" }}>{entry.status}</td>
                    </tr>
                  ))}
                  {!entries.length && <tr><td colSpan={8} className="px-4 py-10 text-center" style={{ color: "var(--text-4)" }}>Nenhum registro neste período.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="hidden print:block text-[10px] text-gray-500 pt-3">SEGEMPAT · Relatório gerado em {new Date().toLocaleString("pt-BR")}</p>
        </>
      )}
    </div>
  );
}
