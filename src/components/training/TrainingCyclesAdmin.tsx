import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listEmployees } from "@/lib/employees";
import { operationalDate } from "@/lib/operational-time";
import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  calculateTrainingWindow,
  createTrainingSchedule,
  deleteTrainingSchedule,
  deriveTrainingStatus,
  listTrainingSchedules,
  updateTrainingSchedule,
  type TrainingSchedule,
} from "@/lib/training-schedules";

const statusStyle = {
  "Em dia": { color: "#10b981", bg: "rgba(16,185,129,.10)", icon: CheckCircle2 },
  "Próximo ao vencimento": { color: "#f59e0b", bg: "rgba(245,158,11,.10)", icon: Clock3 },
  Vencido: { color: "#ef4444", bg: "rgba(239,68,68,.10)", icon: AlertTriangle },
} as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export function TrainingCyclesAdmin() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.isAdmin ?? false;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingSchedule | null>(null);
  const [form, setForm] = useState({ employee_id: "", cycle_days: 90, last_training_date: "", observations: "" });

  const schedules = useQuery({ queryKey: ["training-schedules"], queryFn: listTrainingSchedules });
  const employees = useQuery({ queryKey: ["employees"], queryFn: listEmployees, enabled: isAdmin });
  const rows = schedules.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "Todos" && row.status !== filter) return false;
      return !q || [row.employee_name, row.employee_matricula].some((value) => (value || "").toLowerCase().includes(q));
    });
  }, [filter, rows, search]);

  const counts = useMemo(() => ({
    ok: rows.filter((row) => row.status === "Em dia").length,
    near: rows.filter((row) => row.status === "Próximo ao vencimento").length,
    expired: rows.filter((row) => row.status === "Vencido").length,
  }), [rows]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["training-schedules"] });

  const save = useMutation({
    mutationFn: async () => {
      if (!isAdmin) throw new Error("Ação exclusiva do Inspetor");
      const employee = (employees.data ?? []).find((item) => item.id === form.employee_id);
      if (!employee) throw new Error("Selecione o colaborador");
      if (!form.last_training_date) throw new Error("Informe a data do último treinamento");
      const cycleDays = Math.max(1, Number(form.cycle_days) || 90);
      const window = calculateTrainingWindow(form.last_training_date, cycleDays);
      const status = deriveTrainingStatus({ last_training_date: form.last_training_date, cycle_days: cycleDays, ...window });
      const payload = {
        employee_id: employee.id,
        employee_name: employee.full_name,
        employee_matricula: employee.matricula,
        cycle_days: cycleDays,
        last_training_date: form.last_training_date,
        window_start: window.window_start,
        window_end: window.window_end,
        observations: form.observations.trim() || null,
        status,
      };
      if (editing) await updateTrainingSchedule(editing.id, payload);
      else await createTrainingSchedule(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Ciclo atualizado" : "Ciclo criado");
      setOpen(false);
      setEditing(null);
      setForm({ employee_id: "", cycle_days: 90, last_training_date: "", observations: "" });
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteTrainingSchedule,
    onSuccess: () => { toast.success("Ciclo excluído"); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ employee_id: "", cycle_days: 90, last_training_date: operationalDate(), observations: "" });
    setOpen(true);
  };

  const openEdit = (row: TrainingSchedule) => {
    setEditing(row);
    setForm({ employee_id: row.employee_id, cycle_days: row.cycle_days, last_training_date: row.last_training_date || "", observations: row.observations || "" });
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <section className="rounded-[1.5rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-white/40"><CalendarClock className="h-4 w-4" /> Controle de validade</div>
            <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Ciclos e Vencimentos</h1>
            <p className="mt-1 text-sm text-white/50">Acompanhe quem está em dia, entrando na janela de atenção ou vencido.</p>
          </div>
          {isAdmin && <Button onClick={openNew} className="w-full bg-[#C8102E] text-white hover:bg-[#A00D24] sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Novo ciclo</Button>}
        </div>
      </section>

      {schedules.isLoading ? <Loading /> : schedules.isError ? (
        <section className="rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
          <p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Não foi possível carregar os ciclos.</p>
          <Button variant="outline" className="mt-4" onClick={() => schedules.refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente</Button>
        </section>
      ) : <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Metric label="Em dia" value={counts.ok} color="#10b981" icon={CheckCircle2} />
          <Metric label="Próximos" value={counts.near} color="#f59e0b" icon={Clock3} />
          <Metric label="Vencidos" value={counts.expired} color="#ef4444" icon={AlertTriangle} />
        </div>

        <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-4)" }} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar colaborador ou matrícula..." className="pl-10" /></div>
            <Select value={filter} onValueChange={setFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Todos", "Em dia", "Próximo ao vencimento", "Vencido"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
          </div>
        </section>

        <div className="space-y-3">
          {filtered.map((row) => {
            const conf = statusStyle[row.status];
            const Icon = conf.icon;
            return (
              <article key={row.id} className="rounded-2xl p-4 md:p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: conf.bg, color: conf.color }}><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h2 className="break-words font-black" style={{ color: "var(--text-1)" }}>{row.employee_name}</h2><span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: conf.bg, color: conf.color }}>{row.status}</span></div>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--text-4)" }}>Mat. {row.employee_matricula} · ciclo de {row.cycle_days} dias</p>
                      <div className="mt-3 grid gap-1 text-xs sm:grid-cols-3" style={{ color: "var(--text-3)" }}><span>Último: <strong>{formatDate(row.last_training_date)}</strong></span><span>Atenção: <strong>{formatDate(row.window_start)}</strong></span><span>Vence: <strong style={{ color: conf.color }}>{formatDate(row.window_end)}</strong></span></div>
                      {row.observations && <p className="mt-2 break-words text-xs" style={{ color: "var(--text-4)" }}>{row.observations}</p>}
                    </div>
                  </div>
                  {isAdmin && <div className="flex w-full shrink-0 gap-2 sm:w-auto"><Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => openEdit(row)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Atualizar</Button><Button size="icon" variant="outline" className="shrink-0 text-red-500" onClick={() => { if (confirm("Excluir este ciclo?")) remove.mutate(row.id); }}><Trash2 className="h-4 w-4" /></Button></div>}
                </div>
              </article>
            );
          })}
        </div>

        {filtered.length === 0 && <section className="rounded-2xl p-12 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><CalendarClock className="mx-auto h-10 w-10 opacity-25" /><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Nenhum ciclo encontrado.</p></section>}
      </>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Atualizar ciclo" : "Novo ciclo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Colaborador *</Label><Select value={form.employee_id} onValueChange={(value) => setForm({ ...form, employee_id: value })} disabled={!!editing}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{(employees.data ?? []).filter((employee) => employee.status === "Ativo" && employee.access_profile !== "Inspetor").map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.full_name} · {employee.matricula}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Último treinamento *</Label><Input type="date" value={form.last_training_date} onChange={(event) => setForm({ ...form, last_training_date: event.target.value })} /></div><div className="space-y-1.5"><Label>Ciclo em dias</Label><Input type="number" min={1} value={form.cycle_days} onChange={(event) => setForm({ ...form, cycle_days: Number(event.target.value) })} /></div></div>
            <div className="space-y-1.5"><Label>Observações</Label><textarea value={form.observations} onChange={(event) => setForm({ ...form, observations: event.target.value })} className="min-h-24 w-full rounded-xl p-3 text-sm" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }} /></div>
            {form.last_training_date && (() => { const window = calculateTrainingWindow(form.last_training_date, form.cycle_days); return <div className="rounded-xl p-3 text-xs" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-3)" }}>Janela de atenção: <strong>{formatDate(window.window_start)}</strong> · vencimento: <strong>{formatDate(window.window_end)}</strong></div>; })()}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-[#C8102E] text-white hover:bg-[#A00D24]">{save.isPending ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: typeof CheckCircle2 }) {
  return <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}><div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: "var(--text-4)" }}>{label}</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{value}</p></div><div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}18`, color }}><Icon className="h-4 w-4" /></div></div></section>;
}

function Loading() {
  return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
}
