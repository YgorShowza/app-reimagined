import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, CheckCircle2, Clock3, Copy, Printer, RefreshCw, ShieldCheck, FileBadge2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listExams, listMyAttempts } from "@/lib/exams";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/certificados")({ head:()=>({meta:[{title:"Certificados · SEGEMPAT"}]}), component:CertificatesPage });

function Card({children,className=""}:{children:React.ReactNode;className?:string}){return <div className={`rounded-2xl ${className}`} style={{background:"var(--bg-surface)",border:"1px solid var(--border)",boxShadow:"var(--shadow-card, var(--shadow-md))"}}>{children}</div>}
function Metric({label,value,icon:Icon,accent,sub}:{label:string;value:number;icon:typeof Award;accent:string;sub:string}){return <Card className="relative overflow-hidden p-4"><div className="absolute left-0 top-0 h-[3px] w-full" style={{background:accent}}/><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em]" style={{color:"var(--text-4)"}}>{label}</p><p className="mt-2 text-3xl font-black" style={{color:"var(--text-1)"}}>{value}</p><p className="mt-1 text-[11px] font-semibold" style={{color:accent}}>{sub}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{background:`${accent}12`,border:`1px solid ${accent}30`}}><Icon className="h-4 w-4" style={{color:accent}}/></div></div></Card>}

