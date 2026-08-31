import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, PlusCircle, Trash2, Send, Undo2, Calendar, Target, PlayCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { listExams, deleteExam, updateExam, fmtDate, type Exam } from "@/lib/exams";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/provas")({ head:()=>({meta:[{title:"Provas · SEGEMPAT"}]}), component:ProvasPage });

function Card({children,className=""}:{children:React.ReactNode;className?:string}){return <div className={`rounded-2xl ${className}`} style={{background:"var(--bg-surface)",border:"1px solid var(--border)",boxShadow:"var(--shadow-card, var(--shadow-md))"}}>{children}</div>}
function Chip({children}:{children:React.ReactNode}){return <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{background:"var(--bg-surface-3)",border:"1px solid var(--border)",color:"var(--text-3)"}}>{children}</span>}

function ProvasPage(){
  const navigate=useNavigate();
  const qc=useQueryClient();
  const {data:user}=useCurrentUser();
  const isAdmin=user?.isAdmin??false;
  const [toDelete,setToDelete]=useState<string|null>(null);
  const {data:all=[],isLoading,isError}=useQuery({queryKey:["exams"],queryFn:listExams});
  const exams=isAdmin?all:all.filter(e=>e.status==="Publicada");
  const invalidate=()=>qc.invalidateQueries({queryKey:["exams"]});
  const remove=useMutation({mutationFn:deleteExam,onSuccess:()=>{toast.success("Prova excluída");setToDelete(null);invalidate()},onError:(e:Error)=>toast.error(e.message)});
  const toggle=useMutation({mutationFn:({id,status}:{id:string;status:string})=>updateExam(id,{status}),onSuccess:()=>{toast.success("Situação atualizada");invalidate()},onError:(e:Error)=>toast.error(e.message)});

  if(isLoading)return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>;
  if(isError)return <Card className="mx-auto max-w-xl p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-500"/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>Não foi possível carregar as provas.</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>Atualize a página. Se o problema persistir, informe a Inspetoria.</p></Card>;

  return <div className="mx-auto max-w-5xl space-y-5 pb-10">
    <div className="flex flex-col gap-4 rounded-[1.5rem] p-5 md:flex-row md:items-end md:justify-between md:p-6" style={{background:"linear-gradient(135deg,#171118,#2b0b13 50%,#111216)",border:"1px solid rgba(200,16,46,.26)"}}>
      <div><div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-white/40"><FileText className="h-4 w-4"/> Avaliações</div><h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Provas</h1><p className="mt-1 text-sm text-white/50">{isAdmin?"Crie, publique e acompanhe provas.":"Realize as provas publicadas para seu setor."}</p></div>
      {isAdmin&&<button onClick={()=>navigate({to:"/provas-criar"})} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#C8102E] px-4 text-sm font-bold text-white md:w-auto"><PlusCircle className="h-4 w-4"/> Nova prova</button>}
    </div>

    {exams.length===0?<Card className="p-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 opacity-30" style={{color:"var(--text-4)"}}/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>{isAdmin?"Nenhuma prova cadastrada.":"Nenhuma prova publicada disponível para seu setor."}</p></Card>:<div className="space-y-3">{exams.map((exam:Exam)=><Card key={exam.id} className="overflow-hidden"><div className="h-[3px]" style={{background:exam.status==="Publicada"?"#10b981":"#f59e0b"}}/><div className="p-4 md:p-5"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-bold" style={{color:"var(--text-1)"}}>{exam.title}</h3><span className="text-[10px] font-black" style={{color:exam.status==="Publicada"?"#10b981":"#f59e0b"}}>{exam.status}</span></div>{exam.description&&<p className="mt-2 break-words text-sm" style={{color:"var(--text-3)"}}>{exam.description}</p>}<div className="mt-3 flex flex-wrap gap-2"><Chip>{exam.exam_type}</Chip><Chip>{exam.questions.length} questões</Chip><Chip>Mín. {exam.min_approval_pct}%</Chip><Chip><Target className="mr-1 inline h-3 w-3"/>{exam.target_sector}</Chip><Chip><Calendar className="mr-1 inline h-3 w-3"/>{fmtDate(exam.scheduled_date)}</Chip></div></div><div className="flex w-full flex-wrap gap-2 md:w-auto md:shrink-0">{isAdmin?<><Link to="/provas-criar" search={{id:exam.id}} className="inline-flex h-9 flex-1 items-center justify-center rounded-lg px-3 text-xs font-bold md:flex-none" style={{border:"1px solid var(--border)",color:"var(--text-2)"}}>Editar</Link><button onClick={()=>toggle.mutate({id:exam.id,status:exam.status==="Publicada"?"Rascunho":"Publicada"})} disabled={toggle.isPending} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold disabled:opacity-50 md:flex-none" style={{border:"1px solid var(--border)",color:"var(--text-2)"}}>{exam.status==="Publicada"?<Undo2 className="h-3.5 w-3.5"/>:<Send className="h-3.5 w-3.5"/>}{exam.status==="Publicada"?"Despublicar":"Publicar"}</button><button onClick={()=>setToDelete(exam.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500" style={{border:"1px solid var(--border)"}}><Trash2 className="h-4 w-4"/></button></>:<button onClick={()=>navigate({to:"/prova-realizar",search:{id:exam.id}})} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#C8102E] px-4 text-sm font-bold text-white md:w-auto"><PlayCircle className="h-4 w-4"/> Realizar prova</button>}</div></div></div></Card>)}</div>}

    <AlertDialog open={!!toDelete} onOpenChange={(o)=>!o&&setToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir prova?</AlertDialogTitle><AlertDialogDescription>As tentativas relacionadas também serão removidas. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-[#C8102E] hover:bg-[#A00D24]" onClick={()=>toDelete&&remove.mutate(toDelete)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}
