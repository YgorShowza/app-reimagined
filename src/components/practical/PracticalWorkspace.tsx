import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Plus, Search, CheckCircle2, Clock3, PlayCircle, Trash2, Pencil, Award, Gauge, Target, ShieldCheck, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PracticalTemplateManager } from "@/components/practical/PracticalTemplateManager";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { listEmployees } from "@/lib/employees";
import { operationalDate } from "@/lib/operational-time";
import { invalidateCronogramaFlow } from "@/lib/operational-query-sync";
import { listPracticalEvalTemplates, type PracticalEvalTemplate } from "@/lib/practical-templates";
import { createPracticalEvaluation, deletePracticalEvaluation, listPracticalEvaluations, updatePracticalEvaluation, type PracticalEvaluation } from "@/lib/operations";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`rounded-2xl ${className}`} style={{ background:"var(--bg-surface)",border:"1px solid var(--border)",boxShadow:"var(--shadow-card, var(--shadow-md))" }}>{children}</div>; }
const defaultChecklist = ["Apresentação e postura profissional","Comunicação operacional","Execução do procedimento","Uso correto dos recursos","Cumprimento das normas de segurança"].map((label,i)=>({id:String(i+1),label,done:false}));

function Metric({label,value,icon:Icon,accent,sub}:{label:string;value:number;icon:typeof Clock3;accent:string;sub:string}){return <Card className="relative overflow-hidden p-4"><div className="absolute left-0 top-0 h-[3px] w-full" style={{background:accent}}/><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em]" style={{color:"var(--text-4)"}}>{label}</p><p className="mt-2 text-3xl font-black" style={{color:"var(--text-1)"}}>{value}</p><p className="mt-1 text-[11px] font-semibold" style={{color:accent}}>{sub}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{background:`${accent}12`,border:`1px solid ${accent}30`}}><Icon className="h-4 w-4" style={{color:accent}}/></div></div></Card>}

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const source = value.length === 10 ? `${value}T12:00:00` : value;
  return new Date(source).toLocaleDateString("pt-BR", { timeZone: "America/Maceio" });
}

function dateTimeLabel(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Maceio" });
}

function templateChecklist(template: PracticalEvalTemplate) {
  return (template.tasks ?? []).map((raw, index) => {
    let value: Record<string, unknown> = {};
    if (typeof raw === "string") {
      try { value = JSON.parse(raw) as Record<string, unknown>; }
      catch { value = { title: raw }; }
    } else if (raw && typeof raw === "object") {
      value = raw as Record<string, unknown>;
    }
    const label = String(value.title ?? value.label ?? "").trim();
    return label ? { id: String(value.id ?? `template_${index + 1}`), label, done: false } : null;
  }).filter((item): item is { id: string; label: string; done: boolean } => Boolean(item));
}

function normalizedPracticalScore(row: Pick<PracticalEvaluation,"score"|"max_score">) {
  const max = Number(row.max_score || 10);
  return max > 0 ? (Number(row.score || 0) / max) * 10 : 0;
}

function isPracticalApproved(row: Pick<PracticalEvaluation,"score"|"max_score"|"min_approval_score">) {
  return normalizedPracticalScore(row) >= Number(row.min_approval_score ?? 7);
}

