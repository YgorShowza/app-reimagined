import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, UserCheck, UserX, Trash2, Users, KeyRound, ShieldCheck, Radio, Eye, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { invalidateEmployeeFlow } from "@/lib/operational-query-sync";
import {
  PERFIS, SETORES, SITUACOES, createEmployee, deleteEmployee, emptyEmployeeForm,
  listEmployees, updateEmployee, type Employee, type EmployeeForm,
} from "@/lib/employees";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Gestão de Equipe · SEGEMPAT" },
      { name: "description", content: "Cadastre, edite e acompanhe os funcionários da equipe de segurança." },
      { property: "og:title", content: "Gestão de Equipe · SEGEMPAT" },
      { property: "og:description", content: "Cadastre, edite e acompanhe os funcionários da equipe de segurança." },
    ],
  }),
  component: EquipePage,
});

function MetricCard({ label, value, icon: Icon, accent, sub }: { label: string; value: number; icon: typeof Users; accent: string; sub: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
      <div className="absolute left-0 top-0 h-[3px] w-full" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: "var(--text-4)" }}>{label}</p>
          <p className="mt-2 text-3xl font-black" style={{ color: "var(--text-1)" }}>{value}</p>
          <p className="mt-1 text-[11px] font-semibold" style={{ color: accent }}>{sub}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${accent}12`, border: `1px solid ${accent}30` }}>
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
      </div>
    </div>
  );
}

function EquipePage() {
  const { data: user } = useCurrentUser();
  const isAdmin = !!user?.isAdmin;
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(emptyEmployeeForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: listEmployees,
  });

  const invalidate = () => invalidateEmployeeFlow(qc);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim() || !form.matricula.trim()) throw new Error("Preencha nome e matrícula");
      if (editingId) await updateEmployee(editingId, form);
      else await createEmployee({ ...form, matricula: form.matricula.trim() });
    },
    onSuccess: () => {
      toast.success(editingId ? "Funcionário atualizado" : "Funcionário cadastrado");
      setDialogOpen(false);
      setForm(emptyEmployeeForm);
      setEditingId(null);
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message.includes("duplicate") ? "Matrícula já cadastrada" : e.message),
  });

  const remove = useMutation({
    mutationFn: (emp: Employee) => deleteEmployee(emp.id),
    onSuccess: () => {
      toast.success("Funcionário excluído");
      setToDelete(null);
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter((e) => e.full_name.toLowerCase().includes(q) || e.matricula.includes(q) || e.sector.toLowerCase().includes(q));
  }, [employees, search]);

  const cadastrosAtivos = employees.filter((e) => e.status === "Ativo").length;
  const operacionaisAtivos = employees.filter((e) => e.status === "Ativo" && e.access_profile !== "Inspetor").length;
  const inativos = employees.length - cadastrosAtivos;
  const cftv = employees.filter((e) => e.status === "Ativo" && e.access_profile !== "Inspetor" && e.sector === "CFTV").length;
  const vigilancia = employees.filter((e) => e.status === "Ativo" && e.access_profile !== "Inspetor" && e.sector === "Vigilância").length;

  const openNew = () => {
    setForm(emptyEmployeeForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setForm({ full_name: emp.full_name, matricula: emp.matricula, sector: emp.sector, access_profile: emp.access_profile, status: emp.status });
    setEditingId(emp.id);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-[1.75rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171117 0%,#310912 55%,#160f14 100%)", border: "1px solid rgba(200,16,46,.28)", boxShadow: "0 12px 38px rgba(80,0,18,.16)" }}>
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle,rgba(200,16,46,.25),transparent 68%)" }} />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em]" style={{ color: "rgba(255,255,255,.44)" }}><UserRoundCog className="h-4 w-4" /> Gestão operacional</div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">Gestão de Equipe</h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,.52)" }}>{employees.length} cadastrados · {cadastrosAtivos} ativos · {inativos} inativos</p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="border-white/15 bg-white/5 font-bold text-white hover:bg-white/10 hover:text-white">
                <Link to="/acessos"><KeyRound className="mr-2 h-4 w-4" />Acessos</Link>
              </Button>
              <Button onClick={openNew} className="bg-[#e0142f] font-bold text-white shadow-lg shadow-red-950/20 hover:bg-[#C8102E]"><Plus className="mr-2 h-4 w-4" />Novo Funcionário</Button>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Equipe ativa" value={operacionaisAtivos} icon={ShieldCheck} accent="#10b981" sub="operacionais ativos" />
        <MetricCard label="CFTV" value={cftv} icon={Eye} accent="#3b82f6" sub="operacionais ativos" />
        <MetricCard label="Vigilância" value={vigilancia} icon={Radio} accent="#f59e0b" sub="operacionais ativos" />
        <MetricCard label="Inativos" value={inativos} icon={UserX} accent="#e11d48" sub="cadastros preservados" />
      </div>

      <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black" style={{ color: "var(--text-1)" }}>Funcionários</p>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-4)" }}>{filtered.length} registro{filtered.length === 1 ? "" : "s"} exibido{filtered.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-4)" }} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, matrícula ou setor..." className="pl-10" />
        </div>
      </section>

      {isLoading ? (
        <div className="flex justify-center p-10"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-8 text-center sm:p-10" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "#C8102E1a" }}><Users className="h-6 w-6" style={{ color: "#C8102E" }} /></div>
          <p className="font-bold" style={{ color: "var(--text-1)" }}>{search ? "Nenhum funcionário encontrado" : "Nenhum funcionário cadastrado"}</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>{search ? "Tente outro nome, matrícula ou setor." : isAdmin ? "Toque em “Novo Funcionário” para começar." : "Aguarde o cadastro pelo inspetor."}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((emp) => {
            const active = emp.status === "Ativo";
            const accent = emp.access_profile === "Inspetor" ? "#e11d48" : emp.sector === "CFTV" ? "#3b82f6" : "#f59e0b";
            return (
              <div key={emp.id} className="relative flex flex-col gap-3 overflow-hidden rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
                <div className="absolute bottom-0 left-0 top-0 w-[3px]" style={{ background: active ? accent : "var(--text-4)" }} />
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white" style={{ background: active ? accent : "#64748b", boxShadow: `0 8px 18px ${accent}22` }}>{emp.full_name.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black" style={{ color: "var(--text-1)" }}>{emp.full_name}</p>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: active ? "#10b981" : "#64748b" }} />
                    </div>
                    <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-4)" }}>Mat. {emp.matricula} · {emp.sector}</p>
                  </div>
                </div>
                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant="outline" className="max-w-[130px] truncate text-xs font-bold" style={{ color: accent, borderColor: `${accent}40`, background: `${accent}12` }}>{emp.access_profile}</Badge>
                    <span className="hidden text-[10px] font-bold sm:inline" style={{ color: active ? "#10b981" : "var(--text-4)" }}>{active ? "ATIVO" : "INATIVO"}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(emp)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Excluir" className="text-red-500 hover:text-red-600" onClick={() => setToDelete(emp)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle style={{ fontFamily: "var(--font-heading)" }}>{editingId ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="full_name">Nome completo</Label><Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nome do funcionário" /></div>
            <div className="space-y-1.5"><Label htmlFor="matricula">Matrícula</Label><Input id="matricula" value={form.matricula} inputMode="numeric" onChange={(e) => setForm({ ...form, matricula: e.target.value.replace(/\D/g, "") })} placeholder="Ex.: 970" /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Setor</Label><Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SETORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Perfil de acesso</Label><Select value={form.access_profile} onValueChange={(v) => setForm({ ...form, access_profile: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PERFIS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label>Situação</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SITUACOES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-[#C8102E] font-bold text-white hover:bg-[#A00D24]">{save.isPending ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir funcionário?</AlertDialogTitle><AlertDialogDescription>{toDelete ? `“${toDelete.full_name}” só poderá ser excluído se não possuir conta ou histórico operacional. Havendo histórico, o SEGEMPAT bloqueará a exclusão e o cadastro deverá ser inativado.` : ""}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-[#C8102E] hover:bg-[#A00D24]" onClick={() => toDelete && remove.mutate(toDelete)}>Excluir se não houver histórico</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}