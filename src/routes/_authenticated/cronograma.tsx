import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Search, Filter, CheckCircle2,
  Clock3, ShieldCheck, Pencil, Trash2, Users, Target, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { listEmployees, type Employee } from "@/lib/employees";
import { listExams } from "@/lib/exams";
import {
  JUSTIFICATION_OPTIONS, createCronogramaEntries, currentMonthStr, deleteCronogramaEntry,
  formatDate, formatMonth, listCronogramaEntries, shiftMonth, updateCronogramaEntry,
  cronogramaMetrics, type CronogramaEntry, type CronogramaEntryInput, type CronogramaStatus,
} from "@/lib/cronograma";

export const Route = createFileRoute("/_authenticated/cronograma")({
  head: () => ({
    meta: [
      { title: "Cronograma · SEGEMPAT" },
      { name: "description", content: "Gestão operacional do cronograma de treinamentos do SEGEMPAT." },
    ],
  }),
  component: CronogramaPage,
});

const emptyForm = (month: string): CronogramaEntryInput => ({
  month,
  employee_id: "",
  employee_name: "",
  employee_matricula: "",
  employee_sector: "",
  theme: "",
  type: "Planejado",
  status: "Pendente",
  justification: null,
  planned_date: null,
  completion_date: null,
  notes: null,
  exam_id: null,
  exam_title: null,
});

const statusStyle: Record<CronogramaStatus, { color: string; bg: string; border: string }> = {
  Pendente: { color: "#f59e0b", bg: "rgba(245,158,11,.10)", border: "rgba(245,158,11,.28)" },
  Realizado: { color: "#10b981", bg: "rgba(16,185,129,.10)", border: "rgba(16,185,129,.28)" },
  Justificado: { color: "#60a5fa", bg: "rgba(96,165,250,.10)", border: "rgba(96,165,250,.28)" },
};

function MetricCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: typeof Users }) {
  return (
    <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--text-4)" }}>{label}</p>
          <p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)", fontFamily: "var(--font-heading)" }}>{value}</p>
          {sub && <p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
          <Icon className="w-4.5 h-4.5" style={{ color: "var(--accent)" }} />
        </div>
      </div>
    </div>
  );
}

function CronogramaPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.isAdmin ?? false;
  const [month, setMonth] = useState(currentMonthStr());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [sectorFilter, setSectorFilter] = useState<string>("Todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CronogramaEntry | null>(null);
  const [form, setForm] = useState<CronogramaEntryInput>(() => emptyForm(month));
  const [toDelete, setToDelete] = useState<CronogramaEntry | null>(null);

  const entriesQuery = useQuery({
    queryKey: ["cronograma", month],
    queryFn: () => listCronogramaEntries(month),
  });
  const employeesQuery = useQuery({ queryKey: ["employees"], queryFn: listEmployees });
  const examsQuery = useQuery({ queryKey: ["exams"], queryFn: listExams });

  const entries = entriesQuery.data ?? [];
  const employees = (employeesQuery.data ?? []).filter((e) => e.status === "Ativo" && e.access_profile !== "Inspetor");
  const exams = (examsQuery.data ?? []).filter((e) => e.status === "Publicada");
  const metrics = cronogramaMetrics(entries);

  const sectors = useMemo(() => ["Todos", ...Array.from(new Set(employees.map((e) => e.sector))).sort()], [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (statusFilter !== "Todos" && entry.status !== statusFilter) return false;
      if (sectorFilter !== "Todos" && entry.employee_sector !== sectorFilter) return false;
      if (!q) return true;
      return [entry.employee_name, entry.employee_matricula, entry.employee_sector, entry.theme]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [entries, search, statusFilter, sectorFilter]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cronograma", month] });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.employee_id) throw new Error("Selecione o colaborador");
      if (!form.theme.trim()) throw new Error("Informe o tema");
      if (form.status === "Justificado" && !form.justification) throw new Error("Informe a justificativa");
      if (editing) await updateCronogramaEntry(editing.id, form);
      else await createCronogramaEntries([form]);
    },
    onSuccess: () => {
      toast.success(editing ? "Lançamento atualizado" : "Lançamento criado");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm(month));
      invalidate();
    },
    onError: (e: Error) => {
      const duplicate = e.message.toLowerCase().includes("duplicate");
      toast.error(duplicate ? "Já existe um lançamento igual para este colaborador, tema e data." : e.message);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCronogramaEntry(id),
    onSuccess: () => {
      toast.success("Lançamento excluído");
      setToDelete(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectEmployee = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    setForm((f) => ({
      ...f,
      employee_id: id,
      employee_name: emp?.full_name ?? "",
      employee_matricula: emp?.matricula ?? "",
      employee_sector: emp?.sector ?? "",
    }));
  };

  const selectExam = (id: string) => {
    if (id === "none") {
      setForm((f) => ({ ...f, exam_id: null, exam_title: null }));
      return;
    }
    const exam = exams.find((e) => e.id === id);
    setForm((f) => ({ ...f, exam_id: id, exam_title: exam?.title ?? null, theme: exam?.title || f.theme }));
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm(month));
    setDialogOpen(true);
  };

  const openEdit = (entry: CronogramaEntry) => {
    setEditing(entry);
    setForm({
      month: entry.month,
      employee_id: entry.employee_id,
      employee_name: entry.employee_name,
      employee_matricula: entry.employee_matricula,
      employee_sector: entry.employee_sector,
      theme: entry.theme,
      exam_id: entry.exam_id,
      exam_title: entry.exam_title,
      type: entry.type,
      status: entry.status,
      justification: entry.justification,
      planned_date: entry.planned_date,
      completion_date: entry.completion_date,
      notes: entry.notes,
      question_bank_ids: entry.question_bank_ids,
    });
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-10">
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[1.5rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118 0%,#2b0b13 48%,#111216 100%)", border: "1px solid rgba(200,16,46,.26)", boxShadow: "0 10px 34px rgba(200,16,46,.12)" }}>
        <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle,rgba(200,16,46,.24),transparent 70%)" }} />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.22em]" style={{ color: "rgba(255,255,255,.42)" }}>
              <CalendarDays className="w-3.5 h-3.5" /> Planejamento operacional
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>Cronograma</h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,.5)" }}>Treinamentos, pendências e execução em uma única visão.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)" }}>
              <button type="button" className="h-10 w-10 flex items-center justify-center text-white/70" onClick={() => setMonth((m) => shiftMonth(m, -1))}><ChevronLeft className="w-4 h-4" /></button>
              <button type="button" className="h-10 px-3 text-sm font-bold text-white capitalize min-w-[150px]" onClick={() => setMonth(currentMonthStr())}>{formatMonth(month)}</button>
              <button type="button" className="h-10 w-10 flex items-center justify-center text-white/70" onClick={() => setMonth((m) => shiftMonth(m, 1))}><ChevronRight className="w-4 h-4" /></button>
            </div>
            {isAdmin && <Button onClick={openNew} className="h-10 bg-[#C8102E] hover:bg-[#A00D24] text-white font-bold"><Plus className="w-4 h-4 mr-2" /> Novo lançamento</Button>}
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard label="Planejados" value={metrics.total} icon={Target} />
        <MetricCard label="Realizados" value={metrics.realizado} icon={CheckCircle2} />
        <MetricCard label="Pendentes" value={metrics.pendente} icon={Clock3} />
        <MetricCard label="Justificados" value={metrics.justificado} icon={ShieldCheck} />
        <MetricCard label="Execução" value={`${metrics.executionRate}%`} sub="realizado ÷ total" icon={CalendarDays} />
      </div>

      <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <h2 className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Filtros operacionais</h2>
          {(search || statusFilter !== "Todos" || sectorFilter !== "Todos") && (
            <button type="button" onClick={() => { setSearch(""); setStatusFilter("Todos"); setSectorFilter("Todos"); }} className="ml-auto flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--text-4)" }}><X className="w-3 h-3" /> Limpar</button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-4)" }} />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar colaborador, matrícula, setor ou tema..." className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Todos","Pendente","Realizado","Justificado"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
          <Select value={sectorFilter} onValueChange={setSectorFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sectors.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
        </div>
      </section>

      {entriesQuery.isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>
      ) : entriesQuery.isError ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><p className="font-bold" style={{ color: "var(--text-1)" }}>Não foi possível carregar o cronograma.</p><p className="text-sm mt-1" style={{ color: "var(--text-4)" }}>Verifique se a migration do Cronograma já foi aplicada ao Supabase.</p></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <CalendarDays className="mx-auto w-10 h-10 opacity-30" style={{ color: "var(--text-4)" }} />
          <p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>{entries.length ? "Nenhum lançamento encontrado com esses filtros." : `Nenhum lançamento em ${formatMonth(month)}.`}</p>
          {isAdmin && !entries.length && <p className="text-sm mt-1" style={{ color: "var(--text-4)" }}>Crie o primeiro lançamento para começar o planejamento do mês.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry, index) => {
            const s = statusStyle[entry.status];
            return (
              <motion.article key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 10) * .03 }} className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
                <div className="h-[3px]" style={{ background: s.color }} />
                <div className="p-4 md:p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm md:text-base truncate" style={{ color: "var(--text-1)" }}>{entry.employee_name}</h3>
                      <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>{entry.status}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--text-4)" }}>Mat. {entry.employee_matricula} · {entry.employee_sector}</p>
                    <p className="mt-3 text-sm font-semibold" style={{ color: "var(--text-2)" }}>{entry.theme}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-4)" }}>
                      <span>Prevista: <strong style={{ color: "var(--text-3)" }}>{formatDate(entry.planned_date)}</strong></span>
                      <span>Conclusão: <strong style={{ color: "var(--text-3)" }}>{formatDate(entry.completion_date)}</strong></span>
                      {entry.exam_title && <span>Prova: <strong style={{ color: "var(--text-3)" }}>{entry.exam_title}</strong></span>}
                    </div>
                    {entry.status === "Justificado" && entry.justification && <p className="mt-2 text-xs" style={{ color: s.color }}>Justificativa: {entry.justification}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openEdit(entry)}><Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar</Button>
                      <Button variant="outline" size="sm" className="text-red-500" onClick={() => setToDelete(entry)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5"><Label>Colaborador *</Label><Select value={form.employee_id} onValueChange={selectEmployee}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{employees.map((e: Employee) => <SelectItem key={e.id} value={e.id}>{e.full_name} · {e.matricula} · {e.sector}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Prova vinculada</Label><Select value={form.exam_id || "none"} onValueChange={selectExam}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma prova</SelectItem>{exams.map((exam) => <SelectItem key={exam.id} value={exam.id}>{exam.title}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label>Tema *</Label><Input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} placeholder="Tema do treinamento" /></div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5"><Label>Tipo</Label><Select value={form.type || "Planejado"} onValueChange={(v) => setForm({ ...form, type: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Planejado">Planejado</SelectItem><SelectItem value="Realizado">Realizado</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Situação</Label><Select value={form.status || "Pendente"} onValueChange={(v) => setForm({ ...form, status: v as CronogramaStatus, justification: v === "Justificado" ? form.justification : null })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Realizado">Realizado</SelectItem><SelectItem value="Justificado">Justificado</SelectItem></SelectContent></Select></div>
              {form.status === "Justificado" && <div className="space-y-1.5"><Label>Justificativa *</Label><Select value={form.justification || ""} onValueChange={(v) => setForm({ ...form, justification: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{JUSTIFICATION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5"><Label>Data prevista</Label><Input type="date" value={form.planned_date || ""} onChange={(e) => setForm({ ...form, planned_date: e.target.value || null })} /></div>
              <div className="space-y-1.5"><Label>Data de conclusão</Label><Input type="date" value={form.completion_date || ""} onChange={(e) => setForm({ ...form, completion_date: e.target.value || null })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Observações</Label><textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} className="min-h-24 w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-[#C8102E] hover:bg-[#A00D24] text-white font-bold">{save.isPending ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir lançamento?</AlertDialogTitle><AlertDialogDescription>{toDelete ? `${toDelete.employee_name} · ${toDelete.theme}. Esta ação não pode ser desfeita.` : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-[#C8102E] hover:bg-[#A00D24]" onClick={() => toDelete && remove.mutate(toDelete.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