export function PracticalWorkspace({ operatorTitle=false }: { operatorTitle?: boolean }) {
  const qc=useQueryClient(); const {data:user}=useCurrentUser(); const isAdmin=user?.isAdmin??false;
  const [search,setSearch]=useState(""); const [status,setStatus]=useState("Todos"); const [open,setOpen]=useState(false); const [modelsOpen,setModelsOpen]=useState(false); const [selectedTemplate,setSelectedTemplate]=useState(""); const [editing,setEditing]=useState<PracticalEvaluation|null>(null);
  const [form,setForm]=useState({employee_id:"",title:"Avaliação Prática Operacional",evaluation_date:operationalDate(),status:"Planejada",score:0,max_score:10,min_approval_score:7,notes:"",checklist:defaultChecklist});
  const query=useQuery({queryKey:["practical-evaluations",isAdmin?"admin":user?.matricula??"self"],queryFn:listPracticalEvaluations,enabled:Boolean(user)});
  const employees=useQuery({queryKey:["employees"],queryFn:listEmployees,enabled:isAdmin});
  const templates=useQuery({queryKey:["practical-eval-templates"],queryFn:listPracticalEvalTemplates,enabled:isAdmin});
  const rows=query.data??[];
  const selectedEmployee=(employees.data??[]).find((employee)=>employee.id===form.employee_id);
  const availableTemplates=(templates.data??[]).filter((template)=>template.status==="Ativo"&&(!selectedEmployee||template.target_sector==="Todos"||template.target_sector===selectedEmployee.sector));
  const filtered=useMemo(()=>rows.filter((r)=>{if(status!=="Todos"&&r.status!==status)return false;const q=search.toLowerCase().trim();return !q||[r.employee_name,r.employee_matricula,r.employee_sector,r.title].some(v=>(v||"").toLowerCase().includes(q));}),[rows,search,status]);
  const invalidate=async()=>{await Promise.all([qc.invalidateQueries({queryKey:["practical-evaluations"]}),invalidateCronogramaFlow(qc)]);};
  const reset=()=>{setSelectedTemplate("");setForm({employee_id:"",title:"Avaliação Prática Operacional",evaluation_date:operationalDate(),status:"Planejada",score:0,max_score:10,min_approval_score:7,notes:"",checklist:defaultChecklist});};
  const applyTemplate=(templateId:string)=>{
    if(templateId==="manual"){
      setSelectedTemplate("");
      setForm((current)=>({...current,title:"Avaliação Prática Operacional",min_approval_score:7,checklist:defaultChecklist}));
      return;
    }
    const template=(templates.data??[]).find((item)=>item.id===templateId);
    if(!template)return;
    const checklist=templateChecklist(template);
    setSelectedTemplate(template.id);
    setForm((current)=>({...current,title:template.title,min_approval_score:Number(template.min_approval_score??7),checklist:checklist.length?checklist:defaultChecklist}));
  };
  const save=useMutation({mutationFn:async()=>{
    if(!form.title.trim())throw new Error("Informe o título");
    if(!form.evaluation_date)throw new Error("Informe a data da avaliação para sincronizar com o Cronograma");
    const score=Number(form.score); const maxScore=Number(form.max_score); const minApproval=Number(form.min_approval_score);
    if(!Number.isFinite(maxScore)||maxScore<=0)throw new Error("Informe uma nota máxima válida");
    if(!Number.isFinite(score)||score<0||score>maxScore)throw new Error("A nota deve ficar entre 0 e a nota máxima");
    if(!Number.isFinite(minApproval)||minApproval<0||minApproval>10)throw new Error("A nota mínima deve ficar entre 0 e 10");
    if(editing?.status==="Concluída")throw new Error("Avaliação concluída pertence ao histórico e não pode ser alterada");
    if(form.status==="Concluída"&&form.checklist.some((item)=>!item.done))throw new Error("Conclua todos os itens do checklist antes de finalizar a avaliação prática");
    if(editing){await updatePracticalEvaluation(editing.id,{title:form.title,status:form.status as PracticalEvaluation["status"],score,max_score:maxScore,min_approval_score:minApproval,notes:form.notes||null,evaluation_date:form.evaluation_date,checklist:form.checklist});return;}
    const emp=(employees.data??[]).find(e=>e.id===form.employee_id);if(!emp)throw new Error("Selecione o colaborador");
    await createPracticalEvaluation({employee_id:emp.id,employee_name:emp.full_name,employee_matricula:emp.matricula,employee_sector:emp.sector,title:form.title,evaluator_name:user?.nome||null,evaluation_date:form.evaluation_date,min_approval_score:minApproval,checklist:form.checklist,notes:form.notes||null});
  },onSuccess:async()=>{toast.success(editing?"Avaliação atualizada":"Avaliação planejada e sincronizada com o Cronograma");setOpen(false);setEditing(null);reset();await invalidate();},onError:(e:Error)=>toast.error(e.message)});
  const remove=useMutation({mutationFn:deletePracticalEvaluation,onSuccess:async()=>{toast.success("Avaliação planejada excluída");await invalidate();},onError:(e:Error)=>toast.error(e.message)});
  const openEdit=(r:PracticalEvaluation)=>{if(r.status==="Concluída"){toast.info("Avaliação concluída pertence ao histórico operacional e não pode ser alterada.");return;}setSelectedTemplate("");setEditing(r);setForm({employee_id:r.employee_id,title:r.title,evaluation_date:r.evaluation_date||"",status:r.status,score:r.score,max_score:r.max_score,min_approval_score:Number(r.min_approval_score??7),notes:r.notes||"",checklist:r.checklist.length?r.checklist:defaultChecklist});setOpen(true);};
  const counts={planned:rows.filter(r=>r.status==="Planejada").length,running:rows.filter(r=>r.status==="Em andamento").length,done:rows.filter(r=>r.status==="Concluída").length};
  const approved=rows.filter(r=>r.status==="Concluída"&&isPracticalApproved(r)).length;

  if (!user || query.isLoading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>;
  if (query.isError) return <div className="mx-auto max-w-2xl rounded-2xl p-8 text-center" style={{background:"var(--bg-surface)",border:"1px solid var(--border)"}}><p className="font-bold text-red-500">Não foi possível carregar as avaliações práticas.</p><Button variant="outline" className="mt-4" onClick={()=>query.refetch()}>Tentar novamente</Button></div>;

  return <div className="mx-auto max-w-6xl space-y-5 pb-10">
    <section className="relative overflow-hidden rounded-[1.75rem] p-5 md:p-6" style={{background:"linear-gradient(135deg,#171117 0%,#310912 55%,#160f14 100%)",border:"1px solid rgba(200,16,46,.28)",boxShadow:"0 12px 38px rgba(80,0,18,.16)"}}><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full" style={{background:"radial-gradient(circle,rgba(200,16,46,.25),transparent 68%)"}}/><div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em]" style={{color:"rgba(255,255,255,.44)"}}><ClipboardCheck className="h-4 w-4"/> Competência operacional</div><h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">{operatorTitle?"Minha Avaliação Prática":"Avaliação Prática"}</h1><p className="mt-1 text-sm" style={{color:"rgba(255,255,255,.52)"}}>Planejamento, checklist, nota e conclusão sincronizados com o Cronograma.</p></div>{isAdmin&&<div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto"><Button variant="outline" onClick={()=>setModelsOpen(true)} className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Settings2 className="mr-2 h-4 w-4"/> Modelos</Button><Button onClick={()=>{setEditing(null);reset();setOpen(true)}} className="bg-[#e0142f] font-bold text-white shadow-lg shadow-red-950/20 hover:bg-[#C8102E]"><Plus className="mr-2 h-4 w-4"/> Planejar avaliação</Button></div>}</div></section>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Planejadas" value={counts.planned} icon={Clock3} accent="#f59e0b" sub="aguardando execução"/><Metric label="Em andamento" value={counts.running} icon={PlayCircle} accent="#3b82f6" sub="avaliações abertas"/><Metric label="Concluídas" value={counts.done} icon={CheckCircle2} accent="#10b981" sub="registros finalizados"/><Metric label="Aprovadas" value={approved} icon={Award} accent="#e11d48" sub="conforme nota mínima"/></div>

    <Card className="p-4"><div className="grid gap-3 md:grid-cols-[1fr_190px]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{color:"var(--text-4)"}}/><Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar colaborador ou avaliação..." className="pl-10"/></div><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Todos","Planejada","Em andamento","Concluída"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div></Card>

    <div className="space-y-3">{filtered.map(r=>{const pct=Math.round((Number(r.score)/Number(r.max_score||10))*100);const passed=isPracticalApproved(r);const accent=r.status==="Concluída"?"#10b981":r.status==="Em andamento"?"#3b82f6":"#f59e0b";const doneCount=r.checklist.filter(i=>i.done).length;const checklistPct=r.checklist.length?Math.round((doneCount/r.checklist.length)*100):0;return <Card key={r.id} className="relative overflow-hidden"><div className="absolute bottom-0 left-0 top-0 w-[3px]" style={{background:accent}}/><div className="p-4 pl-5 md:p-5 md:pl-6"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="break-words text-base font-black" style={{color:"var(--text-1)"}}>{r.employee_name}</p><span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{color:accent,background:`${accent}12`,border:`1px solid ${accent}30`}}>{r.status}</span>{r.status==="Concluída"&&<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black text-emerald-500" style={{background:"rgba(16,185,129,.08)"}}><ShieldCheck className="h-3 w-3"/> HISTÓRICO PROTEGIDO</span>}</div><p className="mt-0.5 break-words text-xs" style={{color:"var(--text-4)"}}>Mat. {r.employee_matricula} · {r.employee_sector}</p><p className="mt-3 break-words text-sm font-semibold" style={{color:"var(--text-2)"}}>{r.title}</p><p className="mt-1 text-xs" style={{color:"var(--text-4)"}}>Data prevista/avaliada: {dateLabel(r.evaluation_date)} · Nota mínima: {Number(r.min_approval_score??7).toLocaleString("pt-BR")}/10</p>
      <div className="mt-4"><div className="mb-1.5 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[.12em]" style={{color:"var(--text-4)"}}>Checklist</span><span className="text-[10px] font-black" style={{color:accent}}>{doneCount}/{r.checklist.length} · {checklistPct}%</span></div><div className="h-2 overflow-hidden rounded-full" style={{background:"var(--bg-surface-3)"}}><div className="h-full rounded-full" style={{width:`${checklistPct}%`,background:accent}}/></div></div>
      <div className="mt-3 flex flex-wrap gap-2">{r.checklist.map(i=><span key={i.id} className="rounded-full px-2 py-1 text-[10px]" style={{color:i.done?"#10b981":"var(--text-4)",background:i.done?"rgba(16,185,129,.1)":"var(--bg-surface-3)",border:i.done?"1px solid rgba(16,185,129,.18)":"1px solid transparent"}}>{i.done?"✓ ":"○ "}{i.label}</span>)}</div>
      {r.status==="Concluída"&&<><div className="mt-4 flex items-center gap-3 rounded-xl p-3" style={{background:passed?"rgba(16,185,129,.08)":"rgba(239,68,68,.08)",border:`1px solid ${passed?"rgba(16,185,129,.18)":"rgba(239,68,68,.18)"}`}}><Gauge className="h-4 w-4" style={{color:passed?"#10b981":"#ef4444"}}/><div><p className="text-[10px] font-black uppercase" style={{color:"var(--text-4)"}}>Resultado final</p><span className="font-black" style={{color:passed?"#10b981":"#ef4444"}}>{r.score}/{r.max_score} · {pct}% · {passed?"APROVADO":"NÃO APROVADO"}</span></div></div><p className="mt-2 text-[10px]" style={{color:"var(--text-4)"}}>Concluída em {dateTimeLabel(r.completed_at)}{r.evaluator_name?` · Avaliador: ${r.evaluator_name}`:""}</p></>}{r.notes&&<p className="mt-3 break-words text-xs" style={{color:"var(--text-4)"}}>{r.notes}</p>}</div>{isAdmin&&<div className="flex w-full gap-2 md:w-auto">{r.status!=="Concluída"&&<Button size="sm" variant="outline" className="flex-1 md:flex-none" onClick={()=>openEdit(r)}><Pencil className="mr-1.5 h-3.5 w-3.5"/> Avaliar</Button>}{r.status==="Planejada"&&<Button size="icon" variant="outline" className="text-red-500" onClick={()=>{if(window.confirm(`Excluir a avaliação planejada de ${r.employee_name}? O lançamento pendente vinculado no Cronograma também será removido.`))remove.mutate(r.id)}}><Trash2 className="h-4 w-4"/></Button>}{r.status!=="Planejada"&&r.status!=="Concluída"&&<span className="inline-flex items-center gap-1 px-2 text-[10px] font-bold" style={{color:"var(--text-4)"}}><ShieldCheck className="h-3.5 w-3.5"/> execução preservada</span>}</div>}</div></div></Card>})}{!filtered.length&&<Card className="p-10 text-center"><Target className="mx-auto h-10 w-10 opacity-30" style={{color:"var(--text-4)"}}/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>Nenhuma avaliação encontrada.</p></Card>}</div>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editing?"Avaliar colaborador":"Planejar avaliação"}</DialogTitle></DialogHeader><div className="space-y-4">{!editing&&<><div className="space-y-1.5"><Label>Colaborador *</Label><Select value={form.employee_id} onValueChange={(v)=>{setSelectedTemplate("");setForm({...form,employee_id:v})}}><SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent>{(employees.data??[]).filter(e=>e.status==="Ativo"&&e.access_profile!=="Inspetor").map(e=><SelectItem key={e.id} value={e.id}>{e.full_name} · {e.matricula} · {e.sector}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Modelo operacional (opcional)</Label><Select value={selectedTemplate||"manual"} onValueChange={applyTemplate} disabled={!form.employee_id||templates.isLoading}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="manual">Avaliação manual</SelectItem>{availableTemplates.map((template)=><SelectItem key={template.id} value={template.id}>{template.title} · mín. {Number(template.min_approval_score).toLocaleString("pt-BR")}</SelectItem>)}</SelectContent></Select>{form.employee_id&&availableTemplates.length===0&&!templates.isLoading&&<p className="text-[10px]" style={{color:"var(--text-4)"}}>Nenhum modelo ativo compatível com o setor selecionado. A avaliação manual continua disponível.</p>}</div></>}<div className="grid gap-3 md:grid-cols-2"><div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/></div><div className="space-y-1.5"><Label>Data *</Label><Input type="date" value={form.evaluation_date} onChange={(e)=>setForm({...form,evaluation_date:e.target.value})}/></div></div>{editing&&<><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="space-y-1.5"><Label>Situação</Label><Select value={form.status} onValueChange={(v)=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Planejada","Em andamento","Concluída"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Nota</Label><Input type="number" min={0} max={form.max_score} step="0.1" value={form.score} onChange={(e)=>setForm({...form,score:Number(e.target.value)})}/></div><div className="space-y-1.5"><Label>Nota máxima</Label><Input type="number" min={0.01} step="0.1" value={form.max_score} onChange={(e)=>setForm({...form,max_score:Number(e.target.value)})}/></div><div className="space-y-1.5"><Label>Nota mínima /10</Label><Input type="number" min={0} max={10} step="0.1" value={form.min_approval_score} onChange={(e)=>setForm({...form,min_approval_score:Number(e.target.value)})}/></div></div><div className="space-y-2"><Label>Checklist</Label>{form.checklist.map((i,idx)=><label key={i.id} className="flex cursor-pointer items-center gap-3 rounded-xl p-3" style={{background:i.done?"rgba(16,185,129,.08)":"var(--bg-surface-2)",border:"1px solid var(--border)"}}><input type="checkbox" checked={i.done} onChange={()=>setForm({...form,checklist:form.checklist.map((x,j)=>j===idx?{...x,done:!x.done}:x)})}/><span className="text-sm" style={{color:"var(--text-2)"}}>{i.label}</span></label>)}</div>{form.status==="Concluída"&&form.checklist.some((item)=>!item.done)&&<p className="text-xs font-bold text-amber-500">Para concluir, todos os itens do checklist precisam estar marcados.</p>}</>}{!editing&&<div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Nota mínima /10</Label><Input type="number" min={0} max={10} step="0.1" value={form.min_approval_score} onChange={(e)=>setForm({...form,min_approval_score:Number(e.target.value)})}/></div><div className="flex items-end"><p className="pb-2 text-[10px] leading-relaxed" style={{color:"var(--text-4)"}}>A nota mínima fica registrada na avaliação e será usada para definir aprovação, inclusive após recarregar o sistema.</p></div></div>}<div className="space-y-1.5"><Label>Observações</Label><textarea value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} className="min-h-24 w-full rounded-xl p-3 text-sm" style={{background:"var(--bg-surface-2)",border:"1px solid var(--border)",color:"var(--text-1)"}}/></div></div><DialogFooter className="flex-col-reverse gap-2 sm:flex-row"><Button variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button><Button onClick={()=>save.mutate()} disabled={save.isPending} className="bg-[#C8102E] text-white hover:bg-[#A00D24]">{save.isPending?"Salvando...":"Salvar"}</Button></DialogFooter></DialogContent></Dialog>

    {isAdmin&&<PracticalTemplateManager open={modelsOpen} onOpenChange={setModelsOpen}/>} 
  </div>;
}