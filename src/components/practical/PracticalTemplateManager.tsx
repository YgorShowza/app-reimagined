import { useState } from "react";
import { ChevronDown, ChevronUp, Edit2, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createPracticalEvalTemplate,
  deletePracticalEvalTemplate,
  listPracticalEvalTemplates,
  updatePracticalEvalTemplate,
  type PracticalEvalTemplate,
  type PracticalEvalTemplateInput,
} from "@/lib/practical-templates";

export type PracticalTask = { id: string; category: string; title: string; description: string };

const EMPTY_FORM: PracticalEvalTemplateInput = {
  title: "",
  platform: null,
  description: null,
  target_sector: "CFTV",
  min_approval_score: 7,
  recurrence: "monthly",
  applications_per_month: 1,
  tasks: [],
  status: "Ativo",
};

const RECURRENCE_LABEL: Record<string, string> = {
  once: "Única vez",
  monthly: "Mensal",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
};

function normalizeTasks(raw: unknown[]): PracticalTask[] {
  return raw.map((task, index) => {
    if (typeof task === "string") {
      try {
        const parsed = JSON.parse(task);
        return { id: parsed.id || `task_${index}`, category: parsed.category || "", title: parsed.title || String(task), description: parsed.description || "" };
      } catch {
        return { id: `task_${index}`, category: "", title: task, description: "" };
      }
    }
    const value = (task ?? {}) as Record<string, unknown>;
    return { id: String(value.id || `task_${index}`), category: String(value.category || ""), title: String(value.title || ""), description: String(value.description || "") };
  }).filter((task) => task.title.trim());
}

