import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSignature, Search, ShieldCheck, ExternalLink, CheckCircle2, Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getSignatureUrl } from "@/lib/exams";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Row = {
  id: string;
  matricula: string | null;
  score: number;
  passed: boolean;
  certificate_code: string | null;
  signature_path: string | null;
  signature_name: string | null;
  signed_at: string | null;
  finished_at: string;
  exam_title: string;
  employee_name: string;
};

function fmt(value?: string | null) {
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

async function listRows(): Promise<Row[]> {
  const client = supabase as any;
  const [{ data: attempts, error: aErr }, { data: exams, error: eErr }, { data: employees, error: empErr }] = await Promise.all([
    client.from("exam_attempts").select("id, exam_id, matricula, score, passed, certificate_code, signature_path, signature_name, signed_at, finished_at").order("finished_at", { ascending: false }),
    client.from("exams").select("id, title"),
    client.from("employees").select("id, matricula, full_name"),
  ]);
  if (aErr) throw aErr;
  if (eErr) throw eErr;
  if (empErr) throw empErr;

  const examMap = new Map((exams ?? []).map((r: any) => [r.id, r.title]));
  const employeeByMatricula = new Map((employees ?? []).map((r: any) => [r.matricula, r.full_name]));

  return (attempts ?? []).map((r: any) => ({
    ...r,
    exam_title: examMap.get(r.exam_id) ?? "Avaliação",
    employee_name: employeeByMatricula.get(r.matricula) ?? r.signature_name ?? "Colaborador",
  }));
}

export function ExamSignaturesWorkspace() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["exam-signature-evidence"], queryFn: listRows, enabled: Boolean(user?.isAdmin), staleTime: 60_000 });

  const rows = query.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.employee_name.toLowerCase().includes(q) || r.matricula?.toLowerCase().includes(q) || r.exam_title.toLowerCase().includes(q) || r.certificate_code?.toLowerCase().includes(q));
  }, [rows, search]);

  if (userLoading) return <Loading />;
  if (!user?.isAdmin) return <div className="mx-auto max-w-xl rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><ShieldCheck className="mx-auto h-10 w-10" style={{ color: "var(--accent)" }} /><h1 className="mt-3 text-lg font-black" style={{ color: "var(--text-1)" }}>Acesso restrito</h1><p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>Evidências de assinatura são exclusivas da Inspetoria.</p></div>;

  const openSignature = async (path: string) => {
    try {
      const url = await getSignatureUrl(path, 300);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível abrir a assinatura");
    }
  };

  const signed = rows.filter((r) => !!r.signature_path && !!r.signed_at).length;

  return <div className="mx-auto max-w-6xl space-y-5 pb-10">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="flex items-center gap-2"><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(200,16,46,.10)", border: "1px solid rgba(200,16,46,.20)" }}><FileSignature className="h-5 w-5" style={{ color: "#C8102E" }} /></div><div><h1 className="text-xl font-black" style={{ color: "var(--text-1)" }}>Assinaturas de Provas</h1><p className="text-sm" style={{ color: "var(--text-4)" }}>Evidências privadas das avaliações formais realizadas.</p></div></div></div>
      <div className="rounded-xl px-3 py-2 text-xs font-bold" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-3)" }}>{signed} assinada{signed === 1 ? "" : "s"} de {rows.length}</div>
    </header>

    <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-4)" }} /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Colaborador, matrícula, prova ou código" className="pl-9" /></div>

    {query.isLoading ? <Loading /> : query.isError ? <div className="rounded-2xl p-8 text-center text-sm text-red-500" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>Não foi possível carregar as assinaturas.</div> : filtered.length === 0 ? <div className="rounded-2xl p-8 text-center text-sm" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-4)" }}>Nenhum registro encontrado.</div> : <div className="space-y-2">{filtered.map((row) => {
      const isSigned = !!row.signature_path && !!row.signed_at;
      return <div key={row.id} className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-black" style={{ color: "var(--text-1)" }}>{row.employee_name}</p><span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={isSigned ? { background: "rgba(16,185,129,.10)", color: "#10b981" } : { background: "rgba(245,158,11,.10)", color: "#f59e0b" }}>{isSigned ? "ASSINADO" : "SEM ASSINATURA"}</span></div><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>Mat. {row.matricula ?? "—"} · {row.exam_title} · Nota {Number(row.score).toFixed(1)}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-4)" }}><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> Prova: {fmt(row.finished_at)}</span>{isSigned && <span className="inline-flex items-center gap-1 text-emerald-500"><CheckCircle2 className="h-3 w-3" /> Assinada por {row.signature_name || row.employee_name} em {fmt(row.signed_at)}</span>}</div>{row.certificate_code && <p className="mt-2 font-mono text-[11px] font-bold text-emerald-500">{row.certificate_code}</p>}</div>{isSigned && <Button variant="outline" className="shrink-0 gap-2" onClick={() => row.signature_path && openSignature(row.signature_path)}><ExternalLink className="h-4 w-4" /> Ver assinatura</Button>}</div></div>;
    })}</div>}
  </div>;
}

function Loading() { return <div className="flex justify-center py-14"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>; }
