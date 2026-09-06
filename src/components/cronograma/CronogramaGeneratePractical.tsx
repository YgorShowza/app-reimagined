import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listEmployees } from "@/lib/employees";
import { createCronogramaEntries, listCronogramaEntriesByYear, type CronogramaEntryInput } from "@/lib/cronograma";
import { listPracticalEvalTemplates, practicalDueMonths, type PracticalEvalTemplate } from "@/lib/practical-templates";
import { isSegempatApiConfigured } from "@/lib/backend/api-client";
import { operationalYear } from "@/lib/operational-time";

const RECURRENCE_LABEL: Record<string, string> = {
  monthly: "Mensal",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  once: "Única vez",
};

const MYSQL_ATOMIC_LIMIT = 1000;

function sectorMatch(template: PracticalEvalTemplate, employeeSector: string) {
  return template.target_sector === "Todos" || template.target_sector === employeeSector;
}

export function CronogramaGeneratePractical({ open, onOpenChange, onComplete }: { open: boolean; onOpenChange: (open: boolean) => void; onComplete?: () => void }) {
  const qc = useQueryClient();
  const [year, setYear] = useState(operationalYear());
  const [generating, setGenerating] = useState(false);

  const employeesQuery = useQuery({ queryKey: ["employees"], queryFn: listEmployees, enabled: open });
  const templatesQuery = useQuery({ queryKey: ["practical-eval-templates"], queryFn: listPracticalEvalTemplates, enabled: open });
  const existingQuery = useQuery({ queryKey: ["cronograma-year", year], queryFn: () => listCronogramaEntriesByYear(year), enabled: open });

  const operators = useMemo(() => (employeesQuery.data ?? []).filter((employee) => employee.status === "Ativo" && employee.access_profile !== "Inspetor"), [employeesQuery.data]);
  const templates = useMemo(() => (templatesQuery.data ?? []).filter((template) => template.status === "Ativo" && template.recurrence !== "once"), [templatesQuery.data]);

  const drafts = useMemo(() => {
    const existing = new Set((existingQuery.data ?? []).map((entry) => `${entry.employee_id}|${entry.theme.trim().toLowerCase()}|${entry.month}`));
    const rows: CronogramaEntryInput[] = [];
    for (const template of templates) {
      for (const monthIndex of practicalDueMonths(template.recurrence)) {
        const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
        for (const employee of operators) {
          if (!sectorMatch(template, employee.sector)) continue;
          const key = `${employee.id}|${template.title.trim().toLowerCase()}|${month}`;
          if (existing.has(key)) continue;
          rows.push({
            month,
            employee_id: employee.id,
            employee_name: employee.full_name,
            employee_matricula: employee.matricula,
            employee_sector: employee.sector,
            theme: template.title,
            type: "Planejado",
            status: "Pendente",
            planned_date: `${month}-15`,
            notes: template.platform ? `Avaliação prática — ${template.platform}` : "Avaliação prática recorrente",
          });
        }
      }
    }
    return rows;
  }, [existingQuery.data, operators, templates, year]);

  const apiMode = isSegempatApiConfigured();
  const exceedsAtomicLimit = apiMode && drafts.length > MYSQL_ATOMIC_LIMIT;

  const close = () => {
    if (generating) return;
    onOpenChange(false);
  };

  const generate = async () => {
    if (!drafts.length) return;
    if (exceedsAtomicLimit) {
      toast.error(`A geração encontrou ${drafts.length} lançamentos. No MySQL, o limite atômico é ${MYSQL_ATOMIC_LIMIT}; reduza o escopo para evitar geração parcial.`);
      return;
    }
    setGenerating(true);
    try {
      if (apiMode) {
        await createCronogramaEntries(drafts);
      } else {
        for (let index = 0; index < drafts.length; index += 100) {
          await createCronogramaEntries(drafts.slice(index, index + 100));
        }
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["cronograma-year", year] }),
        qc.invalidateQueries({ queryKey: ["cronograma-parity-year", year] }),
      ]);
      toast.success(`${drafts.length} avaliação(ões) prática(s) gerada(s) no cronograma.`);
      onComplete?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar as avaliações práticas.");
    } finally {
      setGenerating(false);
    }
  };

  const loading = employeesQuery.isLoading || templatesQuery.isLoading || existingQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={(next) => next ? onOpenChange(true) : close()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-[#C8102E]" /> Gerar Avaliações Práticas Recorrentes</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Ano</Label><Input className="w-32" type="number" value={year} onChange={(event) => setYear(Number(event.target.value) || operationalYear())} /></div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>Gera entradas <strong>Pendentes</strong> no cronograma respeitando recorrência, setor-alvo e evitando duplicidade por colaborador + tema + mês.</p>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#C8102E]" /></div> : <>
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Modelos ativos" value={templates.length} color="#3b82f6" />
              <Metric label="Operadores" value={operators.length} color="#10b981" />
              <Metric label="A gerar" value={drafts.length} color="#C8102E" />
            </div>
            {templates.length > 0 && <div className="rounded-xl p-3" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>{templates.map((template) => <div key={template.id} className="flex items-center justify-between gap-3 py-1 text-xs"><span className="font-semibold" style={{ color: "var(--text-1)" }}>{template.title}</span><span className="shrink-0" style={{ color: "var(--text-4)" }}>{RECURRENCE_LABEL[template.recurrence]} · {template.target_sector}</span></div>)}</div>}
            {exceedsAtomicLimit && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">Há {drafts.length} lançamentos para gerar. Em modo MySQL, reduza o escopo para no máximo {MYSQL_ATOMIC_LIMIT} por geração para manter tudo atômico.</div>}
            {drafts.length === 0 && <div className="py-4 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-2 text-sm" style={{ color: "var(--text-4)" }}>Nenhuma avaliação prática para gerar: todas já existem ou não há modelos ativos recorrentes.</p></div>}
          </>}
        </div>
        <DialogFooter><Button variant="outline" onClick={close} disabled={generating}>Cancelar</Button><Button onClick={generate} disabled={loading || !drafts.length || generating || exceedsAtomicLimit} className="bg-[#C8102E] text-white hover:bg-[#A00D24]">{generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</> : <><ClipboardList className="mr-2 h-4 w-4" /> Gerar {drafts.length}</>}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}><p className="text-2xl font-black" style={{ color }}>{value}</p><p className="text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--text-4)" }}>{label}</p></div>;
}