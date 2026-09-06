import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, ShieldCheck } from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { getAdminExamAttemptEvidence, type ExamAttemptEvidence } from "@/lib/exams";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { toast } from "sonner";

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

function loadLogoDataUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = LOGO_URL;
  });
}

function drawHeader(doc: jsPDF, logoDataUrl: string | null, subtitle: string) {
  doc.setDrawColor(184, 145, 47);
  doc.setLineWidth(0.8);
  doc.rect(8, 8, 281, 194);
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", 18, 16, 38, 22, undefined, "FAST"); } catch { /* fallback text below */ }
  }
  if (!logoDataUrl) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 16, 46);
    doc.setFontSize(21);
    doc.text("EMPAT", 18, 31);
  }
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(25);
  doc.text("SEG", 66, 29);
  doc.setTextColor(200, 16, 46);
  doc.text("EMPAT", 91, 29);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text(subtitle, 66, 36);
  doc.setDrawColor(200, 16, 46);
  doc.setLineWidth(0.9);
  doc.line(18, 43, 279, 43);
}

function field(doc: jsPDF, label: string, value: string, x: number, y: number, width = 105, accent = false) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(107, 114, 128);
  doc.text(label.toUpperCase(), x, y);
  doc.setFontSize(11.5);
  doc.setTextColor(accent ? 7 : 17, accent ? 132 : 24, accent ? 79 : 39);
  const lines = doc.splitTextToSize(value || "—", width);
  doc.text(lines, x, y + 6);
}

