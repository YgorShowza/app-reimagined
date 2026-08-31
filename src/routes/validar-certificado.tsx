import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Search, CheckCircle2, XCircle, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateCertificateCode, type CertificateValidation } from "@/lib/certificates";

export const Route = createFileRoute("/validar-certificado")({
  head: () => ({
    meta: [
      { title: "Validar Certificado · SEGEMPAT" },
      { name: "description", content: "Validação pública de certificados emitidos pelo SEGEMPAT." },
    ],
  }),
  component: ValidateCertificatePage,
});

function ValidateCertificatePage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertificateValidation | null | undefined>(undefined);
  const [error, setError] = useState("");

  const validate = async () => {
    const normalized = code.trim();
    if (!normalized) return;
    setLoading(true);
    setError("");
    try {
      setResult(await validateCertificateCode(normalized));
    } catch (err) {
      setResult(undefined);
      setError(err instanceof Error ? err.message : "Não foi possível validar o certificado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-xl space-y-5">
        <section className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--accent-soft)", border: "1px solid rgba(200,16,46,.2)" }}>
            <ShieldCheck className="w-7 h-7" style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="mt-4 text-2xl md:text-3xl font-black" style={{ color: "var(--text-1)" }}>Validar Certificado</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-4)" }}>Informe o código impresso no certificado SEGEMPAT.</p>
        </section>

        <section className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
          <label className="text-[10px] font-black uppercase tracking-[.15em]" style={{ color: "var(--text-4)" }}>Código de verificação</label>
          <div className="mt-2 flex gap-2">
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => event.key === "Enter" && validate()}
              placeholder="SEG-XXXXXXXXXXXX"
              className="font-mono uppercase"
              autoComplete="off"
            />
            <Button onClick={validate} disabled={loading || !code.trim()} className="bg-[#C8102E] hover:bg-[#A00D24] text-white">
              <Search className="w-4 h-4 mr-2" /> {loading ? "Validando..." : "Validar"}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </section>

        {result === null && (
          <section className="rounded-2xl p-6 text-center" style={{ background: "var(--bg-surface)", border: "1px solid rgba(239,68,68,.28)" }}>
            <XCircle className="w-10 h-10 mx-auto text-red-500" />
            <h2 className="mt-3 font-black" style={{ color: "var(--text-1)" }}>Certificado não encontrado</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>Confira o código informado e tente novamente.</p>
          </section>
        )}

        {result && (
          <section className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: `1px solid ${result.is_valid ? "rgba(16,185,129,.3)" : "rgba(239,68,68,.3)"}`, boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
            <div className="h-1" style={{ background: result.is_valid ? "#10b981" : "#ef4444" }} />
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: result.is_valid ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)" }}>
                  {result.is_valid ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[.15em] font-black" style={{ color: result.is_valid ? "#10b981" : "#ef4444" }}>{result.is_valid ? "Certificado válido" : "Certificado revogado"}</p>
                  <h2 className="mt-1 text-lg font-black" style={{ color: "var(--text-1)" }}>{result.employee_name}</h2>
                  <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>{result.exam_title}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background: "var(--bg-surface-2)" }}>
                  <p className="text-[9px] uppercase font-black" style={{ color: "var(--text-4)" }}>Nota</p>
                  <p className="mt-1 font-black" style={{ color: "var(--text-1)" }}>{result.score}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: "var(--bg-surface-2)" }}>
                  <p className="text-[9px] uppercase font-black" style={{ color: "var(--text-4)" }}>Emissão</p>
                  <p className="mt-1 font-black" style={{ color: "var(--text-1)" }}>{new Date(result.issued_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: "var(--text-4)" }}>
                <Award className="w-4 h-4" /> Código <strong className="font-mono" style={{ color: "var(--text-2)" }}>{result.verification_code}</strong>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
