import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, CheckCircle2, Clock3, Copy, RefreshCw, ShieldCheck, FileBadge2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listAvailableExams, listMyAttempts } from "@/lib/exams";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/certificados")({ head:()=>({meta:[{title:"Certificados · SEGEMPAT"}]}), component:CertificatesPage });

function Card({children,className=""}:{children:React.ReactNode;className?:string}){return <div className={`rounded-2xl ${className}`} style={{background:"var(--bg-surface)",border:"1px solid var(--border)",boxShadow:"var(--shadow-card, var(--shadow-md))"}}>{children}</div>}
function Metric({label,value,icon:Icon,accent,sub}:{label:string;value:number;icon:typeof Award;accent:string;sub:string}){return <Card className="relative overflow-hidden p-4"><div className="absolute left-0 top-0 h-[3px] w-full" style={{background:accent}}/><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em]" style={{color:"var(--text-4)"}}>{label}</p><p className="mt-2 text-3xl font-black" style={{color:"var(--text-1)"}}>{value}</p><p className="mt-1 text-[11px] font-semibold" style={{color:accent}}>{sub}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{background:`${accent}12`,border:`1px solid ${accent}30`}}><Icon className="h-4 w-4" style={{color:accent}}/></div></div></Card>}

function localDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Maceio" });
}

function localDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Maceio" });
}

function CertificatesPage(){
  const exams=useQuery({queryKey:["available-exams-certificates"],queryFn:listAvailableExams});
  const attempts=useQuery({queryKey:["my-cert-attempts"],queryFn:listMyAttempts});

  if(exams.isLoading||attempts.isLoading)return <Loading/>;
  if(exams.isError||attempts.isError)return <Card className="p-8 text-center"><p className="font-bold" style={{color:"var(--text-1)"}}>Não foi possível carregar seus certificados.</p><Button variant="outline" className="mt-4" onClick={()=>{exams.refetch();attempts.refetch();}}><RefreshCw className="mr-2 h-4 w-4"/> Tentar novamente</Button></Card>;

  const allAttempts=attempts.data??[];
  const approved=allAttempts.filter(a=>a.passed);
  const issued=approved.filter(a=>a.signature_agreed&&!!a.signature_path&&!!a.signed_at);
  const pendingSignature=approved.filter(a=>!(a.signature_agreed&&a.signature_path&&a.signed_at));
  const examMap=new Map((exams.data??[]).map(e=>[e.id,e]));

  const copyCode=async(code?:string|null)=>{if(!code)return;await navigator.clipboard.writeText(code);toast.success("Código copiado");};

  return <div className="mx-auto max-w-5xl space-y-5 pb-10">
    <section className="relative overflow-hidden rounded-[1.75rem] p-5 md:p-6" style={{background:"linear-gradient(135deg,#171117 0%,#310912 55%,#160f14 100%)",border:"1px solid rgba(200,16,46,.28)",boxShadow:"0 12px 38px rgba(80,0,18,.16)"}}><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full" style={{background:"radial-gradient(circle,rgba(200,16,46,.25),transparent 68%)"}}/><div className="relative"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em]" style={{color:"rgba(255,255,255,.44)"}}><Award className="h-4 w-4"/> Reconhecimento formal</div><h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">Meus Certificados de Aptidão</h1><p className="mt-1 text-sm" style={{color:"rgba(255,255,255,.52)"}}>Consulte suas aprovações formalizadas e os respectivos códigos de validação.</p></div></section>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Metric label="Formalizados" value={issued.length} icon={FileBadge2} accent="#10b981" sub="aptidões registradas"/><Metric label="Aguardando assinatura" value={pendingSignature.length} icon={Clock3} accent="#f59e0b" sub="aprovações pendentes"/><Metric label="Tentativas" value={allAttempts.length} icon={History} accent="#3b82f6" sub="histórico de avaliações"/></div>

    <Card className="p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500"/><div><p className="font-bold" style={{color:"var(--text-1)"}}>Emissão controlada pela Inspetoria</p><p className="mt-1 text-sm leading-relaxed" style={{color:"var(--text-4)"}}>O operador acompanha aqui a situação e o código de validação. A emissão, impressão, salvamento e entrega do documento formal são realizados pela Inspetoria de Segurança Portuária.</p></div></div></Card>

    {pendingSignature.length>0&&<Card className="p-4"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"/><div><p className="font-bold" style={{color:"var(--text-1)"}}>Há aprovação aguardando formalização</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>Conclua a assinatura eletrônica da prova para que a Inspetoria possa emitir o Certificado de Aptidão.</p></div></div></Card>}

    {issued.length===0?<Card className="p-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 opacity-30" style={{color:"var(--text-4)"}}/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>Nenhum certificado formalizado.</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>Após aprovação e assinatura eletrônica, o registro aparecerá aqui e ficará disponível à Inspetoria para emissão.</p></Card>:<div className="grid gap-3 md:grid-cols-2">{issued.map(a=>{const exam=examMap.get(a.exam_id);return <Card key={a.id} className="relative overflow-hidden p-5"><div className="absolute bottom-0 left-0 top-0 w-[3px] bg-emerald-500"/><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{background:"rgba(16,185,129,.1)",border:"1px solid rgba(16,185,129,.18)"}}><ShieldCheck className="h-5 w-5 text-emerald-500"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="break-words font-black" style={{color:"var(--text-1)"}}>{exam?.title||"Avaliação SEGEMPAT"}</p><span className="rounded-full px-2 py-0.5 text-[9px] font-black text-emerald-500" style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.18)"}}>FORMALIZADO</span></div><p className="mt-1 text-xs" style={{color:"var(--text-4)"}}>Aprovado em {localDate(a.finished_at)} · Nota {a.score}</p><p className="mt-1 text-xs font-semibold text-emerald-500">Assinatura registrada em {localDateTime(a.signed_at!)}</p>{a.certificate_code&&<div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{background:"rgba(16,185,129,.07)",border:"1px dashed rgba(16,185,129,.30)"}}><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.1em]" style={{color:"var(--text-4)"}}>Código de validação</p><p className="break-all font-mono text-[11px] font-black text-emerald-500">{a.certificate_code}</p></div><button type="button" onClick={()=>copyCode(a.certificate_code)} aria-label="Copiar código" className="shrink-0 rounded-lg p-2" style={{color:"var(--text-3)",background:"var(--bg-surface-2)"}}><Copy className="h-3.5 w-3.5"/></button></div>}<p className="mt-3 text-[10px] font-semibold" style={{color:"var(--text-4)"}}>Documento formal disponível para emissão pela Inspetoria.</p></div></div></Card>})}</div>}
  </div>
}

function Loading(){return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>}
