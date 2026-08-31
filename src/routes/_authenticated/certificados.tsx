import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Printer, CheckCircle2, ShieldCheck, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listMyCertificates, type CertificateRecord } from "@/lib/certificates";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/certificados")({
  head: () => ({ meta: [{ title: "Certificados · SEGEMPAT" }] }),
  component: CertificatesPage,
});

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>{children}</section>;
}

function CertificatesPage() {
  const certificates = useQuery({ queryKey: ["my-certificates"], queryFn: listMyCertificates });

  if (certificates.isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  }

  const rows = certificates.data ?? [];
  const valid = rows.filter((certificate) => !certificate.revoked);

  const printCertificate = (certificate: CertificateRecord) => {
    const win = window.open("", "_blank", "width=1050,height=760");
    if (!win) return;
    const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] ?? char));
    const date = new Date(certificate.issued_at).toLocaleDateString("pt-BR");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Certificado ${escape(certificate.verification_code)}</title><style>
      @page{size:landscape;margin:8mm}body{font-family:Arial,sans-serif;margin:0;background:#f3f4f6;color:#171118}.page{width:100%;min-height:650px;background:#fff;border:12px solid #171118;box-sizing:border-box;padding:64px 76px;text-align:center;position:relative}.line{height:4px;background:#C8102E;width:120px;margin:22px auto}.brand{font-size:13px;letter-spacing:4px;color:#777;font-weight:700}.title{font-size:42px;margin:16px 0;color:#C8102E;letter-spacing:2px}.name{font-size:38px;font-weight:800;margin:30px 0 12px}.course{font-size:23px;font-weight:700;margin:18px 0}.meta{margin-top:34px;display:flex;justify-content:center;gap:45px;color:#555;font-size:14px}.verify{margin:48px auto 0;border:1px solid #ddd;border-radius:12px;max-width:660px;padding:15px;font-size:12px;color:#666}.code{font-family:monospace;font-weight:800;color:#171118;letter-spacing:1px}.seal{position:absolute;right:58px;bottom:42px;border:3px solid #C8102E;color:#C8102E;border-radius:50%;width:92px;height:92px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}@media print{body{background:#fff}.page{min-height:690px}}
    </style></head><body><div class="page"><div class="brand">EMPAT · SEGURANÇA PORTUÁRIA</div><h1 class="title">CERTIFICADO</h1><div class="line"></div><p>Certificamos que</p><div class="name">${escape(certificate.employee_name)}</div><p>concluiu com aproveitamento a avaliação</p><div class="course">${escape(certificate.exam_title)}</div><div class="meta"><span>Nota: <strong>${escape(certificate.score)}</strong></span><span>Emissão: <strong>${date}</strong></span></div><div class="verify">Autenticidade verificável no SEGEMPAT pelo código<br><span class="code">${escape(certificate.verification_code)}</span></div><div class="seal">SEGEMPAT</div></div><script>window.onload=()=>window.print()<\/script></body></html>`);
    win.document.close();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <div className="rounded-[1.5rem] p-5 md:p-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40"><Award className="w-4 h-4" /> Reconhecimento verificável</div>
          <h1 className="mt-2 text-2xl md:text-3xl font-black text-white">Certificados</h1>
          <p className="mt-1 text-sm text-white/50">Cada aprovação gera um certificado com código único de autenticidade.</p>
        </div>
        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
          <Link to="/validar-certificado"><ShieldCheck className="w-4 h-4 mr-2" /> Validar código</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4"><p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>Certificados válidos</p><p className="mt-2 text-2xl font-black text-emerald-500">{valid.length}</p></Card>
        <Card className="p-4"><p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>Emitidos</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{rows.length}</p></Card>
      </div>

      {!rows.length ? (
        <Card className="p-10 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto opacity-30" style={{ color: "var(--text-4)" }} />
          <p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Nenhum certificado disponível ainda.</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>Os certificados são emitidos automaticamente após aprovação.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map((certificate) => (
            <Card key={certificate.id} className="overflow-hidden">
              <div className="h-1" style={{ background: certificate.revoked ? "#ef4444" : "#10b981" }} />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: certificate.revoked ? "rgba(239,68,68,.1)" : "rgba(16,185,129,.1)" }}>
                    <Award className={`w-5 h-5 ${certificate.revoked ? "text-red-500" : "text-emerald-500"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold" style={{ color: "var(--text-1)" }}>{certificate.exam_title}</p>
                      <span className="text-[9px] font-black" style={{ color: certificate.revoked ? "#ef4444" : "#10b981" }}>{certificate.revoked ? "REVOGADO" : "VÁLIDO"}</span>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Emitido em {new Date(certificate.issued_at).toLocaleDateString("pt-BR")} · Nota {certificate.score}</p>
                    <button
                      type="button"
                      className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold"
                      style={{ color: "var(--text-3)" }}
                      onClick={() => navigator.clipboard.writeText(certificate.verification_code).then(() => toast.success("Código copiado"))}
                    >
                      {certificate.verification_code} <Copy className="w-3 h-3" />
                    </button>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" disabled={certificate.revoked} onClick={() => printCertificate(certificate)}><Printer className="w-3.5 h-3.5 mr-2" /> Imprimir certificado</Button>
                      <Button asChild variant="ghost" size="sm"><Link to="/validar-certificado">Verificar</Link></Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
