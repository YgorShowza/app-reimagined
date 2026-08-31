import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock, Plus, Search, Trash2, AlertTriangle, CheckCircle2,
  Clock3, RefreshCw, TimerReset,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listEmployees } from "@/lib/employees";
import {
  deleteTrainingSchedule,
  listTrainingSchedules,
  refreshTrainingScheduleStatuses,
  upsertTrainingSchedule,
} from "@/lib/training";

export const Route = createFileRoute("/_authenticated/ciclos-treinamento")({
  head: () => ({ meta: [{ title: "Ciclos de Treinamento · SEGEMPAT" }] }),
  component: Page,
});

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}
    >
      {children}
    </div>
  );
}

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function Page() {
  const qc = useQueryClient();
  const schedules = useQuery({ queryKey: ["training-schedules"], queryFn: listTrainingSchedules });
  const employees = useQuery({ queryKey: ["employees"], queryFn: listEmployees });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: "", cycle_days: 90, last_training_date: "", observations: "" });

  const rows = schedules.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "Todos" && row.status !== statusFilter) return false;
      if (!q) return true;
      return [row.employee_name, row.employee_matricula ?? ""]
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter]);

  const counts = {
    total: rows.length,
    ok: rows.filter((row) => row.status === "Em dia").length,
    near: rows.filter((row) => row.status === "Próximo ao vencimento").length,
    late: rows.filter((row) => row.status === "Vencido").length,
  };

  const save = useMutation({
    mutationFn: async () => {
      const employee = (employees.data ?? []).find((item) => item.id === form.employee_id);
      if (!employee) throw new Error("Selecione o colaborador");
      await upsertTrainingSchedule({
        employee_id: employee.id,
        employee_name: employee.full_name,
        employee_matricula: employee.matricula,
        cycle_days: Number(form.cycle_days),
        last_training_date: form.last_training_date || null,
        observations: form.observations || null,
      });
    },
    onSuccess: () => {
      toast.success("Ciclo salvo");
      setOpen(false);
      setForm({ employee_id: "", cycle_days: 90, last_training_date: "", observations: "" });
      qc.invalidateQueries({ queryKey: ["training-schedules"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteTrainingSchedule,
    onSuccess: () => {
      toast.success("Ciclo removido");
      qc.invalidateQueries({ queryKey: ["training-schedules"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const refresh = useMutation({
    mutationFn: refreshTrainingScheduleStatuses,
    onSuccess: (count) => {
      toast.success(count ? `${count} ciclo(s) recalculado(s).` : "Não há ciclos para atualizar.");
      qc.invalidateQueries({ queryKey: ["training-schedules"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (schedules.isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <div
        className="rounded-[1.5rem] p-5 md:p-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4"
        style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}
      >
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40">
            <CalendarClock className="w-4 h-4" /> Validade e reciclagem
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-black text-white">Ciclos de Treinamento</h1>
          <p className="mt-1 text-sm text-white/50">Acompanhe janelas de renovação e vencimentos por colaborador.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refresh.isPending ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
          <Button className="bg-[#C8102E] hover:bg-[#A00D24] text-white" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Configurar ciclo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Monitorados", counts.total, TimerReset, "var(--accent)"],
          ["Em dia", counts.ok, CheckCircle2, "#10b981"],
          ["Próximos", counts.near, Clock3, "#f59e0b"],
          ["Vencidos", counts.late, AlertTriangle, "#ef4444"],
        ].map(([label, value, Icon, color]: any) => (
          <Card key={label} className="p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>{label}</p>
                <p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{value}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-surface-2)" }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-4)" }} />
            <Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar colaborador ou matrícula..." />
          </div>
          <select
            className="h-10 rounded-xl px-3 text-sm"
            style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {[
              "Todos",
              "Em dia",
              "Próximo ao vencimento",
              "Vencido",
            ].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
      </Card>

      <div className="space-y-3">
        {filtered.map((row) => {
          const color = row.status === "Em dia" ? "#10b981" : row.status === "Próximo ao vencimento" ? "#f59e0b" : "#ef4444";
          const remaining = daysUntil(row.window_end);
          const deadlineLabel = remaining == null
            ? "Sem referência de vencimento"
            : remaining < 0
              ? `${Math.abs(remaining)} dia(s) vencido`
              : remaining === 0
                ? "Vence hoje"
                : `${remaining} dia(s) para vencer`;

          return (
            <Card key={row.id} className="overflow-hidden">
              <div className="h-[3px]" style={{ background: color }} />
              <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 items-center">
                    <p className="font-bold" style={{ color: "var(--text-1)" }}>{row.employee_name}</p>
                    <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ color, background: `${color}12`, border: `1px solid ${color}30` }}>{row.status}</span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Mat. {row.employee_matricula || "—"} · ciclo {row.cycle_days} dias</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-3)" }}>
                    <span>Último: <strong>{fmt(row.last_training_date)}</strong></span>
                    <span>Janela: <strong>{fmt(row.window_start)} → {fmt(row.window_end)}</strong></span>
                    <span style={{ color }}><strong>{deadlineLabel}</strong></span>
                  </div>
                  {row.observations && <p className="mt-2 text-xs" style={{ color: "var(--text-4)" }}>{row.observations}</p>}
                </div>
                <Button size="icon" variant="outline" className="text-red-500 shrink-0" onClick={() => remove.mutate(row.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}

        {!filtered.length && (
          <Card className="p-10 text-center">
            <CalendarClock className="w-10 h-10 mx-auto opacity-30" style={{ color: "var(--text-4)" }} />
            <p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Nenhum ciclo encontrado.</p>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configurar ciclo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Colaborador *</Label>
              <select
                className="w-full h-10 rounded-xl px-3 text-sm"
                style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                value={form.employee_id}
                onChange={(event) => setForm({ ...form, employee_id: event.target.value })}
              >
                <option value="">Selecione...</option>
                {(employees.data ?? [])
                  .filter((employee) => employee.status === "Ativo" && employee.access_profile !== "Inspetor")
                  .map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} · {employee.matricula}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ciclo (dias)</Label>
                <Input type="number" min={1} value={form.cycle_days} onChange={(event) => setForm({ ...form, cycle_days: Number(event.target.value) })} />
              </div>
              <div>
                <Label>Último treinamento</Label>
                <Input type="date" value={form.last_training_date} onChange={(event) => setForm({ ...form, last_training_date: event.target.value })} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={form.observations} onChange={(event) => setForm({ ...form, observations: event.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="bg-[#C8102E] hover:bg-[#A00D24] text-white" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
