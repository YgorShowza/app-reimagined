import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Award, CheckCircle2, Clock3, ExternalLink, FileDown, FileSignature, RefreshCw, Search, ShieldCheck, XCircle } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getSignatureUrl, listExamSignatureEvidence, type ExamSignatureEvidence } from "@/lib/exams";
import { listCertificateRecords } from "@/lib/certificate-records";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function fmt(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Maceio", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ExamSignaturesWorkspace() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["exam-signature-evidence"], queryFn: listExamSignatureEvidence, enabled: Boolean(user?.isAdmin), staleTime: 60_000 });
  const certificatesQuery = useQuery({ queryKey: ["certificate-validation-records"], queryFn: listCertificateRecords, enabled: Boolean(user?.isAdmin), staleTime: 30_000 });
  const rows: ExamSignatureEvidence[] = query.data ?? [];
  const certificateByAttempt = useMemo(() => new Map((certificatesQuery.data ?? []).map((record) => [record.id, record])), [certificatesQuery.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.employee_name.toLowerCase().includes(q) || r.matricula?.toLowerCase().includes(q) || r.exam_title.toLowerCase().includes(q) || r.certificate_code?.toLowerCase().includes(q));
  }, [rows, search]);

  if (userLoading) return <Loading />;
  if (!user?.isAdmin) return <div className="mx-auto max-w-xl rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><ShieldCheck className="mx-auto h-10 w-10" style={{ color: "var(--accent)" }} /><h1 className="mt-3 text-lg font-black" style={{ color: "var(--text-1)" }}>Acesso restrito</h1><p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>Certificados e evidências são exclusivos da Inspetoria.</p></div>;

  const openCertificate = (row: ExamSignatureEvidence) => {
    const record = certificateByAttempt.get(row.id);
    if (!row.passed) { toast.error("Certificado de aptidão disponível somente para avaliação aprovada."); return; }
    if (!(row.signature_path && row.signed_at)) { toast.error("A assinatura eletrônica precisa estar registrada antes da emissão."); return; }
    if (record?.certificate_revoked) { toast.error("Este certificado foi revogado e não pode ser emitido como válido."); return; }
    if (!record?.formally_issued) { toast.error("O registro formal do certificado ainda não está disponível."); return; }
    window.location.assign(`/certificado/${encodeURIComponent(row.id)}`);
  };

  const openSignature = async (signaturePath: string) => {
    try {
      const url = await getSignatureUrl(signaturePath, 300);
      window.location.assign(url);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir a assinatura");
    }
  };

  const signed = rows.filter((r) => !!r.signature_path && !!r.signed_at).length;
  const pending = rows.length - signed;
  const approved = rows.filter((r) => r.passed).length;
  const revoked = rows.filter((r) => certificateByAttempt.get(r.id)?.certificate_revoked).length;

  return <div className="mx-auto max-w-6xl space-y-5 pb-10">
    <section className="relative overflow-hidden rounded-[1.6rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118 0%,#2b0b13 50%,#111216 100%)", border: "1px solid rgba(200,16,46,.26)", boxShadow: "0 10px 34px rgba(200,16,46,.12)" }}>
      <div className="absolute -right-16 -top-20 h-60 w-60 rounded-full" style={{ background: "radial-gradient(circle,rgba(200,16,46,.22),transparent 70%)" }} />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-white/40"><FileSignature className="h-4 w-4" /> Evidência documental</div><h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Certificados e Assinaturas</h1><p className="mt-1 text-sm text-white/50">A Inspetoria consulta as evidências, controla a validade e gera o certificado de aptidão quando o registro formal está vigente.</p></div><div className="rounded-xl px-3 py-2 text-xs font-bold text-white/70" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)" }}>{signed} assinada{signed === 1 ? "" : "s"} de {rows.length}</div></div>
    </section>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Assinadas" value={signed} icon={CheckCircle2} color="#10b981" /><Metric label="Pendentes" value={pending} icon={Clock3} color="#f59e0b" /><Metric label="Aprovações" value={approved} icon={Award} color="#60a5fa" /><Metric label="Revogados" value={revoked} icon={XCircle} color="#ef4444" /></div>

    <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-4)" }} /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Colaborador, matrícula, prova ou código" className="pl-9" /></div></section>

    {query.isLoading || certificatesQuery.isLoading ? <Loading /> : query.isError || certificatesQuery.isError ? <section className="rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><AlertTriangle className="mx-auto h-8 w-8 text-amber-500" /><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Não foi possível carregar os certificados e assinaturas.</p><Button variant="outline" className="mt-4" onClick={() => { query.refetch(); certificatesQuery.refetch(); }}><RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente</Button></section> : filtered.length === 0 ? <section className="rounded-2xl p-10 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><FileSignature className="mx-auto h-10 w-10 opacity-25" /><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Nenhum registro encontrado.</p></section> : <div className="space-y-3">{filtered.map((row) => {
      const isSigned = !!row.signature_path && !!row.signed_at;
      const certificateRecord = certificateByAttempt.get(row.id);
      const isRevoked = Boolean(certificateRecord?.certificate_revoked);
      const canIssue = Boolean(row.passed && isSigned && certificateRecord?.formally_issued && !isRevoked);
      const accent = isRevoked ? "#ef4444" : canIssue ? "#10b981" : "#f59e0b";
      return <article key={row.id} className="overflow-hidden rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}><div className="h-[3px]" style={{ background: accent }} /><div className="p-4 md:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-black" style={{ color: "var(--text-1)" }}>{row.employee_name}</p><span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={isSigned ? { background: "rgba(16,185,129,.10)", color: "#10b981" } : { background: "rgba(245,158,11,.10)", color: "#f59e0b" }}>{isSigned ? "ASSINADO" : "SEM ASSINATURA"}</span><span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: row.passed ? "rgba(96,165,250,.10)" : "rgba(239,68,68,.08)", color: row.passed ? "#60a5fa" : "#ef4444" }}>{row.passed ? "APROVADO" : "NÃO APROVADO"}</span>{canIssue && <span className="rounded-full px-2 py-0.5 text-[10px] font-black text-emerald-500" style={{ background: "rgba(16,185,129,.08)" }}>CERTIFICADO VÁLIDO</span>}{isRevoked && <span className="rounded-full px-2 py-0.5 text-[10px] font-black text-red-500" style={{ background: "rgba(239,68,68,.08)" }}>CERTIFICADO REVOGADO</span>}</div><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Mat. {row.matricula ?? "—"} · {row.employee_sector ?? "—"} · {row.exam_title} · Nota {Number(row.score).toFixed(1)}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-4)" }}><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> Prova: {fmt(row.finished_at)}</span>{isSigned && <span className="inline-flex items-center gap-1 text-emerald-500"><CheckCircle2 className="h-3 w-3" /> Assinada por {row.signature_name || row.employee_name} em {fmt(row.signed_at)}</span>}{isRevoked && <span className="inline-flex items-center gap-1 text-red-500"><XCircle className="h-3 w-3" /> Revogado em {fmt(certificateRecord?.revoked_at)}{certificateRecord?.revoked_reason ? ` · ${certificateRecord.revoked_reason}` : ""}</span>}</div>{row.certificate_code && <div className="mt-3 inline-flex rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-black" style={{ background: isRevoked ? "rgba(239,68,68,.07)" : canIssue ? "rgba(16,185,129,.07)" : "rgba(245,158,11,.07)", color: accent, border: `1px dashed ${isRevoked ? "rgba(239,68,68,.28)" : canIssue ? "rgba(16,185,129,.28)" : "rgba(245,158,11,.28)"}` }}>{row.certificate_code}</div>}</div><div className="flex shrink-0 flex-col gap-2 sm:min-w-48">{canIssue && <Button className="gap-2 font-bold" onClick={() => openCertificate(row)}><FileDown className="h-4 w-4" /> Abrir certificado</Button>}{isSigned && <Button variant="outline" className="gap-2" onClick={() => row.signature_path && openSignature(row.signature_path)}><ExternalLink className="h-4 w-4" /> Ver assinatura</Button>}</div></div></div></article>;
    })}</div>}
  </div>;
}

function Metric({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof CheckCircle2; color: string }) { return <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: "var(--text-4)" }}>{label}</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}18`, color }}><Icon className="h-4 w-4" /></div></div></section>; }
function Loading() { return <div className="flex justify-center py-14"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>; }
