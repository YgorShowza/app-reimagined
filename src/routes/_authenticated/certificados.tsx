import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, CheckCircle2, Clock3, Copy, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listExams, listMyAttempts } from "@/lib/exams";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/certificados")({ head:()=>({meta:[{title:"Certificados · SEGEMPAT"}]}), component:CertificatesPage });

function Card({children,className=""}:{children:React.ReactNode;className?:string}){return <div className={`rounded-2xl ${className}`} style={{background:"var(--bg-surface)",border:"1px solid var(--border)",boxShadow:"var(--shadow-card, var(--shadow-md))"}}>{children}</div>}

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
    <div className="rounded-[1.5rem] p-5 md:p-6" style={{background:"linear-gradient(135deg,#171118,#2b0b13 50%,#111216)",border:"1px solid rgba(200,16,46,.26)"}}><div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40"><Award className="w-4 h-4"/> Reconhecimento</div><h1 className="mt-2 text-2xl md:text-3xl font-black text-white">Certificados</h1><p className="mt-1 text-sm text-white/50">A emissão formal exige aprovação e assinatura eletrônica registrada.</p></div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Card className="p-4"><p className="text-[10px] uppercase font-black" style={{color:"var(--text-4)"}}>Emitidos</p><p className="mt-2 text-2xl font-black text-emerald-500">{issued.length}</p></Card><Card className="p-4"><p className="text-[10px] uppercase font-black" style={{color:"var(--text-4)"}}>Aguardando assinatura</p><p className="mt-2 text-2xl font-black text-amber-500">{pendingSignature.length}</p></Card><Card className="p-4"><p className="text-[10px] uppercase font-black" style={{color:"var(--text-4)"}}>Tentativas</p><p className="mt-2 text-2xl font-black" style={{color:"var(--text-1)"}}>{allAttempts.length}</p></Card></div>

    {pendingSignature.length>0&&<Card className="p-4"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"/><div><p className="font-bold" style={{color:"var(--text-1)"}}>Há aprovação aguardando formalização</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>Conclua a assinatura eletrônica da prova para liberar a emissão do certificado.</p></div></div></Card>}

    {issued.length===0?<Card className="p-10 text-center"><CheckCircle2 className="w-10 h-10 mx-auto opacity-30" style={{color:"var(--text-4)"}}/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>Nenhum certificado formal disponível.</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>O certificado é liberado após aprovação e assinatura eletrônica.</p></Card>:<div className="grid gap-3 md:grid-cols-2">{issued.map(a=>{const exam=examMap.get(a.exam_id);return <Card key={a.id} className="p-5"><div className="flex items-start gap-3"><div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{background:"rgba(16,185,129,.1)"}}><Award className="w-5 h-5 text-emerald-500"/></div><div className="min-w-0 flex-1"><p className="break-words font-bold" style={{color:"var(--text-1)"}}>{exam?.title||"Avaliação SEGEMPAT"}</p><p className="mt-1 text-xs" style={{color:"var(--text-4)"}}>Aprovado em {new Date(a.finished_at).toLocaleDateString("pt-BR")} · Nota {a.score}</p><p className="mt-1 text-xs text-emerald-500">Assinatura registrada em {new Date(a.signed_at!).toLocaleString("pt-BR",{timeZone:"America/Maceio"})}</p>{a.certificate_code&&<div className="mt-3 flex items-center gap-2 rounded-lg px-2.5 py-2" style={{background:"rgba(16,185,129,.07)",border:"1px dashed rgba(16,185,129,.28)"}}><div className="min-w-0 flex-1"><p className="text-[9px] uppercase font-black" style={{color:"var(--text-4)"}}>Código de validação</p><p className="break-all font-mono text-[11px] font-black text-emerald-500">{a.certificate_code}</p></div><button type="button" onClick={()=>copyCode(a.certificate_code)} aria-label="Copiar código" className="shrink-0 p-1.5 rounded-md" style={{color:"var(--text-3)"}}><Copy className="w-3.5 h-3.5"/></button></div>}<Button variant="outline" size="sm" className="mt-4 w-full sm:w-auto" onClick={()=>printCertificate(a)}><Printer className="w-3.5 h-3.5 mr-2"/> Imprimir certificado</Button></div></div></Card>})}</div>}
  </div>
}

function Loading(){return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>}
