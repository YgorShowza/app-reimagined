import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, UserCheck, UserX, Trash2, Users, KeyRound } from "lucide-react";
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

  const invalidate = () => qc.invalidateQueries({ queryKey: ["employees"] });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim() || !form.matricula.trim()) {
        throw new Error("Preencha nome e matrícula");
      }
      if (editingId) await updateEmployee(editingId, form);
      else await createEmployee({ ...form, matricula: form.matricula.trim() });
    },
    onSuccess: () => {
      toast.success(editingId ? "Funcionário atualizado" : "Funcionário cadastrado");
      setDialogOpen(false);
      setForm(emptyEmployeeForm);
      setEditingId(null);
      invalidate();
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("duplicate") ? "Matrícula já cadastrada" : e.message),
  });

  const remove = useMutation({
    mutationFn: (emp: Employee) => deleteEmployee(emp.id),
    onSuccess: () => {
      toast.success("Funcionário excluído");
      setToDelete(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(
      (e) => e.full_name.toLowerCase().includes(q) || e.matricula.includes(q),
    );
  }, [employees, search]);

  const ativos = employees.filter((e) => e.status === "Ativo").length;

  const openNew = () => {
    setForm(emptyEmployeeForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setForm({
      full_name: emp.full_name,
      matricula: emp.matricula,
      sector: emp.sector,
      access_profile: emp.access_profile,
      status: emp.status,
    });
    setEditingId(emp.id);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ color: "var(--text-1)", fontFamily: "var(--font-heading)" }}
          >
            Gestão de Equipe
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
            {employees.length} funcionários cadastrados · {ativos} ativos
          </p>
        </div>
        {isAdmin && (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button asChild variant="outline" className="font-bold">
              <Link to="/acessos">
                <KeyRound className="mr-2 h-4 w-4" />
                Acessos
              </Link>
            </Button>
            <Button onClick={openNew} className="bg-[#C8102E] font-bold text-white hover:bg-[#A00D24]">
              <Plus className="mr-2 h-4 w-4" />
              Novo Funcionário
            </Button>
          </div>
        )}
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: "var(--text-4)" }}
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou matrícula..."
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4"
            style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center sm:p-10"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card, var(--shadow-md))",
          }}
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "#C8102E1a" }}
          >
            <Users className="h-6 w-6" style={{ color: "#C8102E" }} />
          </div>
          <p className="font-bold" style={{ color: "var(--text-1)" }}>
            {search ? "Nenhum funcionário encontrado" : "Nenhum funcionário cadastrado"}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
            {search
              ? "Tente outro nome ou matrícula."
              : isAdmin
                ? "Toque em “Novo Funcionário” para começar."
                : "Aguarde o cadastro pelo inspetor."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className="flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-card, var(--shadow-md))",
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C8102E] text-sm font-black text-white">
                  {emp.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold" style={{ color: "var(--text-1)" }}>
                    {emp.full_name}
                  </p>
                  <p className="truncate text-xs" style={{ color: "var(--text-4)" }}>
                    Mat. {emp.matricula} · {emp.sector}
                  </p>
                </div>
              </div>
              <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge
                    variant="outline"
                    className="max-w-[130px] truncate text-xs font-bold"
                    style={
                      emp.access_profile === "Inspetor"
                        ? { color: "#C8102E", borderColor: "#C8102E40", background: "#C8102E12" }
                        : { color: "#2563eb", borderColor: "#2563eb40", background: "#2563eb12" }
                    }
                  >
                    {emp.access_profile}
                  </Badge>
                  {emp.status === "Ativo" ? (
                    <UserCheck className="h-4 w-4 shrink-0 text-green-500" aria-label="Ativo" />
                  ) : (
                    <UserX className="h-4 w-4 shrink-0" style={{ color: "var(--text-4)" }} aria-label="Inativo" />
                  )}
                </div>
                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(emp)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setToDelete(emp)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>
              {editingId ? "Editar Funcionário" : "Novo Funcionário"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Nome do funcionário"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="matricula">Matrícula</Label>
              <Input
                id="matricula"
                value={form.matricula}
                inputMode="numeric"
                onChange={(e) => setForm({ ...form, matricula: e.target.value.replace(/\D/g, "") })}
                placeholder="Ex.: 970"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Setor</Label>
                <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SETORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Perfil de acesso</Label>
                <Select
                  value={form.access_profile}
                  onValueChange={(v) => setForm({ ...form, access_profile: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERFIS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Situação</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SITUACOES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="bg-[#C8102E] font-bold text-white hover:bg-[#A00D24]"
            >
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? `“${toDelete.full_name}” será removido permanentemente da equipe. Esta ação não pode ser desfeita.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#C8102E] hover:bg-[#A00D24]"
              onClick={() => toDelete && remove.mutate(toDelete)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
