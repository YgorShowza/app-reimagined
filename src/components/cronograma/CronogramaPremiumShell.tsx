import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, CalendarDays, CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { CronogramaWorkspace } from "@/components/cronograma/CronogramaWorkspace";
import {
  annualSummary,
  currentMonthStr,
  formatMonth,
  listCronogramaEntriesByYear,
} from "@/lib/cronograma";
import "@/styles/cronograma-premium.css";

type PrimaryView = "calendario" | "ano";

function monthParts(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, 1);
  const short = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return { year, monthNumber, short: short.charAt(0).toUpperCase() + short.slice(1) };
}

function rateTone(rate: number, total: number) {
  if (!total) return { accent: "var(--text-4)", track: "var(--bg-surface-3)", soft: "var(--bg-surface-2)" };
  if (rate >= 80) return { accent: "#10b981", track: "rgba(16,185,129,.13)", soft: "rgba(16,185,129,.07)" };
  if (rate >= 50) return { accent: "#f59e0b", track: "rgba(245,158,11,.13)", soft: "rgba(245,158,11,.07)" };
  return { accent: "#ef476f", track: "rgba(239,71,111,.13)", soft: "rgba(239,71,111,.065)" };
}

export function CronogramaPremiumShell() {
  const nowMonth = currentMonthStr();
  const initialYear = Number(nowMonth.slice(0, 4));
  const [view, setView] = useState<PrimaryView>("calendario");
  const [year, setYear] = useState(initialYear);
  const [targetMonth, setTargetMonth] = useState<string | null>(null);
  const calendarWrapRef = useRef<HTMLDivElement>(null);

  const yearQuery = useQuery({
    queryKey: ["cronograma-premium-year", year],
    queryFn: () => listCronogramaEntriesByYear(year),
    enabled: view === "ano",
  });

  const yearly = useMemo(() => annualSummary(yearQuery.data ?? [], year), [yearQuery.data, year]);
  const yearlyTotals = useMemo(() => yearly.reduce((acc, item) => ({
    total: acc.total + item.total,
    realizado: acc.realizado + item.realizado,
    pendente: acc.pendente + item.pendente,
    justificado: acc.justificado + item.justificado,
  }), { total: 0, realizado: 0, pendente: 0, justificado: 0 }), [yearly]);
  const annualRate = yearlyTotals.total ? Math.round((yearlyTotals.realizado / yearlyTotals.total) * 100) : 0;

  useEffect(() => {
    if (view !== "calendario" || !targetMonth) return;
    const timer = window.setTimeout(() => {
      const root = calendarWrapRef.current;
      if (!root) return;
      const initial = currentMonthStr();
      const [iy, im] = initial.split("-").map(Number);
      const [ty, tm] = targetMonth.split("-").map(Number);
      const delta = (ty - iy) * 12 + (tm - im);
      const expectedLabel = formatMonth(initial).toLocaleLowerCase("pt-BR");
      const buttons = Array.from(root.querySelectorAll("button"));
      const center = buttons.find((button) => (button.textContent || "").trim().toLocaleLowerCase("pt-BR") === expectedLabel);
      if (!center || !center.parentElement) return;
      const siblings = Array.from(center.parentElement.children).filter((el): el is HTMLButtonElement => el instanceof HTMLButtonElement);
      const centerIndex = siblings.indexOf(center);
      const previous = siblings[centerIndex - 1];
      const next = siblings[centerIndex + 1];
      const control = delta < 0 ? previous : next;
      if (control) for (let i = 0; i < Math.abs(delta); i += 1) control.click();
      setTargetMonth(null);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [view, targetMonth]);

  const openMonth = (month: string) => {
    setTargetMonth(month);
    setView("calendario");
  };

  return (
    <div className="cronograma-premium-shell space-y-4">
      <section className="cronograma-view-switcher rounded-2xl p-2 md:p-2.5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex w-full md:w-auto rounded-xl p-1" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
            <button onClick={() => setView("calendario")} className="relative flex-1 md:min-w-[148px] h-10 rounded-lg flex items-center justify-center gap-2 text-xs font-black transition-all" style={view === "calendario" ? { color: "var(--text-1)" } : { color: "var(--text-4)" }}>
              {view === "calendario" && <motion.span layoutId="cronograma-primary-view" className="absolute inset-0 rounded-lg" style={{ background: "var(--accent-soft)", border: "1px solid rgba(200,16,46,.22)", boxShadow: "0 4px 16px rgba(200,16,46,.10)" }} />}
              <CalendarDays className="relative w-4 h-4" style={{ color: view === "calendario" ? "var(--accent)" : undefined }} />
              <span className="relative">Calendário</span>
            </button>
            <button onClick={() => setView("ano")} className="relative flex-1 md:min-w-[120px] h-10 rounded-lg flex items-center justify-center gap-2 text-xs font-black transition-all" style={view === "ano" ? { color: "var(--text-1)" } : { color: "var(--text-4)" }}>
              {view === "ano" && <motion.span layoutId="cronograma-primary-view" className="absolute inset-0 rounded-lg" style={{ background: "var(--accent-soft)", border: "1px solid rgba(200,16,46,.22)", boxShadow: "0 4px 16px rgba(200,16,46,.10)" }} />}
              <CalendarRange className="relative w-4 h-4" style={{ color: view === "ano" ? "var(--accent)" : undefined }} />
              <span className="relative">Ano</span>
            </button>
          </div>
          <p className="hidden md:block pr-2 text-[11px] font-medium" style={{ color: "var(--text-4)" }}>
            {view === "ano" ? "Visão executiva dos 12 meses" : "Gestão operacional e acompanhamento mensal"}
          </p>
        </div>
      </section>

      {view === "calendario" ? (
        <div ref={calendarWrapRef} className="cronograma-calendar-mode">
          <CronogramaWorkspace />
        </div>
      ) : (
        <AnnualPremiumView
          year={year}
          loading={yearQuery.isLoading}
          rows={yearly}
          annualRate={annualRate}
          totals={yearlyTotals}
          currentMonth={nowMonth}
          onPreviousYear={() => setYear((value) => value - 1)}
          onNextYear={() => setYear((value) => value + 1)}
          onCurrentYear={() => setYear(initialYear)}
          onMonth={openMonth}
        />
      )}
    </div>
  );
}

function AnnualPremiumView({
  year,
  rows,
  loading,
  annualRate,
  totals,
  currentMonth,
  onPreviousYear,
  onNextYear,
  onCurrentYear,
  onMonth,
}: {
  year: number;
  rows: ReturnType<typeof annualSummary>;
  loading: boolean;
  annualRate: number;
  totals: { total: number; realizado: number; pendente: number; justificado: number };
  currentMonth: string;
  onPreviousYear: () => void;
  onNextYear: () => void;
  onCurrentYear: () => void;
  onMonth: (month: string) => void;
}) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="annual-premium-panel overflow-hidden rounded-[1.5rem]" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
      <div className="annual-premium-heading px-4 py-4 md:px-5 md:py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between" style={{ borderBottom: "1px solid var(--border)", background: "linear-gradient(135deg,var(--bg-surface) 0%,var(--bg-surface-2) 100%)" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: "var(--accent-soft)", border: "1px solid rgba(200,16,46,.18)" }}><CalendarRange className="w-5 h-5" style={{ color: "var(--accent)" }} /></div>
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h2 className="text-sm md:text-base font-black uppercase tracking-[.08em]" style={{ color: "var(--text-1)" }}>Visão anual — {year}</h2><span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ color: annualRate >= 80 ? "#10b981" : annualRate >= 50 ? "#f59e0b" : "var(--accent)", background: "var(--bg-surface-3)" }}>{annualRate}% no ano</span></div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Clique em um mês para navegar diretamente para o calendário operacional.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-surface-2)" }}><button onClick={onPreviousYear} className="w-10 h-9 flex items-center justify-center" style={{ color: "var(--text-3)" }}><ChevronLeft className="w-4 h-4" /></button><button onClick={onCurrentYear} className="px-4 h-9 text-xs font-black min-w-[78px]" style={{ color: "var(--text-1)", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>{year}</button><button onClick={onNextYear} className="w-10 h-9 flex items-center justify-center" style={{ color: "var(--text-3)" }}><ChevronRight className="w-4 h-4" /></button></div>
          <div className="hidden xl:flex items-center gap-4 px-3 text-[10px] font-bold" style={{ color: "var(--text-4)" }}><span>{totals.realizado} realizados</span><span>{totals.pendente} pendentes</span><span>{totals.total} planejados</span></div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="w-9 h-9 rounded-full border-4 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} /></div>
      ) : (
        <div className="annual-premium-grid grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {rows.map((item, index) => {
            const tone = rateTone(item.executionRate, item.total);
            const parts = monthParts(item.month);
            const isCurrent = item.month === currentMonth;
            const degrees = Math.max(0, Math.min(360, item.executionRate * 3.6));
            return (
              <motion.button
                key={item.month}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * .025 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: .985 }}
                onClick={() => onMonth(item.month)}
                className={`annual-month-cell relative min-h-[180px] md:min-h-[190px] px-3 py-4 text-center transition-all ${isCurrent ? "is-current" : ""}`}
                style={{ background: isCurrent ? "linear-gradient(145deg,var(--accent-soft),var(--bg-surface))" : "var(--bg-surface)" }}
              >
                {isCurrent && <span className="absolute right-3 top-3 w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 10px var(--accent)" }} />}
                <p className="text-xs font-black" style={{ color: isCurrent ? "var(--accent)" : "var(--text-2)" }}>{parts.short}. <span style={{ color: "var(--text-4)" }}>de {parts.year}</span></p>
                <div className="mt-3 mx-auto relative w-[66px] h-[66px] rounded-full flex items-center justify-center" style={{ background: item.total ? `conic-gradient(${tone.accent} ${degrees}deg, ${tone.track} ${degrees}deg 360deg)` : tone.track, boxShadow: item.total ? `0 0 20px ${tone.soft}` : "none" }}>
                  <div className="absolute inset-[6px] rounded-full" style={{ background: "var(--bg-surface)" }} />
                  <span className="relative text-[11px] font-black" style={{ color: item.total ? tone.accent : "var(--text-4)" }}>{item.total ? `${item.executionRate}%` : "—"}</span>
                </div>
                <div className="mt-2 min-h-[42px]">
                  {item.total ? <><p className="text-[11px] font-bold" style={{ color: "var(--text-3)" }}>{item.realizado}/{item.total} concluídos</p>{item.pendente > 0 ? <span className="mt-1.5 inline-flex items-center text-[9px] font-black px-2 py-1 rounded-full" style={{ color: "#f59e0b", background: "rgba(245,158,11,.09)", border: "1px solid rgba(245,158,11,.22)" }}>{item.pendente} {item.pendente === 1 ? "pendência" : "pendências"}</span> : <span className="mt-1.5 inline-flex items-center text-[9px] font-black px-2 py-1 rounded-full" style={{ color: "#10b981", background: "rgba(16,185,129,.08)" }}>Mês concluído</span>}</> : <p className="text-[10px] font-medium" style={{ color: "var(--text-4)" }}>Sem registros</p>}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-[10px]" style={{ borderTop: "1px solid var(--border)", color: "var(--text-4)", background: "var(--bg-surface-2)" }}>
        <div className="flex items-center gap-4"><span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-emerald-500" /> ≥ 80%</span><span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-amber-500" /> 50–79%</span><span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-rose-500" /> &lt; 50%</span></div>
        <span className="flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Execução baseada em lançamentos reais</span>
      </div>
    </motion.section>
  );
}
