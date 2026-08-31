import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Pencil, Trash2, Eye, EyeOff, Search, FileQuestion } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createTrainingModule,
  deleteTrainingModule,
  listTrainingModules,
  updateTrainingModule,
  type TrainingModule,
} from "@/lib/training";

export const Route = createFileRoute("/_authenticated/modulos-treinamento")({
  head: () => ({ meta: [{ title: "Módulos de Treinamento · SEGEMPAT" }] }),
  component: Page,
});

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
      {children}
    </div>
  );
}

const blank = {
  title: "",
  description: "",
  content: "",
  display_order: 1,
  min_score: 7,
  target_sector: "Todos",
  status: "Ativo",
};

function Page() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["training-modules"], queryFn: listTrainingModules });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingModule | null>(null);
  const [form, setForm] = useState<any>(blank);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("Todos");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((module) => {
      if (sectorFilter !== "Todos" && module.target_sector !== "Todos" && module.target_sector !== sectorFilter) return false;
      if (!q) return true;
      return [module.title, module.description, module.target_sector]
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [data, search, sectorFilter]);

  const counts = {
    total: data.length,
    active: data.filter((module) => module.status === "Ativo").length,
    sectors: new Set(data.map((module) => module.target_sector)).size,
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.description.trim()) throw new Error("Informe título e descrição");
      if (editing) await updateTrainingModule(editing.id, form);
      else await createTrainingModule(form);
    },
    onSuccess: () => {
      toast.success(editing ? "Módulo atualizado" : "Módulo criado");
      setOpen(false);
      setEditing(null);
      setForm(blank);
      qc.invalidateQueries({ queryKey: ["training-modules"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteTrainingModule,
    onSuccess: () => {
      toast.success("Módulo excluído");
      qc.invalidateQueries({ queryKey: ["training-modules"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <div className="rounded-[1.5rem] p-5 md:p-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40"><BookOpen className="w-4 h-4" /> Formação estruturada</div>
          <h1 className="mt-2 text-2xl md:text-3xl font-black text-white">Módulos de Treinamento</h1>
          <p className="mt-1 text-sm text-white/50">Organize conteúdos por setor e transforme módulos em provas rapidamente.</p>
        </div>
        <Button className="bg-[#C8102E] hover:bg-[#A00D24] text-white" onClick={() => { setEditing(null); setForm(blank); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo módulo
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Módulos", counts.total],
          ["Ativos", counts.active],
          ["Setores", counts.sectors],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>{label}</p>
            <p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-4)" }} />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar módulo, descrição ou setor..." className="pl-10" />
          </div>
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Todos", "Vigilância", "CFTV", "Portaria", "Ronda", "Administrativo"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((module) => (
          <Card key={module.id} className="p-5">
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-black" style={{ color: "var(--accent)" }}>#{module.display_order}</span>
                  <p className="font-bold" style={{ color: "var(--text-1)" }}>{module.title}</p>
                  <span className="text-[10px] font-black" style={{ color: module.status === "Ativo" ? "#10b981" : "var(--text-4)" }}>{module.status}</span>
                </div>
                <p className="mt-2 text-sm" style={{ color: "var(--text-3)" }}>{module.description}</p>
                <p className="mt-3 text-xs" style={{ color: "var(--text-4)" }}>{module.target_sector} · Nota mínima {module.min_score}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => updateTrainingModule(module.id, { status: module.status === "Ativo" ? "Inativo" : "Ativo" }).then(() => qc.invalidateQueries({ queryKey: ["training-modules"] }))}
                >
                  {module.status === "Ativo" ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(module); setForm({ ...module }); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="text-red-500" onClick={() => remove.mutate(module.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>

            {module.content && <p className="mt-4 text-sm whitespace-pre-wrap line-clamp-5" style={{ color: "var(--text-2)" }}>{module.content}</p>}

            <div className="mt-4 pt-4 flex justify-end" style={{ borderTop: "1px solid var(--border)" }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: "/provas-criar", search: { module: module.id } as any })}
              >
                <FileQuestion className="w-3.5 h-3.5 mr-1.5" /> Criar prova deste módulo
              </Button>
            </div>
          </Card>
        ))}

        {!filtered.length && (
          <Card className="p-10 text-center md:col-span-2">
            <BookOpen className="w-10 h-10 mx-auto opacity-30" style={{ color: "var(--text-4)" }} />
            <p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Nenhum módulo encontrado.</p>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar módulo" : "Novo módulo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título *</Label><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
            <div><Label>Descrição *</Label><Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
            <div className="grid md:grid-cols-3 gap-3">
              <div><Label>Ordem</Label><Input type="number" min={1} value={form.display_order} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} /></div>
              <div><Label>Nota mínima</Label><Input type="number" min={0} max={10} step={0.5} value={form.min_score} onChange={(event) => setForm({ ...form, min_score: Number(event.target.value) })} /></div>
              <div>
                <Label>Setor</Label>
                <Select value={form.target_sector} onValueChange={(value) => setForm({ ...form, target_sector: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Todos", "Vigilância", "CFTV", "Portaria", "Ronda", "Administrativo"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Conteúdo</Label>
              <textarea
                className="w-full min-h-60 rounded-xl p-3 text-sm"
                style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                value={form.content || ""}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
              />
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
