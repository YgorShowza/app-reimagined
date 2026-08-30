import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, UserCheck, UserX, Trash2, Users } from "lucide-react";
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ color: "var(--text-1)", fontFamily: "var(--font-heading)" }}
          >
            Gestão de Equipe
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            {employees.length} funcionários cadastrados · {ativos} ativos
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openNew} className="bg-[#C8102E] hover:bg-[#A00D24] text-white font-bold">
            <Plus className="w-4 h-4 mr-2" />
            Novo Funcionário
          </Button>
        )}
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
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
          <div className="w-8 h-8 border-4 rounded-full animate-spin"
            style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card, var(--shadow-md))",
          }}
        >
          <div
            className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "#C8102E1a" }}
          >
            <Users className="w-6 h-6" style={{ color: "#C8102E" }} />
          </div>
          <p className="font-bold" style={{ color: "var(--text-1)" }}>
            {search ? "Nenhum funcionário encontrado" : "Nenhum funcionário cadastrado"}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            {search
              ? "Tente outro nome ou matrícula."
              : isAdmin
                ? "Toque em “Novo Funcionário” para começar."
                : "Aguarde o cadastro pelo inspetor."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((emp, i) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.04, duration: 0.35, ease: "easeOut" }}
              className="rounded-2xl p-4 flex items-center justify-between gap-3"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-card, var(--shadow-md))",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#C8102E] flex items-center justify-center text-white font-black text-sm shrink-0">
                  {emp.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: "var(--text-1)" }}>
                    {emp.full_name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-4)" }}>
                    Mat. {emp.matricula} · {emp.sector}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className="text-xs font-bold"
                  style={
                    emp.access_profile === "Inspetor"
                      ? { color: "#C8102E", borderColor: "#C8102E40", background: "#C8102E12" }
                      : { color: "#2563eb", borderColor: "#2563eb40", background: "#2563eb12" }
                  }
                >
                  {emp.access_profile}
                </Badge>
                {emp.status === "Ativo" ? (
                  <UserCheck className="w-4 h-4 text-green-500" aria-label="Ativo" />
                ) : (
                  <UserX className="w-4 h-4" style={{ color: "var(--text-4)" }} aria-label="Inativo" />
                )}
                {isAdmin && (
                  <>
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(emp)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setToDelete(emp)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
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
            <div className="grid grid-cols-2 gap-3">
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
              className="bg-[#C8102E] hover:bg-[#A00D24] text-white font-bold"
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