function buildCertificatePdf(ev: ExamAttemptEvidence, logoDataUrl: string | null) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const status = ev.passed ? "APTO" : "NÃO APTO";

  drawHeader(doc, logoDataUrl, "SEGURANÇA PORTUÁRIA · GESTÃO, OPERAÇÕES E DESEMPENHO");
  doc.setFont("times", "bold");
  doc.setFontSize(27);
  doc.setTextColor(17, 24, 39);
  doc.text("CERTIFICADO DE", 148.5, 61, { align: "center" });
  doc.setTextColor(200, 16, 46);
  doc.text("APTIDÃO", 148.5, 73, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(55, 65, 81);
  const lead = `A EMPAT, por meio do sistema SEGEMPAT, certifica que o colaborador abaixo identificado foi avaliado e considerado ${status} para a atividade descrita, conforme o resultado registrado no sistema.`;
  doc.text(doc.splitTextToSize(lead, 225), 148.5, 84, { align: "center" });

  doc.setDrawColor(215, 199, 155);
  doc.roundedRect(23, 103, 251, 55, 4, 4);
  doc.line(148.5, 103, 148.5, 158);
  field(doc, "Nome", ev.employee_name, 32, 114, 105);
  field(doc, "Matrícula", ev.matricula || "—", 32, 132, 105);
  field(doc, "Setor", ev.sector, 32, 148, 105);
  field(doc, "Resultado", status, 158, 114, 103, true);
  field(doc, "Nota", Number(ev.score).toFixed(1), 158, 132, 103);
  field(doc, "Data da avaliação", fmtDate(ev.finished_at), 158, 148, 103);
  field(doc, "Tema / Avaliação", ev.exam_title, 32, 166, 105);
  field(doc, "Código de validação", ev.certificate_code || "—", 158, 166, 103);

  doc.setDrawColor(154, 116, 34);
  doc.line(32, 185, 138, 185);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(ev.signature_name || ev.employee_name, 85, 190, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Assinatura eletrônica registrada em ${fmtDateTime(ev.signed_at)}`, 85, 195, { align: "center" });
  doc.setDrawColor(184, 145, 47);
  doc.circle(244, 183, 14);
  doc.circle(244, 183, 11.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(138, 104, 29);
  doc.text(["SEGEMPAT", "APTIDÃO", "REGISTRADA"], 244, 179, { align: "center" });

  doc.addPage("a4", "landscape");
  drawHeader(doc, logoDataUrl, "SEGURANÇA PORTUÁRIA · EVIDÊNCIA DOCUMENTAL");
  doc.setFont("times", "bold");
  doc.setFontSize(23);
  doc.setTextColor(17, 24, 39);
  doc.text("EVIDÊNCIA DA", 148.5, 59, { align: "center" });
  doc.setTextColor(200, 16, 46);
  doc.text("AVALIAÇÃO", 148.5, 69, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("ANEXO DO CERTIFICADO DE APTIDÃO · PÁGINA 2", 148.5, 76, { align: "center" });

  const metrics = [
    ["QUESTÕES", String(ev.total_questions)],
    ["ACERTOS", String(ev.correct_count)],
    ["APROVEITAMENTO", `${ev.accuracy_pct}%`],
    ["SITUAÇÃO", status],
  ];
  metrics.forEach(([label, value], index) => {
    const x = 25 + index * 63;
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(x, 83, 56, 20, 3, 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(107, 114, 128);
    doc.text(label, x + 28, 90, { align: "center" });
    doc.setFontSize(13);
    doc.setTextColor(index === 3 ? 7 : 17, index === 3 ? 132 : 24, index === 3 ? 79 : 39);
    doc.text(value, x + 28, 99, { align: "center" });
  });

  let y = 111;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(75, 85, 99);
  doc.text("Nº", 20, y);
  doc.text("QUESTÃO", 31, y);
  doc.text("RESPOSTA REGISTRADA", 151, y);
  doc.text("RESULTADO", 257, y);
  doc.setDrawColor(209, 213, 219);
  doc.line(18, y + 3, 279, y + 3);
  y += 9;

  ev.questions.forEach((q) => {
    const questionLines = doc.splitTextToSize(q.statement, 112);
    const answerLines = doc.splitTextToSize(q.answer, 95);
    const rowHeight = Math.max(questionLines.length, answerLines.length) * 4.2 + 7;
    if (y + rowHeight > 188) {
      doc.addPage("a4", "landscape");
      drawHeader(doc, logoDataUrl, "SEGURANÇA PORTUÁRIA · EVIDÊNCIA DOCUMENTAL · CONTINUAÇÃO");
      y = 55;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);
    doc.setTextColor(31, 41, 55);
    doc.text(String(q.order), 20, y + 4);
    doc.text(questionLines, 31, y + 4);
    doc.text(answerLines, 151, y + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(q.correct ? 7 : 200, q.correct ? 132 : 16, q.correct ? 79 : 46);
    doc.text(q.correct ? "Correta" : "Incorreta", 257, y + 4);
    doc.setDrawColor(229, 231, 235);
    doc.line(18, y + rowHeight, 279, y + rowHeight);
    y += rowHeight;
  });

  if (y < 181) {
    doc.setDrawColor(215, 199, 155);
    doc.roundedRect(18, y + 5, 261, 13, 2, 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(75, 85, 99);
    const note = `Identificação: ${ev.employee_name} · Matrícula ${ev.matricula || "—"} · ${ev.sector} · Avaliação: ${ev.exam_title} · Código: ${ev.certificate_code || "—"}. Esta página complementa o Certificado de Aptidão e constitui registro evidenciário das respostas armazenadas pelo SEGEMPAT.`;
    doc.text(doc.splitTextToSize(note, 248), 23, y + 11);
  }
  return doc;
}

async function savePdf(doc: jsPDF, ev: ExamAttemptEvidence) {
  const filename = `SEGEMPAT_Certificado_${(ev.matricula || "colaborador").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  const blob = doc.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };

  if (navigator.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
    try {
      await navigator.share({ title: "Certificado de Aptidão · SEGEMPAT", text: "Certificado de Aptidão e evidência da avaliação.", files: [file] });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function CertificateAdminPage() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const evidence = useQuery({
    queryKey: ["admin-certificate-evidence", attemptId],
    queryFn: () => getAdminExamAttemptEvidence(attemptId),
    enabled: Boolean(user?.isAdmin),
  });
  const logo = useQuery({ queryKey: ["certificate-logo-data"], queryFn: loadLogoDataUrl, enabled: Boolean(user?.isAdmin), staleTime: Infinity });

  if (userLoading || evidence.isLoading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  if (!user?.isAdmin) return <div className="mx-auto max-w-xl rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><ShieldCheck className="mx-auto h-10 w-10" style={{ color: "var(--accent)" }} /><h1 className="mt-3 text-lg font-black" style={{ color: "var(--text-1)" }}>Acesso restrito</h1><p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>A emissão do certificado é exclusiva da Inspetoria.</p></div>;
  if (evidence.isError || !evidence.data) return <div className="mx-auto max-w-xl rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><p className="font-bold" style={{ color: "var(--text-1)" }}>Não foi possível carregar o certificado.</p><Button variant="outline" className="mt-4" onClick={() => evidence.refetch()}>Tentar novamente</Button></div>;

  const ev = evidence.data;
  const status = ev.passed ? "APTO" : "NÃO APTO";
  const handleSavePdf = async () => {
    setSaving(true);
    try {
      const doc = buildCertificatePdf(ev, logo.data ?? null);
      await savePdf(doc, ev);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF");
    } finally {
      setSaving(false);
    }
  };

  return <div className="certificate-screen mx-auto max-w-[1180px] space-y-4 pb-10">
    <div className="no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
      <Button variant="outline" onClick={() => navigate({ to: "/assinaturas-provas" })}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
      <div className="text-center"><p className="text-sm font-black" style={{ color: "var(--text-1)" }}>Certificado de Aptidão</p><p className="text-xs" style={{ color: "var(--text-4)" }}>PDF real com certificado e evidência da avaliação</p></div>
      <Button onClick={handleSavePdf} disabled={saving} className="font-bold"><Download className="mr-2 h-4 w-4" /> {saving ? "Gerando PDF..." : "Salvar / Compartilhar PDF"}</Button>
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
    `}</style>
  </div>;
}

function Field({ label, value, accent = false, mono = false }: { label: string; value: string; accent?: boolean; mono?: boolean }) { return <div className="field"><div className="label">{label}</div><div className={`value ${accent ? "apt" : ""} ${mono ? "mono" : ""}`}>{value}</div></div>; }
function Metric({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) { return <div className="metric">{label}<strong className={accent ? "apt" : ""}>{value}</strong></div>; }