function CertificatesPage(){
  const {data:user}=useCurrentUser();
  const exams=useQuery({queryKey:["exams"],queryFn:listExams});
  const attempts=useQuery({queryKey:["my-cert-attempts"],queryFn:listMyAttempts});

  if(exams.isLoading||attempts.isLoading)return <Loading/>;
  if(exams.isError||attempts.isError)return <Card className="p-8 text-center"><p className="font-bold" style={{color:"var(--text-1)"}}>Não foi possível carregar seus certificados.</p><Button variant="outline" className="mt-4" onClick={()=>{exams.refetch();attempts.refetch();}}><RefreshCw className="mr-2 h-4 w-4"/> Tentar novamente</Button></Card>;

  const allAttempts=attempts.data??[];
  const approved=allAttempts.filter(a=>a.passed);
  const issued=approved.filter(a=>a.signature_agreed&&!!a.signature_path&&!!a.signed_at);
  const pendingSignature=approved.filter(a=>!(a.signature_agreed&&a.signature_path&&a.signed_at));
  const examMap=new Map((exams.data??[]).map(e=>[e.id,e]));

  const printCertificate=(attempt:any)=>{
    if(!(attempt.signature_agreed&&attempt.signature_path&&attempt.signed_at)){toast.error("A assinatura eletrônica precisa ser concluída antes da emissão do certificado.");return;}
    const exam=examMap.get(attempt.exam_id);const w=window.open("","_blank","width=1000,height=700");if(!w)return;
    const name=(user?.nome||"COLABORADOR").replace(/[<>]/g,"");const title=(exam?.title||"Avaliação SEGEMPAT").replace(/[<>]/g,"");const date=new Date(attempt.finished_at).toLocaleDateString("pt-BR");const signedDate=new Date(attempt.signed_at).toLocaleString("pt-BR",{timeZone:"America/Maceio"});const code=(attempt.certificate_code||"—").replace(/[<>]/g,"");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Certificado SEGEMPAT</title><style>@page{size:A4 landscape;margin:0}body{font-family:Arial,sans-serif;margin:0;background:#f4f4f4}.page{width:1123px;min-height:794px;margin:0 auto;background:white;border:14px solid #171118;box-sizing:border-box;padding:78px;text-align:center;position:relative}.red{color:#C8102E}.small{letter-spacing:4px;color:#666;font-size:13px}.name{font-size:36px;font-weight:800;margin:35px 0 12px}.course{font-size:22px;font-weight:700;margin:18px 0}.footer{margin-top:42px;font-size:13px;color:#666}.code{margin-top:18px;font-family:monospace;font-size:13px;font-weight:700;letter-spacing:1px;color:#16865a}.signed{margin-top:10px;font-size:11px;color:#666}.seal{position:absolute;right:55px;bottom:45px;border:3px solid #C8102E;color:#C8102E;border-radius:50%;width:90px;height:90px;display:flex;align-items:center;justify-content:center;font-weight:800}@media print{body{background:white}.page{margin:0}}</style></head><body><div class="page"><div class="small">EMPAT · SEGURANÇA PORTUÁRIA</div><h1 class="red">CERTIFICADO</h1><p>Certificamos que</p><div class="name">${name}</div><p>concluiu com aproveitamento a avaliação</p><div class="course">${title}</div><p>com nota <strong>${attempt.score}</strong>, em ${date}.</p><div class="code">Código de validação: ${code}</div><div class="signed">Assinatura eletrônica registrada em ${signedDate}</div><div class="footer">SEGEMPAT · Gestão, Operações e Desempenho</div><div class="seal">SEGEMPAT</div></div><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
  };

  const copyCode=async(code?:string|null)=>{if(!code)return;await navigator.clipboard.writeText(code);toast.success("Código copiado");};

  return <div className="mx-auto max-w-5xl space-y-5 pb-10">
    <section className="relative overflow-hidden rounded-[1.75rem] p-5 md:p-6" style={{background:"linear-gradient(135deg,#171117 0%,#310912 55%,#160f14 100%)",border:"1px solid rgba(200,16,46,.28)",boxShadow:"0 12px 38px rgba(80,0,18,.16)"}}><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full" style={{background:"radial-gradient(circle,rgba(200,16,46,.25),transparent 68%)"}}/><div className="relative"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em]" style={{color:"rgba(255,255,255,.44)"}}><Award className="h-4 w-4"/> Reconhecimento formal</div><h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">Certificados</h1><p className="mt-1 text-sm" style={{color:"rgba(255,255,255,.52)"}}>A emissão formal exige aprovação e assinatura eletrônica registrada.</p></div></section>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Metric label="Emitidos" value={issued.length} icon={FileBadge2} accent="#10b981" sub="certificados formais válidos"/><Metric label="Aguardando assinatura" value={pendingSignature.length} icon={Clock3} accent="#f59e0b" sub="aprovações pendentes"/><Metric label="Tentativas" value={allAttempts.length} icon={History} accent="#3b82f6" sub="histórico de avaliações"/></div>

    {pendingSignature.length>0&&<Card className="p-4"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"/><div><p className="font-bold" style={{color:"var(--text-1)"}}>Há aprovação aguardando formalização</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>Conclua a assinatura eletrônica da prova para liberar a emissão do certificado.</p></div></div></Card>}

    {issued.length===0?<Card className="p-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 opacity-30" style={{color:"var(--text-4)"}}/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>Nenhum certificado formal disponível.</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>O certificado é liberado após aprovação e assinatura eletrônica.</p></Card>:<div className="grid gap-3 md:grid-cols-2">{issued.map(a=>{const exam=examMap.get(a.exam_id);return <Card key={a.id} className="relative overflow-hidden p-5"><div className="absolute bottom-0 left-0 top-0 w-[3px] bg-emerald-500"/><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{background:"rgba(16,185,129,.1)",border:"1px solid rgba(16,185,129,.18)"}}><ShieldCheck className="h-5 w-5 text-emerald-500"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="break-words font-black" style={{color:"var(--text-1)"}}>{exam?.title||"Avaliação SEGEMPAT"}</p><span className="rounded-full px-2 py-0.5 text-[9px] font-black text-emerald-500" style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.18)"}}>CERTIFICADO VÁLIDO</span></div><p className="mt-1 text-xs" style={{color:"var(--text-4)"}}>Aprovado em {new Date(a.finished_at).toLocaleDateString("pt-BR")} · Nota {a.score}</p><p className="mt-1 text-xs font-semibold text-emerald-500">Assinatura registrada em {new Date(a.signed_at!).toLocaleString("pt-BR",{timeZone:"America/Maceio"})}</p>{a.certificate_code&&<div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{background:"rgba(16,185,129,.07)",border:"1px dashed rgba(16,185,129,.30)"}}><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.1em]" style={{color:"var(--text-4)"}}>Código de validação</p><p className="break-all font-mono text-[11px] font-black text-emerald-500">{a.certificate_code}</p></div><button type="button" onClick={()=>copyCode(a.certificate_code)} aria-label="Copiar código" className="shrink-0 rounded-lg p-2" style={{color:"var(--text-3)",background:"var(--bg-surface-2)"}}><Copy className="h-3.5 w-3.5"/></button></div>}<Button variant="outline" size="sm" className="mt-4 w-full font-bold sm:w-auto" onClick={()=>printCertificate(a)}><Printer className="mr-2 h-3.5 w-3.5"/> Imprimir certificado</Button></div></div></Card>})}</div>}
  </div>
}

function Loading(){return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>}
