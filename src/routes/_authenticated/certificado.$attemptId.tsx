import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminExamAttemptEvidence } from "@/lib/exams";
import { listCertificateRecords } from "@/lib/certificate-records";
import { openAptitudeCertificate } from "@/lib/certificate-document";
import { useCurrentUser } from "@/lib/useCurrentUser";

const LOGO_URL = "https://media.base44.com/images/public/6a1117d573bbf85981b1abee/8271ac857_IMG_9226.png";

export const Route = createFileRoute("/_authenticated/certificado/$attemptId")({
  head: () => ({ meta: [{ title: "Certificado de Capacitação · SEGEMPAT" }] }),
  component: CertificateAdminPage,
});

function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "America/Maceio",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Maceio",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CertificateAdminPage() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const evidence = useQuery({
    queryKey: ["admin-certificate-evidence", attemptId],
    queryFn: () => getAdminExamAttemptEvidence(attemptId),
    enabled: Boolean(user?.isAdmin),
  });
  const certificateRecords = useQuery({
    queryKey: ["certificate-validation-records"],
    queryFn: listCertificateRecords,
    enabled: Boolean(user?.isAdmin),
    staleTime: 30_000,
  });

  if (userLoading || evidence.isLoading || certificateRecords.isLoading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  }

  if (!user?.isAdmin) {
    return <div className="mx-auto max-w-xl rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><ShieldCheck className="mx-auto h-10 w-10" style={{ color: "var(--accent)" }} /><h1 className="mt-3 text-lg font-black" style={{ color: "var(--text-1)" }}>Acesso restrito</h1><p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>A emissão do certificado é exclusiva da Inspetoria.</p></div>;
  }

  if (evidence.isError || certificateRecords.isError || !evidence.data) {
    return <div className="mx-auto max-w-xl rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><p className="font-bold" style={{ color: "var(--text-1)" }}>Não foi possível carregar o certificado.</p><Button variant="outline" className="mt-4" onClick={() => { evidence.refetch(); certificateRecords.refetch(); }}>Tentar novamente</Button></div>;
  }

  const ev = evidence.data;
  const certificateRecord = (certificateRecords.data ?? []).find((row) => row.id === attemptId);
  const certificateBlocked = !ev.passed || !certificateRecord?.formally_issued || certificateRecord.certificate_revoked;

  if (certificateBlocked) {
    const revoked = Boolean(certificateRecord?.certificate_revoked);
    return <div className="mx-auto max-w-xl rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: `1px solid ${revoked ? "rgba(239,68,68,.30)" : "var(--border)"}` }}><XCircle className={`mx-auto h-10 w-10 ${revoked ? "text-red-500" : "text-amber-500"}`} /><h1 className="mt-3 text-lg font-black" style={{ color: "var(--text-1)" }}>{revoked ? "Certificado revogado" : "Certificado ainda não disponível"}</h1><p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>{revoked ? `Este registro foi revogado${certificateRecord?.revoked_at ? ` em ${fmtDateTime(certificateRecord.revoked_at)}` : ""}${certificateRecord?.revoked_reason ? `. Motivo: ${certificateRecord.revoked_reason}` : ""}. A emissão está bloqueada e o registro permanece apenas para rastreabilidade.` : "A emissão exige avaliação aprovada, assinatura eletrônica e registro formal válido. Acesso direto à página não contorna essas regras."}</p><Button variant="outline" className="mt-5" onClick={() => navigate({ to: "/assinaturas-provas" })}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos certificados</Button></div>;
  }

  const minApproval = Number(ev.min_approval_pct ?? 70);
  const examType = ev.exam_type || certificateRecord.exam_type || "Avaliação teórica";
  const program = String(ev.exam_description ?? "").trim();
  const programLines = program.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const handlePrint = () => {
    try {
      openAptitudeCertificate(ev);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível abrir o certificado para impressão.");
    }
  };

  return <div className="certificate-screen mx-auto max-w-[1000px] space-y-5 pb-12">
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
      <Button variant="outline" onClick={() => navigate({ to: "/assinaturas-provas" })}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
      <div className="text-center"><p className="text-sm font-black" style={{ color: "var(--text-1)" }}>Certificado de Capacitação</p><p className="text-xs" style={{ color: "var(--text-4)" }}>Documento oficial em duas páginas · conteúdo sem gabarito individual</p></div>
      <Button onClick={handlePrint} className="gap-2 bg-[#C8102E] text-white hover:bg-[#A00D24]"><Printer className="h-4 w-4" /> Imprimir / salvar PDF</Button>
    </div>

    <section className="certificate-page certificate-cover">
      <div className="topbar" />
      <div className="water">EMPAT</div>
      <div className="document-content">
        <CertificateHeader eyebrow="Certificado de Capacitação Interna" />
        <h1>CERTIFICADO</h1><div className="goldline" />
        <p className="lead">A Empresa Alagoana de Terminais, por meio da Unidade de Segurança Portuária, certifica que o profissional abaixo identificado concluiu com aproveitamento a atividade de capacitação interna registrada no Sistema SEGEMPAT.</p>
        <div className="person"><div className="person-name">{ev.employee_name}</div><div className="person-meta">MATRÍCULA {ev.matricula || "—"} · SETOR {ev.sector}</div></div>
        <div className="activity"><div className="label">Atividade de capacitação</div><div className="activity-title">{ev.exam_title}</div></div>
        <div className="fields"><PreviewField label="Modalidade" value={examType} /><PreviewField label="Data de conclusão" value={fmtDate(ev.finished_at)} /><PreviewField label="Unidade emissora" value="Unidade de Segurança Portuária" /><PreviewField label="Registro" value="SEGEMPAT · Porto de Maceió" /></div>
        <div className="conclusion"><div><div className="label">Conclusão</div><div className="approved">APROVADO</div></div><div className="criterion">Critério mínimo de aprovação<strong>{minApproval}% de aproveitamento</strong></div></div>
        <div className="validation"><div className="validation-block"><div className="label">Validação institucional</div><div className="validation-line" /><div className="institution">UNIDADE DE SEGURANÇA PORTUÁRIA</div><div className="institution-sub">Registro eletrônico emitido pelo SEGEMPAT</div></div><div className="validation-block"><div className="label">Autenticidade eletrônica</div><div className="code-box"><div className="code">{ev.certificate_code}</div><div className="code-help">Código verificável na área de Validação de Certificados do SEGEMPAT. A validade também depende de o registro não ter sido revogado.</div></div></div></div>
      </div>
      <DocumentFooter page="Documento 1 de 2" />
    </section>

    <section className="certificate-page certificate-annex">
      <div className="topbar" />
      <div className="water">SEGEMPAT</div>
      <div className="document-content">
        <CertificateHeader eyebrow="Anexo Técnico ao Certificado" />
        <h2>CONTEÚDO PROGRAMÁTICO</h2><div className="annex">ANEXO INTEGRANTE DO CERTIFICADO {ev.certificate_code}</div>
        <div className="identity"><PreviewField label="Profissional" value={ev.employee_name} compact /><PreviewField label="Matrícula / setor" value={`${ev.matricula || "—"} · ${ev.sector}`} compact /><PreviewField label="Atividade" value={ev.exam_title} compact /></div>
        <div className="section"><div className="section-head">01 · Conteúdo da atividade</div><div className="program">{programLines.length > 1 ? <ul>{programLines.map((line, index) => <li key={index}>{line.replace(/^[-•]\s*/, "")}</li>)}</ul> : <p className={!program ? "program-empty" : ""}>{program || "Conteúdo programático conforme descrição da atividade registrada no SEGEMPAT."}</p>}</div><p className="no-answer-key">Este anexo técnico não reproduz gabarito, banco de questões nem respostas individuais do avaliado.</p></div>
        <div className="section"><div className="section-head">02 · Critérios e registro de aproveitamento</div><div className="metrics"><Metric label="Modalidade" value={examType} /><Metric label="Resultado final" value={`${Number(ev.score).toFixed(1)} / 10,0`} /><Metric label="Mínimo exigido" value={`${minApproval}%`} /><Metric label="Situação" value="APROVADO" accent /><Metric label="Conclusão" value={fmtDate(ev.finished_at)} /><Metric label="Aproveitamento" value={`${ev.accuracy_pct}%`} /></div></div>
        <div className="section"><div className="section-head">03 · Registro da capacitação</div><div className="record"><PreviewField label="Unidade emissora" value="Unidade de Segurança Portuária" compact /><PreviewField label="Código do certificado" value={ev.certificate_code || "—"} compact mono /><PreviewField label="Assinatura eletrônica do avaliado" value={ev.signature_name || ev.employee_name} compact /><PreviewField label="Registro da assinatura" value={fmtDateTime(ev.signed_at)} compact /></div><div className="evidence-note"><strong>Validade documental:</strong> este anexo integra o certificado identificado pelo mesmo código único. A situação vigente deve ser consultada no SEGEMPAT para identificar eventual revogação.</div></div>
      </div>
      <DocumentFooter page="Documento 2 de 2" />
    </section>

    <style>{`
      .certificate-page{position:relative;width:min(100%,794px);min-height:1123px;margin:0 auto;background:#fff;color:#171A1F;padding:64px 68px 76px;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,.12)}.certificate-page:before{content:"";position:absolute;inset:34px;border:1px solid #d6d8dc;pointer-events:none}.certificate-page:after{content:"";position:absolute;inset:45px;border:1.5px solid #C8102E;pointer-events:none}.topbar{position:absolute;left:0;right:0;top:0;height:23px;background:#C8102E}.document-content{position:relative;z-index:1}.water{position:absolute;right:-28px;bottom:130px;color:rgba(23,26,31,.035);font-family:Georgia,serif;font-size:82px;font-weight:900;letter-spacing:-5px;transform:rotate(-90deg);pointer-events:none}.brand{text-align:center;padding-bottom:20px}.brand img{display:block;height:82px;max-width:210px;object-fit:contain;margin:0 auto 7px}.company{font-size:10px;font-weight:900;letter-spacing:.5px}.unit{margin-top:2px;font-size:8px;color:#60656F;letter-spacing:.6px;text-transform:uppercase}.eyebrow{margin-top:7px;color:#C8102E;font-size:8px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase}.certificate-page h1,.certificate-page h2{text-align:center;font-family:Georgia,'Times New Roman',serif}.certificate-page h1{font-size:38px;letter-spacing:1.2px;margin:14px 0 7px}.certificate-page h2{font-size:31px;margin:12px 0 4px}.goldline{width:210px;height:1px;background:#A68549;margin:0 auto 22px}.lead{max-width:595px;margin:0 auto;text-align:center;color:#51565f;font-size:13px;line-height:1.65}.person{text-align:center;margin:26px auto 22px}.person-name{font-size:28px;font-weight:900}.person-meta{margin-top:7px;color:#C8102E;font-size:10px;font-weight:900;letter-spacing:.5px}.activity{text-align:center;margin:22px auto}.label{font-size:8px;color:#747982;font-weight:900;letter-spacing:1px;text-transform:uppercase}.activity-title{margin-top:7px;font-size:17px;font-weight:900}.fields{display:grid;grid-template-columns:1fr 1fr;gap:21px 38px;margin:26px 26px 0}.field{padding-bottom:10px;border-bottom:1px solid #E7E9ED}.value{margin-top:7px;font-size:12px;font-weight:900}.conclusion{margin:34px 26px 0;background:#F6F7F9;border:1px solid #ECEDEF;border-radius:14px;padding:18px 22px;display:flex;justify-content:space-between;align-items:center}.approved{font-size:23px;font-weight:900;color:#C8102E;margin-top:5px}.criterion{text-align:right;color:#60656F;font-size:9px;line-height:1.45}.criterion strong{display:block;color:#171A1F;font-size:12px;margin-top:4px}.validation{display:grid;grid-template-columns:1fr 1fr;gap:44px;margin:38px 26px 0;padding-top:20px;border-top:1px solid #E7E9ED}.validation-block{min-height:112px}.validation-line{height:59px;border-bottom:1px solid #A68549;margin-bottom:7px}.institution{font-size:9px;font-weight:900;text-align:center}.institution-sub{text-align:center;color:#60656F;font-size:8px;line-height:1.4}.code-box{min-height:112px;border:1px dashed #C8102E;border-radius:11px;padding:14px;background:#fffafa}.code{font-family:'Courier New',monospace;font-weight:900;font-size:11px;color:#C8102E;word-break:break-all;margin:7px 0}.code-help{font-size:8px;color:#60656F;line-height:1.45}.document-footer{position:absolute;z-index:2;left:68px;right:68px;bottom:53px;text-align:center;color:#737780;font-size:7px}.document-footer strong{color:#171A1F}.annex{text-align:center;color:#C8102E;font-size:8px;font-weight:900;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:26px}.identity{display:grid;grid-template-columns:1.4fr .8fr 1fr;gap:15px;background:#F6F7F9;border-radius:11px;padding:15px 18px;margin:0 15px 26px}.identity .field,.record .field{border-bottom:0;padding:0}.identity .value,.record .value{font-size:10px}.section{margin:0 15px 26px}.section-head{font-size:9px;color:#C8102E;font-weight:900;letter-spacing:1px;text-transform:uppercase;padding-bottom:9px;border-bottom:1px solid #C8102E}.program{margin-top:15px;color:#343840;font-size:11px;line-height:1.58;padding:0 7px}.program p{margin:0}.program ul{margin:0;padding-left:20px}.program li{margin-bottom:6px}.program-empty{color:#60656F;font-style:italic}.no-answer-key{margin:12px 7px 0;color:#737780;font-size:8px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:15px}.metric{background:#F6F7F9;border-radius:9px;padding:13px}.metric .value{font-size:11px}.metric.accent .value{color:#C8102E}.record{display:grid;grid-template-columns:1fr 1fr;gap:15px 30px;margin-top:15px}.record .field{padding-bottom:9px;border-bottom:1px solid #E7E9ED}.mono .value{font-family:'Courier New',monospace}.evidence-note{margin-top:18px;border-left:3px solid #A68549;padding:8px 0 8px 14px;color:#60656F;font-size:8px;line-height:1.5}@media(max-width:760px){.certificate-page{min-height:0;padding:55px 38px 70px}.certificate-page:before{inset:22px}.certificate-page:after{inset:29px}.brand img{height:62px}.certificate-page h1{font-size:30px}.certificate-page h2{font-size:25px}.lead{font-size:11px}.person-name{font-size:22px}.fields,.validation,.identity,.metrics,.record{grid-template-columns:1fr}.validation{gap:20px}.document-footer{position:static;margin-top:35px}.water{display:none}}
    `}</style>
  </div>;
}

function CertificateHeader({ eyebrow }: { eyebrow: string }) {
  return <header className="brand"><img src={LOGO_URL} alt="EMPAT" /><div className="company">EMPRESA ALAGOANA DE TERMINAIS</div><div className="unit">Unidade de Segurança Portuária · Porto de Maceió - Alagoas</div><div className="eyebrow">{eyebrow}</div></header>;
}

function PreviewField({ label, value, compact = false, mono = false }: { label: string; value: string; compact?: boolean; mono?: boolean }) {
  return <div className={`field ${compact ? "compact" : ""} ${mono ? "mono" : ""}`}><div className="label">{label}</div><div className="value">{value}</div></div>;
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`metric ${accent ? "accent" : ""}`}><div className="label">{label}</div><div className="value">{value}</div></div>;
}

function DocumentFooter({ page }: { page: string }) {
  return <div className="document-footer"><strong>SEGEMPAT</strong> · Gestão • Operações • Desempenho · {page}</div>;
}
