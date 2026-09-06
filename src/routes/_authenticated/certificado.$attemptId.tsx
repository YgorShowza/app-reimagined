import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminExamAttemptEvidence } from "@/lib/exams";
import { useCurrentUser } from "@/lib/useCurrentUser";

const LOGO_URL = "https://media.base44.com/images/public/6a1117d573bbf85981b1abee/8271ac857_IMG_9226.png";

export const Route = createFileRoute("/_authenticated/certificado/$attemptId")({
  head: () => ({ meta: [{ title: "Certificado de Aptidão · SEGEMPAT" }] }),
  component: CertificateAdminPage,
});

function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Maceio" });
}

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Maceio" });
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

  if (userLoading || evidence.isLoading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  if (!user?.isAdmin) return <div className="mx-auto max-w-xl rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><ShieldCheck className="mx-auto h-10 w-10" style={{ color: "var(--accent)" }} /><h1 className="mt-3 text-lg font-black" style={{ color: "var(--text-1)" }}>Acesso restrito</h1><p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>A emissão do certificado é exclusiva da Inspetoria.</p></div>;
  if (evidence.isError || !evidence.data) return <div className="mx-auto max-w-xl rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><p className="font-bold" style={{ color: "var(--text-1)" }}>Não foi possível carregar o certificado.</p><Button variant="outline" className="mt-4" onClick={() => evidence.refetch()}>Tentar novamente</Button></div>;

  const ev = evidence.data;
  const status = ev.passed ? "APTO" : "NÃO APTO";

  return <div className="certificate-screen mx-auto max-w-[1180px] space-y-4 pb-10">
    <div className="no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
      <Button variant="outline" onClick={() => navigate({ to: "/assinaturas-provas" })}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
      <div className="text-center"><p className="text-sm font-black" style={{ color: "var(--text-1)" }}>Certificado de Aptidão</p><p className="text-xs" style={{ color: "var(--text-4)" }}>Use Imprimir / Salvar como PDF no navegador</p></div>
      <Button onClick={() => window.print()} className="font-bold"><Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar PDF</Button>
    </div>

    <section className="print-page certificate-page">
      <div className="brand"><img src={LOGO_URL} alt="EMPAT" /><div><div className="brand-name">SEG<span>EMPAT</span></div><div className="subtitle">Segurança Portuária · Gestão, Operações e Desempenho</div></div></div>
      <h1>CERTIFICADO DE <span>APTIDÃO</span></h1>
      <p className="lead">A EMPAT, por meio do sistema SEGEMPAT, certifica que o colaborador abaixo identificado foi avaliado e considerado <strong>{status}</strong> para a atividade descrita, conforme o resultado registrado no sistema.</p>
      <div className="panel"><div className="col"><Field label="Nome" value={ev.employee_name} /><Field label="Matrícula" value={ev.matricula || "—"} /><Field label="Setor" value={ev.sector} /><Field label="Tema / Avaliação" value={ev.exam_title} /></div><div className="col"><Field label="Resultado" value={status} accent /><Field label="Nota" value={Number(ev.score).toFixed(1)} /><Field label="Data da avaliação" value={fmtDate(ev.finished_at)} /><Field label="Código de validação" value={ev.certificate_code || "—"} mono /></div></div>
      <div className="footer"><div className="sign"><strong>{ev.signature_name || ev.employee_name}</strong><br />Assinatura eletrônica registrada em {fmtDateTime(ev.signed_at)}</div><div className="seal">SEGEMPAT<br />APTIDÃO<br />REGISTRADA</div></div>
      <div className="water">EMPAT</div>
    </section>

    <section className="print-page evidence-page">
      <div className="brand"><img src={LOGO_URL} alt="EMPAT" /><div><div className="brand-name">SEG<span>EMPAT</span></div><div className="subtitle">Segurança Portuária · Evidência documental</div></div></div>
      <h2>EVIDÊNCIA DA <span>AVALIAÇÃO</span></h2><div className="annex">ANEXO DO CERTIFICADO DE APTIDÃO · PÁGINA 2 DE 2</div>
      <div className="summary"><Metric label="Questões" value={ev.total_questions} /><Metric label="Acertos" value={ev.correct_count} /><Metric label="Aproveitamento" value={`${ev.accuracy_pct}%`} /><Metric label="Situação" value={status} accent /></div>
      <div className="table-wrap"><table><thead><tr><th>Nº</th><th>Questão</th><th>Resposta registrada</th><th>Resultado</th></tr></thead><tbody>{ev.questions.map((q) => <tr key={q.id}><td>{q.order}</td><td>{q.statement}</td><td>{q.answer}</td><td className={q.correct ? "ok" : "bad"}>{q.correct ? "Correta" : "Incorreta"}</td></tr>)}</tbody></table></div>
      <div className="note"><strong>Identificação:</strong> {ev.employee_name} · Matrícula {ev.matricula || "—"} · {ev.sector} · <strong>Avaliação:</strong> {ev.exam_title} · <strong>Código:</strong> {ev.certificate_code || "—"}. Esta página complementa o Certificado de Aptidão e constitui registro evidenciário das respostas armazenadas pelo SEGEMPAT.</div>
      <div className="water">SEGEMPAT</div>
    </section>

    <style>{`
      .print-page{position:relative;background:#fff;color:#111827;border:2px solid #b8912f;padding:28px 36px;min-height:720px;overflow:hidden}.brand{display:flex;align-items:center;gap:16px;border-bottom:2px solid #C8102E;padding-bottom:8px}.brand img{height:52px;background:#fff}.brand-name{font-size:30px;font-weight:900}.brand-name span,.print-page h1 span,.print-page h2 span{color:#C8102E}.subtitle{color:#6b7280;font-size:12px;letter-spacing:2px;text-transform:uppercase}.print-page h1,.print-page h2{text-align:center;font-family:Georgia,serif}.print-page h1{margin:18px 0 4px;font-size:38px}.print-page h2{font-size:31px;margin:14px 0 3px}.lead{text-align:center;max-width:920px;margin:0 auto 20px;color:#374151;font-size:15px;line-height:1.55}.panel{display:grid;grid-template-columns:1fr 1fr;border:1px solid #d7c79b;border-radius:16px;overflow:hidden}.col{padding:18px 22px}.col+.col{border-left:1px solid #e5e7eb}.field{margin-bottom:14px}.label{font-size:10px;font-weight:800;letter-spacing:1.3px;color:#6b7280;text-transform:uppercase}.value{font-size:17px;font-weight:800;margin-top:3px}.apt{color:#07844f}.mono{font-family:monospace}.footer{display:flex;justify-content:space-between;align-items:end;margin-top:22px}.sign{width:45%;text-align:center;border-top:1px solid #9a7422;padding-top:6px;font-size:11px}.seal{width:90px;height:90px;border:4px double #b8912f;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;color:#8a681d;font-weight:900;font-size:11px}.annex{text-align:center;color:#C8102E;font-weight:800;letter-spacing:3px;font-size:11px;margin-bottom:14px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.metric{border:1px solid #e5e7eb;border-radius:12px;padding:10px;text-align:center;background:#f9fafb}.metric strong{display:block;font-size:22px;margin-top:4px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #d1d5db;padding:8px;vertical-align:top}th{background:#f3f4f6;text-transform:uppercase;font-size:9px;letter-spacing:.8px}.ok{color:#07844f;font-weight:800}.bad{color:#C8102E;font-weight:800}.note{margin-top:12px;border:1px solid #d7c79b;border-radius:10px;padding:10px;color:#4b5563;font-size:10px}.water{position:absolute;right:18px;bottom:12px;color:#e5e7eb;font-size:54px;font-weight:900;z-index:0;pointer-events:none}@media (max-width:700px){.print-page{padding:18px 16px;min-height:0}.brand-name{font-size:23px}.subtitle{font-size:9px;letter-spacing:1px}.print-page h1{font-size:29px}.panel{grid-template-columns:1fr}.col+.col{border-left:0;border-top:1px solid #e5e7eb}.summary{grid-template-columns:repeat(2,1fr)}.footer{gap:16px}.sign{width:65%}.seal{width:72px;height:72px;font-size:9px}}
      @media print{@page{size:A4 landscape;margin:8mm}body{background:#fff!important}.no-print{display:none!important}.certificate-screen{max-width:none!important;padding:0!important;margin:0!important}.print-page{width:281mm;min-height:194mm;margin:0;page-break-after:always;border:2px solid #b8912f;padding:10mm 13mm}.print-page:last-of-type{page-break-after:auto}.table-wrap{overflow:visible}}
    `}</style>
  </div>;
}

function Field({ label, value, accent = false, mono = false }: { label: string; value: string; accent?: boolean; mono?: boolean }) { return <div className="field"><div className="label">{label}</div><div className={`value ${accent ? "apt" : ""} ${mono ? "mono" : ""}`}>{value}</div></div>; }
function Metric({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) { return <div className="metric">{label}<strong className={accent ? "apt" : ""}>{value}</strong></div>; }
