import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, CheckCircle2, Clock3, Copy, Printer, RefreshCw, ShieldCheck, FileBadge2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listAvailableExams, listMyAttempts } from "@/lib/exams";
import { getMyExamAttemptEvidence } from "@/lib/exam-evidence";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { toast } from "sonner";

const LOGO_URL = "https://media.base44.com/images/public/6a1117d573bbf85981b1abee/8271ac857_IMG_9226.png";

export const Route = createFileRoute("/_authenticated/certificados")({ head:()=>({meta:[{title:"Certificados · SEGEMPAT"}]}), component:CertificatesPage });

function Card({children,className=""}:{children:React.ReactNode;className?:string}){return <div className={`rounded-2xl ${className}`} style={{background:"var(--bg-surface)",border:"1px solid var(--border)",boxShadow:"var(--shadow-card, var(--shadow-md))"}}>{children}</div>}
function Metric({label,value,icon:Icon,accent,sub}:{label:string;value:number;icon:typeof Award;accent:string;sub:string}){return <Card className="relative overflow-hidden p-4"><div className="absolute left-0 top-0 h-[3px] w-full" style={{background:accent}}/><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em]" style={{color:"var(--text-4)"}}>{label}</p><p className="mt-2 text-3xl font-black" style={{color:"var(--text-1)"}}>{value}</p><p className="mt-1 text-[11px] font-semibold" style={{color:accent}}>{sub}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{background:`${accent}12`,border:`1px solid ${accent}30`}}><Icon className="h-4 w-4" style={{color:accent}}/></div></div></Card>}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function localDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Maceio" });
}

function localDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Maceio" });
}

