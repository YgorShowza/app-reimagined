import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, PlusCircle, Trash2, Send, Undo2, Calendar, Target, PlayCircle, CheckCircle2, AlertTriangle, Layers3, FileCheck2, FileClock, Crosshair, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { listExams, listAvailableExams, listAttemptsByYear, deleteExam, updateExam, fmtDate, type Exam, type ExamAttempt } from "@/lib/exams";
import { operationalYear } from "@/lib/operational-time";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/provas")({ head:()=>({meta:[{title:"Provas · SEGEMPAT"}]}), component:ProvasPage });

function Card({children,className=""}:{children:React.ReactNode;className?:string}){return <div className={`rounded-2xl ${className}`} style={{background:"var(--bg-surface)",border:"1px solid var(--border)",boxShadow:"var(--shadow-card, var(--shadow-md))"}}>{children}</div>}
function Chip({children}:{children:React.ReactNode}){return <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{background:"var(--bg-surface-3)",border:"1px solid var(--border)",color:"var(--text-3)"}}>{children}</span>}
function Metric({label,value,icon:Icon,accent,sub}:{label:string;value:number;icon:typeof FileText;accent:string;sub:string}){return <Card className="relative overflow-hidden p-4"><div className="absolute left-0 top-0 h-[3px] w-full" style={{background:accent}}/><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em]" style={{color:"var(--text-4)"}}>{label}</p><p className="mt-2 text-3xl font-black" style={{color:"var(--text-1)"}}>{value}</p><p className="mt-1 text-[11px] font-semibold" style={{color:accent}}>{sub}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{background:`${accent}12`,border:`1px solid ${accent}30`}}><Icon className="h-4 w-4" style={{color:accent}}/></div></div></Card>}

function OperatorExamAction({exam,attempts,onTake}:{exam:Exam;attempts:ExamAttempt[];onTake:()=>void}){
  const examAttempts=attempts.filter((attempt)=>attempt.exam_id===exam.id).sort((a,b)=>(b.finished_at||"").localeCompare(a.finished_at||""));
  const approved=examAttempts.find((attempt)=>attempt.passed);
  const latest=examAttempts[0];

  if(approved){
    return <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:items-end"><span className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black" style={{background:"rgba(16,185,129,.10)",border:"1px solid rgba(16,185,129,.26)",color:"#10b981"}}><CheckCircle2 className="h-4 w-4"/> APROVADA · Nota {Number(approved.score||0).toFixed(1)}</span><span className="text-center text-[10px] font-semibold md:text-right" style={{color:"var(--text-4)"}}>Resultado já registrado neste ano operacional.</span></div>;
  }

  if(latest){
    return <div className="flex w-full flex-col gap-2 md:w-auto"><span className="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black" style={{background:"rgba(239,68,68,.09)",border:"1px solid rgba(239,68,68,.24)",color:"#ef4444"}}><XCircle className="h-3.5 w-3.5"/> NÃO APROVADA · Nota {Number(latest.score||0).toFixed(1)}</span><button onClick={onTake} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#C8102E] px-4 text-sm font-bold text-white md:w-auto"><RotateCcw className="h-4 w-4"/> Refazer prova</button></div>;
  }

  return <button onClick={onTake} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#C8102E] px-4 text-sm font-bold text-white md:w-auto"><PlayCircle className="h-4 w-4"/> Realizar prova</button>;
}

