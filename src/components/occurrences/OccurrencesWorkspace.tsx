import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  FileImage,
  LockKeyhole,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { listEmployees, type Employee } from "@/lib/employees";
import { getCurrentEmployeeByAuth } from "@/lib/insights";
import {
  addOccurrenceAttachment,
  addOccurrenceUpdate,
  createOccurrence,
  deleteOccurrence,
  getOccurrenceDetails,
  listOccurrences,
  occurrenceAttachmentUrl,
  updateOccurrence,
  type Occurrence,
  type OccurrencePerson,
} from "@/lib/occurrences";

function Surface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>{children}</div>;
}

const severityColor: Record<string, string> = { Baixa: "#60a5fa", Média: "#f59e0b", Alta: "#f97316", Crítica: "#ef4444" };
const MACEIO_TIME_ZONE = "America/Maceio";
const MAX_EVIDENCE_BYTES = 1_250_000;
const CATEGORIES = [
  "Operacional",
  "Comportamento Inseguro",
  "Condição Insegura",
  "Quase Acidente",
  "Acidente Sem Afastamento",
  "Acidente Com Afastamento",
];

function maceioDateTimeLocal(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: MACEIO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function maceioLocalToIso(value: string) {
  if (!value) return new Date().toISOString();
  const normalized = value.length === 16 ? `${value}:00` : value;
  return new Date(`${normalized}-03:00`).toISOString();
}

function displayDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", { timeZone: MACEIO_TIME_ZONE });
}

interface PendingEvidence {
  id: string;
  name: string;
  data_url: string;
  size: number;
  caption: string;
}

interface OccurrenceForm {
  employee_id: string;
  title: string;
  category: string;
  severity: Occurrence["severity"];
  description: string;
  current_situation: string;
  immediate_risk: string;
  information_source: string;
  actions_taken: string;
  support_required: string;
  people_involved: OccurrencePerson[];
  location: string;
  occurred_at: string;
  status: Occurrence["status"];
  resolution_notes: string;
}

function emptyForm(): OccurrenceForm {
  return {
    employee_id: "",
    title: "",
    category: "Operacional",
    severity: "Baixa",
    description: "",
    current_situation: "",
    immediate_risk: "",
    information_source: "",
    actions_taken: "",
    support_required: "",
    people_involved: [],
    location: "",
    occurred_at: maceioDateTimeLocal(),
    status: "Aberta",
    resolution_notes: "",
  };
}

function fileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Não foi possível ler ${file.name}`));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

export function OccurrencesWorkspace({ operatorTitle = false }: { operatorTitle?: boolean }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.isAdmin ?? false;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Occurrence | null>(null);
  const [form, setForm] = useState<OccurrenceForm>(emptyForm);
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence[]>([]);
  const [personEmployeeId, setPersonEmployeeId] = useState("");
  const [personName, setPersonName] = useState("");
  const [personRole, setPersonRole] = useState("Envolvido");
  const [personNotes, setPersonNotes] = useState("");
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [updateNote, setUpdateNote] = useState("");

  const occurrences = useQuery({ queryKey: ["occurrences"], queryFn: listOccurrences });
  const employees = useQuery({ queryKey: ["employees"], queryFn: listEmployees, enabled: isAdmin });
  const currentEmployee = useQuery({ queryKey: ["current-employee"], queryFn: getCurrentEmployeeByAuth, enabled: !isAdmin });
  const details = useQuery({
    queryKey: ["occurrence-details", detailsId],
    queryFn: () => getOccurrenceDetails(detailsId as string),
    enabled: Boolean(detailsId),
  });

  const rows = occurrences.data ?? [];
  const filtered = useMemo(() => rows.filter((occurrence) => {
    if (status !== "Todos" && occurrence.status !== status) return false;
    const q = search.toLowerCase().trim();
    return !q || [occurrence.title, occurrence.category, occurrence.description, occurrence.location, occurrence.employee_name, occurrence.current_situation, occurrence.information_source]
      .some((value) => (value || "").toLowerCase().includes(q));
  }), [rows, search, status]);

  const invalidate = async (id?: string) => {
    await qc.invalidateQueries({ queryKey: ["occurrences"] });
    if (id) await qc.invalidateQueries({ queryKey: ["occurrence-details", id] });
  };

  const reset = () => {
    setForm(emptyForm());
    setPendingEvidence([]);
    setPersonEmployeeId("");
    setPersonName("");
    setPersonRole("Envolvido");
    setPersonNotes("");
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Informe a natureza/título da ocorrência");
      if (!form.description.trim()) throw new Error("Descreva o que ocorreu");
      if (!form.location.trim()) throw new Error("Informe o local exato da ocorrência");
      if (!form.current_situation.trim()) throw new Error("Informe a situação atual");
      if (editing && form.status === "Concluída" && !form.resolution_notes.trim()) {
        throw new Error("Informe as notas de conclusão antes de concluir a ocorrência");
      }

      const employee = isAdmin
        ? (employees.data ?? []).find((item) => item.id === form.employee_id)
        : currentEmployee.data;
      if (!isAdmin && !employee) {
        throw new Error("Não foi possível vincular sua matrícula ao cadastro operacional. Atualize a página ou informe a Inspetoria.");
      }

      const payload = {
        employee_id: isAdmin ? form.employee_id || null : employee?.id || null,
        employee_name: employee?.full_name || user?.nome || null,
        employee_matricula: employee?.matricula || user?.matricula || null,
        title: form.title.trim(),
        category: form.category,
        severity: form.severity,
        description: form.description.trim(),
        current_situation: form.current_situation.trim(),
        immediate_risk: form.immediate_risk.trim() || null,
        information_source: form.information_source.trim() || null,
        actions_taken: form.actions_taken.trim() || null,
        support_required: form.support_required.trim() || null,
        people_involved: form.people_involved,
        location: form.location.trim(),
        occurred_at: maceioLocalToIso(form.occurred_at),
      };

      let targetId = editing?.id;
      if (editing && isAdmin) {
        await updateOccurrence(editing.id, {
          ...payload,
          status: form.status,
          resolution_notes: form.resolution_notes.trim() || null,
        });
      } else {
        const created = await createOccurrence(payload);
        targetId = created.id;
      }

      if (!targetId) throw new Error("Não foi possível identificar a ocorrência registrada");
      const uploadFailures: string[] = [];
      for (const evidence of pendingEvidence) {
        try {
          await addOccurrenceAttachment(targetId, {
            data_url: evidence.data_url,
            original_name: evidence.name,
            caption: evidence.caption.trim() || null,
          });
        } catch (error) {
          uploadFailures.push(error instanceof Error ? error.message : evidence.name);
        }
      }
      return { targetId, uploadFailures };
    },
    onSuccess: async ({ targetId, uploadFailures }) => {
      if (uploadFailures.length) {
        toast.warning(`Ocorrência salva, mas ${uploadFailures.length} evidência(s) não foram anexadas.`);
      } else {
        toast.success(editing ? "Ocorrência atualizada" : "Ocorrência registrada");
      }
      setOpen(false);
      setEditing(null);
      reset();
      await invalidate(targetId);
      setDetailsId(targetId);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteOccurrence,
    onSuccess: async () => {
      toast.success("Ocorrência excluída");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addUpdate = useMutation({
    mutationFn: async () => {
      if (!detailsId || !updateNote.trim()) throw new Error("Escreva a atualização da ocorrência");
      await addOccurrenceUpdate(detailsId, updateNote.trim());
      return detailsId;
    },
    onSuccess: async (id) => {
      setUpdateNote("");
      toast.success("Atualização registrada no histórico");
      await invalidate(id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openNew = () => {
    setEditing(null);
    reset();
    setOpen(true);
  };

  const openEdit = (occurrence: Occurrence) => {
    if (occurrence.status === "Concluída") {
      toast.error("Ocorrência concluída pertence ao histórico e não pode ser alterada");
      return;
    }
    const occurredAt = new Date(occurrence.occurred_at);
    setEditing(occurrence);
    setPendingEvidence([]);
    setForm({
      employee_id: occurrence.employee_id || "",
      title: occurrence.title,
      category: occurrence.category,
      severity: occurrence.severity,
      description: occurrence.description,
      current_situation: occurrence.current_situation || "",
      immediate_risk: occurrence.immediate_risk || "",
      information_source: occurrence.information_source || "",
      actions_taken: occurrence.actions_taken || "",
      support_required: occurrence.support_required || "",
      people_involved: occurrence.people_involved || [],
      location: occurrence.location || "",
      occurred_at: Number.isNaN(occurredAt.getTime()) ? "" : maceioDateTimeLocal(occurredAt),
      status: occurrence.status,
      resolution_notes: occurrence.resolution_notes || "",
    });
    setOpen(true);
  };

  const addPerson = () => {
    let employee: Employee | undefined;
    if (isAdmin && personEmployeeId) employee = (employees.data ?? []).find((item) => item.id === personEmployeeId);
    const name = employee?.full_name || personName.trim();
    if (!name) {
      toast.error("Informe ou selecione a pessoa envolvida");
      return;
    }
    const person: OccurrencePerson = {
      employee_id: employee?.id || null,
      name,
      matricula: employee?.matricula || null,
      role: personRole.trim() || "Envolvido",
      notes: personNotes.trim() || null,
    };
    setForm((current) => ({ ...current, people_involved: [...current.people_involved, person] }));
    setPersonEmployeeId("");
    setPersonName("");
    setPersonRole("Envolvido");
    setPersonNotes("");
  };

  const onEvidenceFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const existing = editing?.attachment_count ?? 0;
    const available = Math.max(0, 5 - existing - pendingEvidence.length);
    if (available === 0) {
      toast.error("Limite de 5 evidências por ocorrência atingido");
      return;
    }
    const selected = Array.from(files).slice(0, available);
    const accepted: PendingEvidence[] = [];
    for (const file of selected) {
      if (!["image/png", "image/jpeg"].includes(file.type)) {
        toast.error(`${file.name}: use imagem PNG ou JPEG`);
        continue;
      }
      if (file.size > MAX_EVIDENCE_BYTES) {
        toast.error(`${file.name}: máximo de 1,25 MB por evidência`);
        continue;
      }
      const dataUrl = await fileAsDataUrl(file);
      accepted.push({ id: crypto.randomUUID(), name: file.name, data_url: dataUrl, size: file.size, caption: "" });
    }
    setPendingEvidence((current) => [...current, ...accepted]);
  };

  const counts = {
    open: rows.filter((row) => row.status === "Aberta").length,
    analysis: rows.filter((row) => row.status === "Em análise").length,
    done: rows.filter((row) => row.status === "Concluída").length,
  };
  const operatorIdentityUnavailable = !isAdmin && !currentEmployee.isLoading && !currentEmployee.data;

  if (occurrences.isLoading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  if (occurrences.isError) return <div className="mx-auto max-w-2xl rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><p className="font-bold text-red-500">Não foi possível carregar as ocorrências.</p><Button variant="outline" className="mt-4" onClick={() => occurrences.refetch()}>Tentar novamente</Button></div>;

  return <div className="mx-auto max-w-6xl space-y-5 pb-10">
    <div className="flex flex-col gap-4 rounded-[1.5rem] p-5 md:flex-row md:items-end md:justify-between md:p-6" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
      <div>
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-white/40"><ShieldAlert className="h-4 w-4" /> Registro operacional</div>
        <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">{operatorTitle ? "Minhas Ocorrências" : "Ocorrências"}</h1>
        <p className="mt-1 text-sm text-white/50">Registro completo, evidências, pessoas envolvidas e evolução do atendimento.</p>
      </div>
      <Button onClick={openNew} disabled={!isAdmin && (currentEmployee.isLoading || operatorIdentityUnavailable)} className="w-full bg-[#C8102E] text-white hover:bg-[#A00D24] md:w-auto"><Plus className="mr-2 h-4 w-4" /> Nova ocorrência</Button>
    </div>

    {operatorIdentityUnavailable && <Surface className="p-4"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" /><div><p className="font-bold" style={{ color: "var(--text-1)" }}>Cadastro operacional não localizado</p><p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>O registro de nova ocorrência fica bloqueado até sua matrícula estar vinculada a um colaborador ativo.</p></div></div></Surface>}

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[["Abertas", counts.open, AlertTriangle, "#ef4444"], ["Em análise", counts.analysis, Clock3, "#f59e0b"], ["Concluídas", counts.done, CheckCircle2, "#10b981"]].map(([label, value, Icon, color]: any) => <Surface key={label} className="p-4"><div className="flex justify-between"><div><p className="text-[10px] font-black uppercase" style={{ color: "var(--text-4)" }}>{label}</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{value}</p></div><Icon className="h-4 w-4" style={{ color }} /></div></Surface>)}
    </div>

    <Surface className="p-4"><div className="grid gap-3 md:grid-cols-[1fr_180px]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-4)" }} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por natureza, local, categoria, fonte..." className="pl-10" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Todos", "Aberta", "Em análise", "Concluída"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div></Surface>

    <div className="space-y-3">
      {filtered.map((occurrence) => <Surface key={occurrence.id} className="overflow-hidden">
        <div className="h-[3px]" style={{ background: severityColor[occurrence.severity] }} />
        <div className="p-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="break-words font-bold" style={{ color: "var(--text-1)" }}>{occurrence.title}</p>
                <span className="rounded-full px-2 py-1 text-[10px] font-black" style={{ color: severityColor[occurrence.severity], background: `${severityColor[occurrence.severity]}16` }}>{occurrence.severity}</span>
                <span className="text-[10px] font-black" style={{ color: occurrence.status === "Concluída" ? "#10b981" : occurrence.status === "Em análise" ? "#f59e0b" : "#ef4444" }}>{occurrence.status}</span>
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>{occurrence.category} · {displayDate(occurrence.occurred_at)}</p>
              <p className="mt-3 line-clamp-2 text-sm" style={{ color: "var(--text-2)" }}>{occurrence.description}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs" style={{ color: "var(--text-4)" }}>
                {occurrence.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{occurrence.location}</span>}
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{occurrence.people_involved.length} pessoa(s)</span>
                <span className="flex items-center gap-1"><Camera className="h-3.5 w-3.5" />{occurrence.attachment_count} evidência(s)</span>
                <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" />{occurrence.update_count} atualização(ões)</span>
              </div>
            </div>
            <div className="flex w-full flex-wrap justify-end gap-2 md:w-auto">
              <Button size="sm" variant="outline" className="flex-1 md:flex-none" onClick={() => setDetailsId(occurrence.id)}><Eye className="mr-1.5 h-3.5 w-3.5" /> Ver detalhes</Button>
              {isAdmin && occurrence.status !== "Concluída" && <Button size="sm" variant="outline" className="flex-1 md:flex-none" onClick={() => openEdit(occurrence)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar</Button>}
              {isAdmin && occurrence.status === "Aberta" && occurrence.attachment_count === 0 && <Button size="icon" variant="outline" disabled={remove.isPending} className="text-red-500" onClick={() => { if (window.confirm(`Excluir a ocorrência “${occurrence.title}”?`)) remove.mutate(occurrence.id); }}><Trash2 className="h-4 w-4" /></Button>}
              {occurrence.status === "Concluída" && <span className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-4)" }}><LockKeyhole className="h-3.5 w-3.5" /> Histórico protegido</span>}
            </div>
          </div>
        </div>
      </Surface>)}
      {!filtered.length && <Surface className="p-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 opacity-30" style={{ color: "var(--text-4)" }} /><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Nenhuma ocorrência encontrada.</p></Surface>}
    </div>

    <Dialog open={open} onOpenChange={(next) => { if (!save.isPending) setOpen(next); }}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{editing ? "Editar ocorrência" : "Nova ocorrência"}</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <section className="space-y-4">
            <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#C8102E]">1 · Identificação</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Natureza, classificação, horário e local exato.</p></div>
            {isAdmin && <div className="space-y-1.5"><Label>Colaborador principal relacionado</Label><Select value={form.employee_id || "none"} onValueChange={(value) => setForm({ ...form, employee_id: value === "none" ? "" : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Nenhum específico</SelectItem>{(employees.data ?? []).filter((employee) => employee.status === "Ativo").map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.full_name} · {employee.matricula}</SelectItem>)}</SelectContent></Select></div>}
            <div className="grid gap-3 md:grid-cols-2"><div className="space-y-1.5"><Label>Natureza / título *</Label><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Tentativa de acesso não autorizado" /></div><div className="space-y-1.5"><Label>Categoria</Label><Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div></div>
            <div className="grid gap-3 md:grid-cols-3"><div className="space-y-1.5"><Label>Severidade</Label><Select value={form.severity} onValueChange={(value) => setForm({ ...form, severity: value as Occurrence["severity"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Baixa", "Média", "Alta", "Crítica"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Data e hora</Label><Input type="datetime-local" value={form.occurred_at} onChange={(event) => setForm({ ...form, occurred_at: event.target.value })} /></div><div className="space-y-1.5"><Label>Local exato *</Label><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Portaria, área, ponto..." /></div></div>
          </section>

          <section className="space-y-4 border-t pt-5" style={{ borderColor: "var(--border)" }}>
            <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#C8102E]">2 · Situação encontrada</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>O que ocorreu, situação atual e risco imediato.</p></div>
            <div className="space-y-1.5"><Label>Descrição do fato *</Label><Textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descreva objetivamente o que foi observado ou informado." /></div>
            <div className="grid gap-3 md:grid-cols-2"><div className="space-y-1.5"><Label>Situação atual *</Label><Textarea rows={3} value={form.current_situation} onChange={(event) => setForm({ ...form, current_situation: event.target.value })} placeholder="O que está acontecendo agora?" /></div><div className="space-y-1.5"><Label>Risco imediato</Label><Textarea rows={3} value={form.immediate_risk} onChange={(event) => setForm({ ...form, immediate_risk: event.target.value })} placeholder="Há pessoas expostas ou risco de agravamento?" /></div></div>
          </section>

          <section className="space-y-4 border-t pt-5" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#C8102E]" /><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#C8102E]">3 · Pessoas envolvidas</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Adicione quantas forem necessárias e informe a relação com a ocorrência.</p></div></div>
            {form.people_involved.length > 0 && <div className="space-y-2">{form.people_involved.map((person, index) => <div key={`${person.employee_id || person.name}-${index}`} className="flex items-start justify-between gap-3 rounded-xl p-3" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}><div className="min-w-0"><p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>{person.name}</p><p className="text-xs" style={{ color: "var(--text-4)" }}>{person.role}{person.matricula ? ` · Mat. ${person.matricula}` : ""}</p>{person.notes && <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>{person.notes}</p>}</div><Button type="button" size="icon" variant="ghost" onClick={() => setForm((current) => ({ ...current, people_involved: current.people_involved.filter((_, itemIndex) => itemIndex !== index) }))}><X className="h-4 w-4" /></Button></div>)}</div>}
            <div className="rounded-xl p-3" style={{ border: "1px dashed var(--border)" }}><div className="grid gap-3 md:grid-cols-2">{isAdmin && <div className="space-y-1.5"><Label>Selecionar colaborador</Label><Select value={personEmployeeId || "manual"} onValueChange={(value) => { setPersonEmployeeId(value === "manual" ? "" : value); if (value !== "manual") setPersonName(""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Pessoa não vinculada ao cadastro</SelectItem>{(employees.data ?? []).map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.full_name} · {employee.matricula}</SelectItem>)}</SelectContent></Select></div>}<div className="space-y-1.5"><Label>{isAdmin ? "Nome/identificação, se externa" : "Nome/identificação"}</Label><Input value={personName} disabled={Boolean(personEmployeeId)} onChange={(event) => setPersonName(event.target.value)} /></div><div className="space-y-1.5"><Label>Relação com a ocorrência</Label><Input value={personRole} onChange={(event) => setPersonRole(event.target.value)} placeholder="Ex.: Envolvido, comunicante, apoio" /></div><div className="space-y-1.5"><Label>Observação</Label><Input value={personNotes} onChange={(event) => setPersonNotes(event.target.value)} placeholder="Opcional" /></div></div><Button type="button" variant="outline" className="mt-3" onClick={addPerson}><Plus className="mr-2 h-4 w-4" />Adicionar pessoa</Button></div>
          </section>

          <section className="space-y-4 border-t pt-5" style={{ borderColor: "var(--border)" }}>
            <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#C8102E]">4 · Fonte e providências</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Quem informou, o que já foi feito e qual apoio ainda é necessário.</p></div>
            <div className="space-y-1.5"><Label>Fonte da informação</Label><Input value={form.information_source} onChange={(event) => setForm({ ...form, information_source: event.target.value })} placeholder="Ex.: Vigilante da Portaria 01, CFTV, terceiro..." /></div>
            <div className="grid gap-3 md:grid-cols-2"><div className="space-y-1.5"><Label>Providências já adotadas</Label><Textarea rows={3} value={form.actions_taken} onChange={(event) => setForm({ ...form, actions_taken: event.target.value })} /></div><div className="space-y-1.5"><Label>Apoio / providência necessária</Label><Textarea rows={3} value={form.support_required} onChange={(event) => setForm({ ...form, support_required: event.target.value })} /></div></div>
          </section>

          <section className="space-y-4 border-t pt-5" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2"><Camera className="h-4 w-4 text-[#C8102E]" /><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#C8102E]">5 · Registro fotográfico</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>PNG/JPEG · máximo 5 evidências por ocorrência · 1,25 MB cada. Após anexada, a evidência fica preservada.</p></div></div>
            {editing && editing.attachment_count > 0 && <p className="rounded-xl p-3 text-xs" style={{ background: "var(--bg-surface-2)", color: "var(--text-3)" }}><LockKeyhole className="mr-1.5 inline h-3.5 w-3.5" />{editing.attachment_count} evidência(s) já preservada(s). Você pode adicionar novas até o limite.</p>}
            <Input type="file" accept="image/png,image/jpeg" multiple onChange={(event) => { void onEvidenceFiles(event.target.files); event.target.value = ""; }} />
            {pendingEvidence.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{pendingEvidence.map((evidence) => <div key={evidence.id} className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}><img src={evidence.data_url} alt="Prévia da evidência" className="h-36 w-full object-cover" /><div className="space-y-2 p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-bold" style={{ color: "var(--text-1)" }}>{evidence.name}</p><p className="text-[10px]" style={{ color: "var(--text-4)" }}>{Math.round(evidence.size / 1024)} KB</p></div><Button type="button" size="icon" variant="ghost" onClick={() => setPendingEvidence((current) => current.filter((item) => item.id !== evidence.id))}><X className="h-4 w-4" /></Button></div><Input value={evidence.caption} onChange={(event) => setPendingEvidence((current) => current.map((item) => item.id === evidence.id ? { ...item, caption: event.target.value } : item))} placeholder="Legenda da evidência (opcional)" /></div></div>)}</div>}
          </section>

          {editing && isAdmin && <section className="space-y-4 border-t pt-5" style={{ borderColor: "var(--border)" }}><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#C8102E]">6 · Tratamento</p></div><div className="grid gap-3 md:grid-cols-2"><div className="space-y-1.5"><Label>Situação</Label><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as Occurrence["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Aberta", "Em análise", "Concluída"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Conclusão / solução</Label><Textarea rows={3} value={form.resolution_notes} onChange={(event) => setForm({ ...form, resolution_notes: event.target.value })} placeholder={form.status === "Concluída" ? "Obrigatório para concluir" : "Preencha quando houver conclusão"} /></div></div></section>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-[#C8102E] font-bold text-white hover:bg-[#A00D24]">{save.isPending ? "Salvando..." : editing ? "Salvar alterações" : "Registrar ocorrência"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(detailsId)} onOpenChange={(next) => { if (!next) { setDetailsId(null); setUpdateNote(""); } }}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle>Registro completo da ocorrência</DialogTitle></DialogHeader>
        {details.isLoading ? <div className="flex justify-center py-16"><div className="h-7 w-7 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div> : details.isError || !details.data ? <p className="py-10 text-center text-red-500">Não foi possível abrir o registro completo.</p> : (() => {
          const record = details.data;
          return <div className="space-y-5">
            <Surface className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black" style={{ color: "var(--text-1)" }}>{record.title}</h3><span className="rounded-full px-2 py-1 text-[10px] font-black" style={{ color: severityColor[record.severity], background: `${severityColor[record.severity]}16` }}>{record.severity}</span></div><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>{record.category} · {displayDate(record.occurred_at)}</p></div><span className="text-xs font-black" style={{ color: record.status === "Concluída" ? "#10b981" : record.status === "Em análise" ? "#f59e0b" : "#ef4444" }}>{record.status}</span></div></Surface>

            <div className="grid gap-3 md:grid-cols-2"><Surface className="p-4"><p className="text-[10px] font-black uppercase" style={{ color: "var(--text-4)" }}>Local exato</p><p className="mt-2 text-sm font-bold" style={{ color: "var(--text-1)" }}>{record.location || "—"}</p></Surface><Surface className="p-4"><p className="text-[10px] font-black uppercase" style={{ color: "var(--text-4)" }}>Fonte da informação</p><p className="mt-2 text-sm font-bold" style={{ color: "var(--text-1)" }}>{record.information_source || "—"}</p></Surface></div>

            <Surface className="p-4"><p className="text-[10px] font-black uppercase" style={{ color: "var(--text-4)" }}>Descrição do fato</p><p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "var(--text-2)" }}>{record.description}</p></Surface>
            <div className="grid gap-3 md:grid-cols-2"><Surface className="p-4"><p className="text-[10px] font-black uppercase" style={{ color: "var(--text-4)" }}>Situação atual</p><p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "var(--text-2)" }}>{record.current_situation || "—"}</p></Surface><Surface className="p-4"><p className="text-[10px] font-black uppercase" style={{ color: "var(--text-4)" }}>Risco imediato</p><p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "var(--text-2)" }}>{record.immediate_risk || "Não informado"}</p></Surface></div>
            <div className="grid gap-3 md:grid-cols-2"><Surface className="p-4"><p className="text-[10px] font-black uppercase" style={{ color: "var(--text-4)" }}>Providências adotadas</p><p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "var(--text-2)" }}>{record.actions_taken || "—"}</p></Surface><Surface className="p-4"><p className="text-[10px] font-black uppercase" style={{ color: "var(--text-4)" }}>Apoio necessário</p><p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "var(--text-2)" }}>{record.support_required || "—"}</p></Surface></div>

            <Surface className="p-4"><div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-[#C8102E]" /><p className="text-sm font-black" style={{ color: "var(--text-1)" }}>Pessoas envolvidas</p></div>{record.people_involved.length ? <div className="grid gap-2 sm:grid-cols-2">{record.people_involved.map((person, index) => <div key={`${person.name}-${index}`} className="rounded-xl p-3" style={{ background: "var(--bg-surface-2)" }}><p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>{person.name}</p><p className="mt-0.5 text-xs" style={{ color: "var(--text-4)" }}>{person.role}{person.matricula ? ` · Mat. ${person.matricula}` : ""}</p>{person.notes && <p className="mt-2 text-xs" style={{ color: "var(--text-3)" }}>{person.notes}</p>}</div>)}</div> : <p className="text-sm" style={{ color: "var(--text-4)" }}>Nenhuma pessoa adicional registrada.</p>}</Surface>

            <Surface className="p-4"><div className="mb-3 flex items-center gap-2"><FileImage className="h-4 w-4 text-[#C8102E]" /><p className="text-sm font-black" style={{ color: "var(--text-1)" }}>Registros fotográficos e documentais</p></div>{record.attachments.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{record.attachments.map((attachment) => <div key={attachment.id} className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}><img src={occurrenceAttachmentUrl(record.id, attachment)} alt={attachment.caption || "Evidência da ocorrência"} className="h-40 w-full object-cover" /><div className="p-3"><p className="truncate text-xs font-bold" style={{ color: "var(--text-1)" }}>{attachment.original_name}</p>{attachment.caption && <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>{attachment.caption}</p>}<p className="mt-1 text-[10px]" style={{ color: "var(--text-4)" }}>Evidência preservada · {Math.round(attachment.size_bytes / 1024)} KB</p></div></div>)}</div> : <p className="text-sm" style={{ color: "var(--text-4)" }}>Nenhuma evidência fotográfica anexada.</p>}</Surface>

            <Surface className="p-4"><div className="mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-[#C8102E]" /><p className="text-sm font-black" style={{ color: "var(--text-1)" }}>Evolução da ocorrência</p></div><div className="space-y-3"><div className="flex gap-3"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#C8102E]" /><div><p className="text-xs font-bold" style={{ color: "var(--text-1)" }}>Ocorrência registrada</p><p className="text-[10px]" style={{ color: "var(--text-4)" }}>{displayDate(record.created_at)} · {record.created_by_name || "Usuário"}</p></div></div>{record.updates.map((entry) => <div key={entry.id} className="flex gap-3"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" /><div><p className="whitespace-pre-wrap text-xs" style={{ color: "var(--text-2)" }}>{entry.note}</p><p className="mt-1 text-[10px]" style={{ color: "var(--text-4)" }}>{displayDate(entry.created_at)} · {entry.created_by_name || "Inspetoria"} · {entry.status_snapshot}</p></div></div>)}{record.resolved_at && <div className="flex gap-3"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" /><div><p className="text-xs font-bold text-emerald-600">Ocorrência concluída</p><p className="mt-1 text-xs" style={{ color: "var(--text-2)" }}>{record.resolution_notes}</p><p className="mt-1 text-[10px]" style={{ color: "var(--text-4)" }}>{displayDate(record.resolved_at)}</p></div></div>}</div>{isAdmin && record.status !== "Concluída" && <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row" style={{ borderColor: "var(--border)" }}><Textarea value={updateNote} onChange={(event) => setUpdateNote(event.target.value)} placeholder="Registrar decisão, acionamento, deslocamento ou mudança de cenário..." rows={2} /><Button className="bg-[#C8102E] text-white hover:bg-[#A00D24]" disabled={addUpdate.isPending} onClick={() => addUpdate.mutate()}>{addUpdate.isPending ? "Registrando..." : "Adicionar atualização"}</Button></div>}</Surface>

            {record.resolution_notes && <Surface className="p-4"><p className="text-[10px] font-black uppercase text-emerald-600">Conclusão / solução</p><p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "var(--text-2)" }}>{record.resolution_notes}</p></Surface>}
          </div>;
        })()}
        <DialogFooter><Button variant="outline" onClick={() => setDetailsId(null)}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
