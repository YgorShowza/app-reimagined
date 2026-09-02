import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, CheckCircle2, CircleOff, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  createTrainingModule,
  deleteTrainingModule,
  listTrainingModules,
  updateTrainingModule,
  type TrainingModule,
  type TrainingModuleInput,
} from "@/lib/training-modules";

const TRAINING_SECTORS = ["Todos", "CFTV", "Vigilância", "Portaria", "Ronda", "Administrativo"] as const;

const EMPTY: TrainingModuleInput = {
  title: "",
  description: "",
  content: "",
  display_order: 1,
  min_score: 7,
  target_sector: "Todos",
  status: "Ativo",
};

export function TrainingModulesAdmin() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("Todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingModule | null>(null);
  const [form, setForm] = useState<TrainingModuleInput>(EMPTY);

  const query = useQuery({ queryKey: ["training-modules"], queryFn: listTrainingModules });
  const rows = query.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (sector !== "Todos" && row.target_sector !== sector) return false;
      return !q || [row.title, row.description, row.target_sector].some((value) => (value || "").toLowerCase().includes(q));
    });
  }, [rows, search, sector]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["training-modules"] });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Informe o título");
      if (!form.description.trim()) throw new Error("Informe a descrição");
      if (form.min_score < 0 || form.min_score > 10) throw new Error("A nota mínima deve ficar entre 0 e 10");
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        content: form.content?.trim() || null,
        display_order: Number(form.display_order) || 1,
        min_score: Number(form.min_score),
      };
      if (editing) await updateTrainingModule(editing.id, payload);
      else await createTrainingModule(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Módulo atualizado" : "Módulo criado");
      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteTrainingModule,
    onSuccess: () => { toast.success("Módulo excluído"); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "Ativo" | "Inativo" }) => updateTrainingModule(id, { status }),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  if (!user?.isAdmin) {
    return <div className="mx-auto max-w-3xl rounded-2xl p-10 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><p className="font-bold" style={{ color: "var(--text-1)" }}>Acesso exclusivo do Inspetor.</p></div>;
  }

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, display_order: rows.length + 1 });
    setOpen(true);
  };

  const openEdit = (row: TrainingModule) => {
    setEditing(row);
    setForm({ title: row.title, description: row.description, content: row.content, display_order: row.display_order, min_score: Number(row.min_score), target_sector: row.target_sector, status: row.status });
    setOpen(true);
  };

  return <div className="mx-auto max-w-7xl space-y-5 pb-10">
    <section className="rounded-[1.5rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-white/40"><BookOpen className="h-4 w-4" /> Trilha de capacitação</div><h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Módulos de Treinamento</h1><p className="mt-1 text-sm text-white/50">Organize conteúdos, sequência, público-alvo e nota mínima.</p></div><Button onClick={openNew} className="w-full bg-[#C8102E] text-white hover:bg-[#A00D24] sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Novo módulo</Button></div></section>

    {query.isLoading ? <Loading/> : query.isError ? <section className="rounded-2xl p-8 text-center" style={{background:"var(--bg-surface)",border:"1px solid var(--border)"}}><AlertTriangle className="mx-auto h-8 w-8 text-amber-500"/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>Não foi possível carregar os módulos.</p><Button variant="outline" className="mt-4" onClick={()=>query.refetch()}><RefreshCw className="mr-2 h-4 w-4"/> Tentar novamente</Button></section> : <>
      <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><div className="grid gap-3 md:grid-cols-[1fr_190px]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-4)" }} /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar módulo..." className="pl-10" /></div><Select value={sector} onValueChange={setSector}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TRAINING_SECTORS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div></section>

      <div className="space-y-3">{filtered.map((row) => <article key={row.id} className="overflow-hidden rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}><div className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between md:p-5"><div className="flex min-w-0 gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{row.display_order}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="break-words font-black" style={{ color: "var(--text-1)" }}>{row.title}</h2><span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: row.status === "Ativo" ? "rgba(16,185,129,.1)" : "var(--bg-surface-3)", color: row.status === "Ativo" ? "#10b981" : "var(--text-4)" }}>{row.status}</span></div><p className="mt-1 break-words text-sm" style={{ color: "var(--text-3)" }}>{row.description}</p><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold" style={{ color: "var(--text-4)" }}><span>{row.target_sector}</span><span>·</span><span>Nota mínima {Number(row.min_score).toLocaleString("pt-BR")}</span></div>{row.content && <div className="mt-3 max-h-24 overflow-hidden whitespace-pre-wrap break-words text-xs leading-relaxed" style={{ color: "var(--text-4)" }}>{row.content}</div>}</div></div><div className="flex w-full shrink-0 justify-end gap-1 sm:w-auto"><Button size="icon" variant="ghost" onClick={() => toggle.mutate({ id: row.id, status: row.status === "Ativo" ? "Inativo" : "Ativo" })} title={row.status === "Ativo" ? "Desativar" : "Ativar"}>{row.status === "Ativo" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <CircleOff className="h-4 w-4" />}</Button><Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-red-500" onClick={() => { if (confirm("Excluir este módulo?")) remove.mutate(row.id); }}><Trash2 className="h-4 w-4" /></Button></div></div></article>)}</div>
      {filtered.length === 0 && <section className="rounded-2xl p-12 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><BookOpen className="mx-auto h-10 w-10 opacity-25" /><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Nenhum módulo encontrado.</p></section>}
    </>}

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editing ? "Editar módulo" : "Novo módulo"}</DialogTitle></DialogHeader><div className="space-y-4"><div className="space-y-1.5"><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div><div className="space-y-1.5"><Label>Descrição *</Label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-20 w-full rounded-xl p-3 text-sm" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }} /></div><div className="space-y-1.5"><Label>Conteúdo</Label><textarea value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value || null })} className="min-h-48 w-full rounded-xl p-3 text-sm" placeholder="Conteúdo do módulo. Markdown simples é aceito como texto." style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }} /></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="space-y-1.5"><Label>Ordem</Label><Input type="number" min={1} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} /></div><div className="space-y-1.5"><Label>Nota mínima</Label><Input type="number" min={0} max={10} step="0.5" value={form.min_score} onChange={(e) => setForm({ ...form, min_score: Number(e.target.value) })} /></div><div className="space-y-1.5"><Label>Setor</Label><Select value={form.target_sector} onValueChange={(value) => setForm({ ...form, target_sector: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TRAINING_SECTORS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as "Ativo" | "Inativo" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent></Select></div></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-[#C8102E] text-white hover:bg-[#A00D24]">{save.isPending ? "Salvando..." : "Salvar"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Loading(){return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>}