function CertificatesPage(){
  const {data:user}=useCurrentUser();
  const exams=useQuery({queryKey:["available-exams-certificates"],queryFn:listAvailableExams});
  const attempts=useQuery({queryKey:["my-cert-attempts"],queryFn:listMyAttempts});

  if(exams.isLoading||attempts.isLoading)return <Loading/>;
  if(exams.isError||attempts.isError)return <Card className="p-8 text-center"><p className="font-bold" style={{color:"var(--text-1)"}}>Não foi possível carregar seus certificados.</p><Button variant="outline" className="mt-4" onClick={()=>{exams.refetch();attempts.refetch();}}><RefreshCw className="mr-2 h-4 w-4"/> Tentar novamente</Button></Card>;

  const allAttempts=attempts.data??[];
  const approved=allAttempts.filter(a=>a.passed);
  const issued=approved.filter(a=>a.signature_agreed&&!!a.signature_path&&!!a.signed_at);
  const pendingSignature=approved.filter(a=>!(a.signature_agreed&&a.signature_path&&a.signed_at));
  const examMap=new Map((exams.data??[]).map(e=>[e.id,e]));

  const printCertificate=async(attempt:any)=>{
    if(!(attempt.signature_agreed&&attempt.signature_path&&attempt.signed_at)){toast.error("A assinatura eletrônica precisa ser concluída antes da emissão do certificado.");return;}
    const w=window.open("","_blank","width=1180,height=820");
    if(!w){toast.error("O navegador bloqueou a janela de impressão.");return;}
    w.document.write("<p style='font-family:Arial;padding:24px'>Preparando certificado e evidência...</p>");
    try {
      const evidence=await getMyExamAttemptEvidence(attempt.id);
      const exam=examMap.get(attempt.exam_id);
      const name=escapeHtml(evidence.employee_name||user?.nome||"COLABORADOR");
      const matricula=escapeHtml(evidence.matricula||user?.matricula||"—");
      const sector=escapeHtml(evidence.sector||user?.setor||"—");
      const title=escapeHtml(evidence.exam_title||exam?.title||"Avaliação SEGEMPAT");
      const code=escapeHtml(evidence.certificate_code||attempt.certificate_code||"—");
      const date=localDate(evidence.finished_at||attempt.finished_at);
      const signedDate=localDateTime(evidence.signed_at||attempt.signed_at);
      const score=Number(evidence.score??attempt.score??0).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:2});
      const questions=evidence.questions.map(q=>`<tr><td>${q.order}</td><td>${escapeHtml(q.statement)}</td><td>${escapeHtml(q.answer)}</td><td class="${q.correct?'ok':'bad'}">${q.correct?'✓ Correta':'✕ Incorreta'}</td></tr>`).join("");
      const logo=escapeHtml(LOGO_URL);
      w.document.open();
      w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Certificado de Aptidão · SEGEMPAT</title><style>
@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;background:#e7e7e7;color:#111827;font-family:Arial,Helvetica,sans-serif}.page{width:297mm;height:210mm;margin:0 auto;background:#fff;position:relative;overflow:hidden;padding:15mm 18mm 13mm;border:2.2mm solid #171118}.page+ .page{page-break-before:always}.page:before{content:"";position:absolute;right:-32mm;top:-42mm;width:95mm;height:95mm;background:linear-gradient(135deg,#7d0718,#C8102E);transform:rotate(15deg);z-index:0}.page:after{content:"";position:absolute;left:-38mm;bottom:-55mm;width:105mm;height:85mm;background:linear-gradient(135deg,#C8102E,#590812);transform:rotate(12deg);z-index:0}.content{position:relative;z-index:1}.top{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #d5b46b;padding-bottom:5mm}.brand{display:flex;align-items:center;gap:5mm}.brand img{height:18mm;width:auto}.brand-name{font-weight:900;font-size:24px;letter-spacing:-1px}.brand-name span{color:#C8102E}.sub{font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:2.2px}.title{text-align:center;margin:8mm 0 3mm;font-family:Georgia,serif;font-size:30px;letter-spacing:.5px}.title b{color:#A80D28}.kicker{text-align:center;color:#A80D28;font-size:10px;font-weight:800;letter-spacing:3px}.lead{text-align:center;max-width:235mm;margin:5mm auto 6mm;font-family:Georgia,serif;font-size:14px;line-height:1.45}.panel{border:1px solid #e2d5c4;border-radius:5mm;padding:5mm 6mm;background:linear-gradient(180deg,#fff,#fcfaf7)}.grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm 12mm}.item label{display:block;color:#7b8493;text-transform:uppercase;font-size:8px;font-weight:800;letter-spacing:1.2px}.item strong{display:block;margin-top:1mm;font-size:14px}.apt{color:#078c5a!important}.footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:8mm}.signature{width:86mm;text-align:center}.signline{border-bottom:1px solid #b78c2e;height:10mm;font-family:cursive;font-size:23px}.siglabel{font-size:8px;font-weight:800;letter-spacing:1.7px;margin-top:2mm}.seal{width:27mm;height:27mm;border-radius:50%;border:2mm double #b78c2e;display:flex;align-items:center;justify-content:center;text-align:center;color:#8b6518;font-size:9px;font-weight:900;background:#fff8df}.validation{width:78mm;border:1px dashed #a8b2bf;border-radius:3mm;padding:3mm}.validation small{color:#6b7280}.code{font-family:monospace;font-weight:900;color:#0b8a5a;margin-top:1mm;word-break:break-all}.evidence-title{font-family:Georgia,serif;font-size:27px;text-align:center;margin:6mm 0 1mm}.evidence-title b{color:#A80D28}.mini{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:5mm 0}.stat{border:1px solid #e2d5c4;border-radius:3mm;padding:3mm;text-align:center}.stat label{display:block;color:#7b8493;text-transform:uppercase;font-size:7px;font-weight:800}.stat strong{font-size:18px}.questions{width:100%;border-collapse:collapse;margin-top:4mm;font-size:9px}.questions th{background:#f0f2f5;text-transform:uppercase;font-size:7px;letter-spacing:.7px}.questions th,.questions td{border:1px solid #d9dde3;padding:2.3mm;vertical-align:top}.questions th:first-child,.questions td:first-child{width:10mm;text-align:center}.questions th:last-child,.questions td:last-child{width:26mm}.ok{color:#078c5a;font-weight:900}.bad{color:#C8102E;font-weight:900}.note{margin-top:4mm;padding:3mm 4mm;border:1px solid #d5b46b;border-radius:3mm;font-family:Georgia,serif;font-size:9px}.watermark{position:absolute;right:12mm;bottom:14mm;font-size:70px;font-weight:900;color:rgba(200,16,46,.035);transform:rotate(-8deg)}@media print{body{background:#fff}.page{margin:0}}
</style></head><body>
<section class="page"><div class="watermark">SEGEMPAT</div><div class="content"><div class="top"><div class="brand"><img src="${logo}" alt="EMPAT"><div><div class="brand-name">SEG<span>EMPAT</span></div><div class="sub">Segurança Portuária · Gestão de Competência</div></div></div><div class="sub">EMPAT · Porto de Maceió</div></div><div class="title">CERTIFICADO DE <b>APTIDÃO</b></div><div class="kicker">EVIDÊNCIA FORMAL DE COMPETÊNCIA</div><p class="lead">A EMPAT, por meio do sistema <strong>SEGEMPAT</strong>, certifica que o colaborador abaixo foi avaliado e considerado <strong>APTO</strong> para a atividade indicada, conforme o resultado registrado e a assinatura eletrônica da avaliação.</p><div class="panel grid"><div class="item"><label>Nome</label><strong>${name}</strong></div><div class="item"><label>Resultado</label><strong class="apt">APTO</strong></div><div class="item"><label>Matrícula</label><strong>${matricula}</strong></div><div class="item"><label>Nota</label><strong>${score}</strong></div><div class="item"><label>Setor</label><strong>${sector}</strong></div><div class="item"><label>Data da avaliação</label><strong>${date}</strong></div><div class="item"><label>Tema / avaliação</label><strong>${title}</strong></div><div class="item"><label>Assinatura eletrônica</label><strong>Registrada em ${escapeHtml(signedDate)}</strong></div></div><div class="footer"><div class="signature"><div class="signline">${escapeHtml(evidence.signature_name||name)}</div><div class="siglabel">ASSINATURA ELETRÔNICA REGISTRADA</div><div class="sub">EMPAT · Sistema SEGEMPAT</div></div><div class="seal">APTO<br>SEGEMPAT</div><div class="validation"><small>Código de validação</small><div class="code">${code}</div><small>Valide este documento no módulo de validação de certificados do SEGEMPAT.</small></div></div></div></section>
<section class="page"><div class="watermark">EVIDÊNCIA</div><div class="content"><div class="top"><div class="brand"><img src="${logo}" alt="EMPAT"><div><div class="brand-name">SEG<span>EMPAT</span></div><div class="sub">Segurança Portuária · Registro Evidenciário</div></div></div><div class="sub">Página 2 de 2</div></div><div class="evidence-title">EVIDÊNCIA DA <b>AVALIAÇÃO</b></div><div class="kicker">ANEXO DO CERTIFICADO DE APTIDÃO</div><div class="mini"><div class="stat"><label>Questões</label><strong>${evidence.total_questions}</strong></div><div class="stat"><label>Acertos</label><strong>${evidence.correct_count}</strong></div><div class="stat"><label>Aproveitamento</label><strong>${evidence.accuracy_pct}%</strong></div><div class="stat"><label>Situação</label><strong class="apt">${evidence.passed?'APTO':'NÃO APTO'}</strong></div></div><div class="panel grid"><div class="item"><label>Colaborador</label><strong>${name} · Mat. ${matricula}</strong></div><div class="item"><label>Setor</label><strong>${sector}</strong></div><div class="item"><label>Tema / avaliação</label><strong>${title}</strong></div><div class="item"><label>Nota final</label><strong>${score}</strong></div></div><table class="questions"><thead><tr><th>Nº</th><th>Questão aplicada</th><th>Resposta registrada</th><th>Resultado</th></tr></thead><tbody>${questions||'<tr><td colspan="4">Nenhuma questão registrada.</td></tr>'}</tbody></table><div class="note">Esta página integra o Certificado de Aptidão e registra as questões e respostas da avaliação utilizada para sustentar a conclusão de competência do colaborador. Código de validação: <strong>${code}</strong>.</div><div class="footer"><div class="signature"><div class="signline">${escapeHtml(evidence.signature_name||name)}</div><div class="siglabel">ASSINATURA ELETRÔNICA REGISTRADA</div></div><div class="validation"><small>Avaliação realizada em</small><div><strong>${date}</strong></div><small>Emissão vinculada ao registro eletrônico da tentativa.</small></div></div></div></section>
<script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
      w.document.close();
    } catch(error){
      console.error(error);w.close();toast.error("Não foi possível montar a evidência da avaliação.");
    }
  };

  const copyCode=async(code?:string|null)=>{if(!code)return;await navigator.clipboard.writeText(code);toast.success("Código copiado");};

  return <div className="mx-auto max-w-5xl space-y-5 pb-10">
    <section className="relative overflow-hidden rounded-[1.75rem] p-5 md:p-6" style={{background:"linear-gradient(135deg,#171117 0%,#310912 55%,#160f14 100%)",border:"1px solid rgba(200,16,46,.28)",boxShadow:"0 12px 38px rgba(80,0,18,.16)"}}><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full" style={{background:"radial-gradient(circle,rgba(200,16,46,.25),transparent 68%)"}}/><div className="relative"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em]" style={{color:"rgba(255,255,255,.44)"}}><Award className="h-4 w-4"/> Reconhecimento formal</div><h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">Certificados de Aptidão</h1><p className="mt-1 text-sm" style={{color:"rgba(255,255,255,.52)"}}>Certificado formal + evidência das questões e respostas em duas páginas.</p></div></section>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Metric label="Emitidos" value={issued.length} icon={FileBadge2} accent="#10b981" sub="certificados formais válidos"/><Metric label="Aguardando assinatura" value={pendingSignature.length} icon={Clock3} accent="#f59e0b" sub="aprovações pendentes"/><Metric label="Tentativas" value={allAttempts.length} icon={History} accent="#3b82f6" sub="histórico de avaliações"/></div>

    {pendingSignature.length>0&&<Card className="p-4"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"/><div><p className="font-bold" style={{color:"var(--text-1)"}}>Há aprovação aguardando formalização</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>Conclua a assinatura eletrônica da prova para liberar o Certificado de Aptidão e sua evidência técnica.</p></div></div></Card>}

    {issued.length===0?<Card className="p-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 opacity-30" style={{color:"var(--text-4)"}}/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>Nenhum certificado formal disponível.</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>O certificado é liberado após aprovação e assinatura eletrônica.</p></Card>:<div className="grid gap-3 md:grid-cols-2">{issued.map(a=>{const exam=examMap.get(a.exam_id);return <Card key={a.id} className="relative overflow-hidden p-5"><div className="absolute bottom-0 left-0 top-0 w-[3px] bg-emerald-500"/><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{background:"rgba(16,185,129,.1)",border:"1px solid rgba(16,185,129,.18)"}}><ShieldCheck className="h-5 w-5 text-emerald-500"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="break-words font-black" style={{color:"var(--text-1)"}}>{exam?.title||"Avaliação SEGEMPAT"}</p><span className="rounded-full px-2 py-0.5 text-[9px] font-black text-emerald-500" style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.18)"}}>APTO · 2 PÁGINAS</span></div><p className="mt-1 text-xs" style={{color:"var(--text-4)"}}>Aprovado em {localDate(a.finished_at)} · Nota {a.score}</p><p className="mt-1 text-xs font-semibold text-emerald-500">Assinatura registrada em {localDateTime(a.signed_at!)}</p>{a.certificate_code&&<div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{background:"rgba(16,185,129,.07)",border:"1px dashed rgba(16,185,129,.30)"}}><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.1em]" style={{color:"var(--text-4)"}}>Código de validação</p><p className="break-all font-mono text-[11px] font-black text-emerald-500">{a.certificate_code}</p></div><button type="button" onClick={()=>copyCode(a.certificate_code)} aria-label="Copiar código" className="shrink-0 rounded-lg p-2" style={{color:"var(--text-3)",background:"var(--bg-surface-2)"}}><Copy className="h-3.5 w-3.5"/></button></div>}<Button variant="outline" size="sm" className="mt-4 w-full font-bold sm:w-auto" onClick={()=>void printCertificate(a)}><Printer className="mr-2 h-3.5 w-3.5"/> Certificado + evidência</Button></div></div></Card>})}</div>}
  </div>
}

function Loading(){return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>}