function ProvasPage(){
  const navigate=useNavigate();
  const qc=useQueryClient();
  const year=operationalYear();
  const {data:user,isLoading:userLoading}=useCurrentUser();
  const isAdmin=user?.isAdmin??false;
  const [toDelete,setToDelete]=useState<string|null>(null);
  const examsQuery=useQuery({
    queryKey:["exams",isAdmin?"admin":"operator"],
    queryFn:isAdmin?listExams:listAvailableExams,
    enabled:!!user,
  });
  const attemptsQuery=useQuery({
    queryKey:["operator-exam-attempts",year],
    queryFn:()=>listAttemptsByYear(year),
    enabled:!!user&&!isAdmin,
  });
  const all=examsQuery.data??[];
  const attempts=attemptsQuery.data??[];
  const exams=isAdmin?all:all.filter(e=>e.status==="Publicada");
  const invalidate=()=>qc.invalidateQueries({queryKey:["exams"]});
  const remove=useMutation({mutationFn:deleteExam,onSuccess:()=>{toast.success("Prova excluída");setToDelete(null);invalidate()},onError:(e:Error)=>toast.error(e.message)});
  const toggle=useMutation({mutationFn:({id,status}:{id:string;status:string})=>updateExam(id,{status}),onSuccess:()=>{toast.success("Situação atualizada");invalidate()},onError:(e:Error)=>toast.error(e.message)});

  if(userLoading||examsQuery.isLoading||(!isAdmin&&attemptsQuery.isLoading))return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>;
  if(examsQuery.isError||(!isAdmin&&attemptsQuery.isError))return <Card className="mx-auto max-w-xl p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-500"/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>Não foi possível carregar as provas.</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>Atualize a página. Se o problema persistir, informe a Inspetoria.</p></Card>;

  const published=all.filter(e=>e.status==="Publicada").length;
  const drafts=all.length-published;
  const sectors=new Set(all.map(e=>e.target_sector).filter(Boolean)).size;

  return <div className="mx-auto max-w-6xl space-y-5 pb-10">
    <section className="relative overflow-hidden rounded-[1.75rem] p-5 md:p-6" style={{background:"linear-gradient(135deg,#171117 0%,#310912 55%,#160f14 100%)",border:"1px solid rgba(200,16,46,.28)",boxShadow:"0 12px 38px rgba(80,0,18,.16)"}}>
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full" style={{background:"radial-gradient(circle,rgba(200,16,46,.25),transparent 68%)"}}/>
      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em]" style={{color:"rgba(255,255,255,.44)"}}><FileText className="h-4 w-4"/> Avaliações formais</div><h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">Provas</h1><p className="mt-1 text-sm" style={{color:"rgba(255,255,255,.52)"}}>{isAdmin?"Crie, publique e acompanhe provas por setor.":`Realize e acompanhe as provas disponíveis para o seu setor · ${year}.`}</p></div>
        {isAdmin&&<button onClick={()=>navigate({to:"/provas-criar"})} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#e0142f] px-4 text-sm font-bold text-white shadow-lg shadow-red-950/20 transition-colors hover:bg-[#C8102E] md:w-auto"><PlusCircle className="h-4 w-4"/> Nova prova</button>}
      </div>
    </section>

    {isAdmin&&<div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Total" value={all.length} icon={Layers3} accent="#3b82f6" sub="provas cadastradas"/><Metric label="Publicadas" value={published} icon={FileCheck2} accent="#10b981" sub="disponíveis aos operadores"/><Metric label="Rascunhos" value={drafts} icon={FileClock} accent="#f59e0b" sub="aguardando publicação"/><Metric label="Setores" value={sectors} icon={Crosshair} accent="#e11d48" sub="alvos configurados"/></div>}

    {exams.length===0?<Card className="p-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 opacity-30" style={{color:"var(--text-4)"}}/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>{isAdmin?"Nenhuma prova cadastrada.":"Nenhuma prova publicada disponível para seu setor."}</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>{isAdmin?"Crie a primeira avaliação para iniciar o ciclo formal de treinamento.":"Quando uma avaliação compatível for publicada, ela aparecerá aqui."}</p></Card>:<div className="space-y-3">{exams.map((exam:Exam)=>{const accent=exam.status==="Publicada"?"#10b981":"#f59e0b";const questionCount=exam.question_count??exam.questions.length;return <Card key={exam.id} className="relative overflow-hidden"><div className="absolute bottom-0 left-0 top-0 w-[3px]" style={{background:accent}}/><div className="p-4 pl-5 md:p-5 md:pl-6"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-base font-black" style={{color:"var(--text-1)"}}>{exam.title}</h3><span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{color:accent,background:`${accent}12`,border:`1px solid ${accent}30`}}>{exam.status}</span></div>{exam.description&&<p className="mt-2 break-words text-sm leading-relaxed" style={{color:"var(--text-3)"}}>{exam.description}</p>}<div className="mt-3 flex flex-wrap gap-2"><Chip>{exam.exam_type}</Chip><Chip>{questionCount} questões</Chip><Chip>Mín. {exam.min_approval_pct}%</Chip><Chip><Target className="mr-1 inline h-3 w-3"/>{exam.target_sector}</Chip><Chip><Calendar className="mr-1 inline h-3 w-3"/>{fmtDate(exam.scheduled_date)}</Chip></div></div><div className="flex w-full flex-wrap gap-2 md:w-auto md:shrink-0">{isAdmin?<><Link to="/provas-criar" search={{id:exam.id}} className="inline-flex h-9 flex-1 items-center justify-center rounded-lg px-3 text-xs font-bold md:flex-none" style={{border:"1px solid var(--border)",color:"var(--text-2)",background:"var(--bg-surface-2)"}}>Editar</Link><button onClick={()=>toggle.mutate({id:exam.id,status:exam.status==="Publicada"?"Rascunho":"Publicada"})} disabled={toggle.isPending} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold disabled:opacity-50 md:flex-none" style={{border:`1px solid ${accent}30`,color:accent,background:`${accent}0d`}}>{exam.status==="Publicada"?<Undo2 className="h-3.5 w-3.5"/>:<Send className="h-3.5 w-3.5"/>}{exam.status==="Publicada"?"Despublicar":"Publicar"}</button><button onClick={()=>setToDelete(exam.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500" style={{border:"1px solid var(--border)",background:"var(--bg-surface-2)"}}><Trash2 className="h-4 w-4"/></button></>:<OperatorExamAction exam={exam} attempts={attempts} onTake={()=>navigate({to:"/prova-realizar",search:{id:exam.id}})}/>}</div></div></div></Card>})}</div>}

    <AlertDialog open={!!toDelete} onOpenChange={(o)=>!o&&setToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir prova?</AlertDialogTitle><AlertDialogDescription>A exclusão só é permitida para provas que nunca tiveram tentativa registrada. Se já houve aplicação, use “Despublicar” para manter todo o histórico operacional e evidenciário.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-[#C8102E] hover:bg-[#A00D24]" onClick={()=>toDelete&&remove.mutate(toDelete)}>Excluir prova sem histórico</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}