export function PracticalTemplateManager({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PracticalEvalTemplate | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const query = useQuery({ queryKey: ["practical-eval-templates"], queryFn: listPracticalEvalTemplates, enabled: open });
  const rows = query.data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["practical-eval-templates"] });

  const toggleStatus = useMutation({
    mutationFn: (template: PracticalEvalTemplate) => updatePracticalEvalTemplate(template.id, { status: template.status === "Ativo" ? "Inativo" : "Ativo" }),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: deletePracticalEvalTemplate,
    onSuccess: () => { toast.success("Modelo excluído."); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (template: PracticalEvalTemplate) => { setEditing(template); setFormOpen(true); };

  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Modelos de Avaliação Prática</DialogTitle></DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>{rows.length} modelo(s) · {rows.filter((row) => row.status === "Ativo").length} ativo(s)</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Os modelos ativos alimentam a geração recorrente do Cronograma.</p></div>
          <Button onClick={openNew} className="bg-[#C8102E] text-white hover:bg-[#A00D24]"><Plus className="mr-2 h-4 w-4" /> Novo Modelo</Button>
        </div>
        <div className="mt-3 space-y-3">
          {query.isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#C8102E]" /></div> : rows.length === 0 ? <div className="rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}><p className="font-bold" style={{ color: "var(--text-1)" }}>Nenhum modelo cadastrado.</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Crie o primeiro modelo para habilitar avaliações recorrentes no Cronograma.</p></div> : rows.map((template) => {
            const tasks = normalizeTasks(template.tasks);
            const isExpanded = !!expanded[template.id];
            return <div key={template.id} className="overflow-hidden rounded-2xl" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
              <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black" style={{ color: "var(--text-1)" }}>{template.title}</p><button type="button" onClick={() => toggleStatus.mutate(template)} className="rounded-full px-2 py-1 text-[9px] font-black uppercase" style={{ background: template.status === "Ativo" ? "rgba(16,185,129,.1)" : "var(--bg-surface-3)", color: template.status === "Ativo" ? "#10b981" : "var(--text-4)" }}>{template.status}</button></div><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>{template.platform || "Sem plataforma"} · {template.target_sector} · {RECURRENCE_LABEL[template.recurrence]} · Nota mín. {template.min_approval_score}</p></div>
                <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setExpanded((current) => ({ ...current, [template.id]: !isExpanded }))}>{isExpanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />} {tasks.length} tarefas</Button><Button size="icon" variant="ghost" onClick={() => openEdit(template)}><Edit2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-red-500" onClick={() => { if (window.confirm(`Excluir o modelo “${template.title}”?`)) remove.mutate(template.id); }}><Trash2 className="h-4 w-4" /></Button></div>
              </div>
              {isExpanded && <div className="px-4 pb-4"><div className="rounded-xl p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>{template.description && <p className="mb-3 text-xs" style={{ color: "var(--text-3)" }}>{template.description}</p>}{tasks.length ? tasks.map((task, index) => <div key={task.id} className="flex gap-2 py-1.5 text-xs"><span className="font-black text-[#C8102E]">{index + 1}.</span>{task.category && <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: "rgba(200,16,46,.08)", color: "#C8102E" }}>{task.category}</span>}<span style={{ color: "var(--text-2)" }}>{task.title}</span></div>) : <p className="text-xs" style={{ color: "var(--text-4)" }}>Sem tarefas cadastradas.</p>}</div></div>}
            </div>;
          })}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <TemplateFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={() => { setFormOpen(false); setEditing(null); invalidate(); }} />
  </>;
}

function TemplateFormDialog({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; editing: PracticalEvalTemplate | null; onSaved: () => void }) {
  const [form, setForm] = useState<PracticalEvalTemplateInput>(EMPTY_FORM);
  const [taskCategory, setTaskCategory] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const tasks = normalizeTasks(form.tasks);

  const syncFromEditing = () => {
    if (editing) setForm({ title: editing.title, platform: editing.platform, description: editing.description, target_sector: editing.target_sector, min_approval_score: editing.min_approval_score, recurrence: editing.recurrence, applications_per_month: editing.applications_per_month, tasks: normalizeTasks(editing.tasks), status: editing.status });
    else setForm({ ...EMPTY_FORM, tasks: [] });
    setTaskCategory(""); setTaskTitle("");
  };

  const handleOpenChange = (next: boolean) => {
    if (next) syncFromEditing();
    onOpenChange(next);
  };

  const addTask = () => {
    if (!taskTitle.trim()) return;
    const next: PracticalTask = { id: `task_${Date.now()}`, category: taskCategory.trim(), title: taskTitle.trim(), description: "" };
    setForm((current) => ({ ...current, tasks: [...normalizeTasks(current.tasks), next] }));
    setTaskTitle(""); setTaskCategory("");
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Informe o título.");
    if (!normalizeTasks(form.tasks).length) return toast.error("Adicione ao menos uma tarefa.");
    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), platform: form.platform?.trim() || null, description: form.description?.trim() || null, tasks: normalizeTasks(form.tasks) };
      if (editing) await updatePracticalEvalTemplate(editing.id, payload);
      else await createPracticalEvalTemplate(payload);
      toast.success(editing ? "Modelo atualizado." : "Modelo criado.");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar o modelo.");
    } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={handleOpenChange}><DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Editar Modelo" : "Novo Modelo de Avaliação Prática"}</DialogTitle></DialogHeader><div className="space-y-4">
    <div className="grid gap-3 md:grid-cols-2"><div className="space-y-1.5 md:col-span-2"><Label>Título *</Label><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Avaliação Prática Hikvision" /></div><div className="space-y-1.5"><Label>Plataforma / Sistema</Label><Input value={form.platform || ""} onChange={(event) => setForm({ ...form, platform: event.target.value })} placeholder="Ex.: Hikvision, Intelbras, Ronda" /></div><div className="space-y-1.5"><Label>Setor</Label><Select value={form.target_sector} onValueChange={(value) => setForm({ ...form, target_sector: value as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Todos", "CFTV", "Vigilância"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Nota mínima (0–10)</Label><Input type="number" min={0} max={10} step={0.5} value={form.min_approval_score} onChange={(event) => setForm({ ...form, min_approval_score: Math.max(0, Math.min(10, Number(event.target.value) || 0)) })} /></div><div className="space-y-1.5"><Label>Recorrência</Label><Select value={form.recurrence} onValueChange={(value) => setForm({ ...form, recurrence: value as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="once">Única vez</SelectItem><SelectItem value="monthly">Mensal</SelectItem><SelectItem value="bimonthly">Bimestral</SelectItem><SelectItem value="quarterly">Trimestral</SelectItem></SelectContent></Select></div></div>
    <div className="space-y-1.5"><Label>Descrição / Instruções</Label><textarea className="min-h-20 w-full rounded-xl p-3 text-sm" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }} value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
    <div className="space-y-2"><div className="flex items-center justify-between"><Label>Procedimentos ({tasks.length})</Label>{tasks.length > 0 && <button type="button" className="text-xs font-bold text-red-500" onClick={() => setForm({ ...form, tasks: [] })}>Limpar tudo</button>}</div>{tasks.map((task, index) => <div key={task.id} className="flex items-center gap-2 rounded-xl p-2.5" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}><span className="text-xs font-black text-[#C8102E]">{index + 1}.</span>{task.category && <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: "rgba(200,16,46,.08)", color: "#C8102E" }}>{task.category}</span>}<span className="min-w-0 flex-1 text-sm" style={{ color: "var(--text-2)" }}>{task.title}</span><button type="button" className="text-red-500" onClick={() => setForm({ ...form, tasks: tasks.filter((_, taskIndex) => taskIndex !== index) })}><Trash2 className="h-4 w-4" /></button></div>)}<div className="grid gap-2 sm:grid-cols-[180px_1fr_auto]"><Input value={taskCategory} onChange={(event) => setTaskCategory(event.target.value)} placeholder="Grupo (opcional)" /><Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTask(); } }} placeholder="Procedimento a executar" /><Button type="button" variant="outline" onClick={addTask} disabled={!taskTitle.trim()}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button></div></div>
  </div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}><X className="mr-1 h-4 w-4" /> Cancelar</Button><Button onClick={save} disabled={saving} className="bg-[#C8102E] text-white hover:bg-[#A00D24]">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar Modelo</Button></DialogFooter></DialogContent></Dialog>;
}
