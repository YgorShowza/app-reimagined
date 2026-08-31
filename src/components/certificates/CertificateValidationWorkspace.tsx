import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, CheckCircle2, Clock3, Copy, FileCheck2, RefreshCw, Search, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type AttemptRow = {
  id: string;
  exam_id: string;
  user_id: string;
  matricula: string | null;
  score: number;
  passed: boolean;
  certificate_code: string | null;
  signature_path: string | null;
  signature_name: string | null;
  signature_agreed: boolean;
  signed_at: string | null;
  finished_at: string;
  created_at: string;
};

type ExamRow = { id: string; title: string; exam_type: string };
type EmployeeRow = { id: string; full_name: string; matricula: string; sector: string };

type CertificateRecord = AttemptRow & {
  exam_title: string;
  exam_type: string;
  employee_name: string;
  employee_sector: string;
  formally_issued: boolean;
};

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function fmtDate(value?: string | null) {
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

async function listCertificateRecords(): Promise<CertificateRecord[]> {
  const client = supabase as any;
  const [{ data: attempts, error: attemptsError }, { data: exams, error: examsError }, { data: employees, error: employeesError }] = await Promise.all([
    client
      .from("exam_attempts")
      .select("id, exam_id, user_id, matricula, score, passed, certificate_code, signature_path, signature_name, signature_agreed, signed_at, finished_at, created_at")
      .eq("passed", true)
      .not("certificate_code", "is", null)
      .order("finished_at", { ascending: false }),
    client.from("exams").select("id, title, exam_type"),
    client.from("employees").select("id, full_name, matricula, sector"),
  ]);

  if (attemptsError) throw attemptsError;
  if (examsError) throw examsError;
  if (employeesError) throw employeesError;

  const examMap = new Map<string, ExamRow>((exams ?? []).map((row: ExamRow) => [row.id, row]));
  const employeeById = new Map<string, EmployeeRow>((employees ?? []).map((row: EmployeeRow) => [row.id, row]));
  const employeeByMatricula = new Map<string, EmployeeRow>((employees ?? []).map((row: EmployeeRow) => [row.matricula, row]));

  return (attempts ?? []).map((attempt: AttemptRow) => {
    const exam = examMap.get(attempt.exam_id);
    const employee = employeeById.get(attempt.user_id) ?? (attempt.matricula ? employeeByMatricula.get(attempt.matricula) : undefined);
    return {
      ...attempt,
      exam_title: exam?.title ?? "Avaliação",
      exam_type: exam?.exam_type ?? "—",
      employee_name: employee?.full_name ?? "Colaborador",
      employee_sector: employee?.sector ?? "—",
      formally_issued: Boolean(attempt.signature_agreed && attempt.signature_path && attempt.signed_at),
    };
  });
}

export function CertificateValidationWorkspace() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [code, setCode] = useState("");
  const [searchedCode, setSearchedCode] = useState("");
  const [listSearch, setListSearch] = useState("");

  const recordsQuery = useQuery({
    queryKey: ["certificate-validation-records"],
    queryFn: listCertificateRecords,
    enabled: Boolean(user?.isAdmin),
    staleTime: 60_000,
  });

  const records = recordsQuery.data ?? [];
  const issuedCount = records.filter((row) => row.formally_issued).length;
  const pendingCount = records.length - issuedCount;

  const result = useMemo(() => {
    if (!searchedCode) return null;
    return records.find((row) => normalizeCode(row.certificate_code ?? "") === searchedCode) ?? "not-found";
  }, [records, searchedCode]);

  const filtered = useMemo(() => {
    const s = listSearch.trim().toLowerCase();
    if (!s) return records;
    return records.filter((row) =>
      row.certificate_code?.toLowerCase().includes(s) ||
      row.employee_name.toLowerCase().includes(s) ||
      row.matricula?.toLowerCase().includes(s) ||
      row.exam_title.toLowerCase().includes(s)
    );
  }, [records, listSearch]);

  if (userLoading) return <Loading />;
  if (!user?.isAdmin) return <div className="mx-auto max-w-xl rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><ShieldCheck className="mx-auto mb-3 h-10 w-10" style={{ color: "var(--accent)" }} /><h1 className="text-lg font-black" style={{ color: "var(--text-1)" }}>Acesso restrito</h1><p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>A validação administrativa de certificados é exclusiva da Inspetoria.</p></div>;

  const handleValidate = (event?: React.FormEvent) => {
    event?.preventDefault();
    setSearchedCode(normalizeCode(code));
  };

  const copyCode = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Código copiado");
  };

  return <div className="mx-auto w-full max-w-6xl space-y-5 pb-10">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(200,16,46,.10)", border: "1px solid rgba(200,16,46,.20)" }}><FileCheck2 className="h-5 w-5" style={{ color: "#C8102E" }} /></div><div><h1 className="text-xl font-black" style={{ color: "var(--text-1)" }}>Validação de Certificados</h1><p className="text-sm" style={{ color: "var(--text-4)" }}>Valide código, aprovação e formalização por assinatura eletrônica.</p></div></div><div className="grid grid-cols-2 gap-2 text-center sm:flex"><div className="rounded-xl px-3 py-2 text-xs font-bold" style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.20)", color: "#10b981" }}>{issuedCount} emitido{issuedCount===1?"":"s"}</div><div className="rounded-xl px-3 py-2 text-xs font-bold" style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.20)", color: "#f59e0b" }}>{pendingCount} pendente{pendingCount===1?"":"s"}</div></div></header>

    <form onSubmit={handleValidate} className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}><label className="mb-2 block text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Código do registro</label><div className="flex flex-col gap-2 sm:flex-row"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ex: A1B2C3-D4E5F6-G7H8I9" className="font-mono"/><Button type="submit" className="gap-2 bg-[#C8102E] text-white hover:bg-[#A00D24]"><Search className="h-4 w-4" /> Validar</Button></div>
      {searchedCode && result === "not-found" && <div className="mt-4 flex items-start gap-3 rounded-xl p-4" style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.25)" }}><XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500"/><div><p className="text-sm font-black text-red-500">Código não encontrado</p><p className="text-xs" style={{ color: "var(--text-3)" }}>O código informado não corresponde a uma aprovação registrada no sistema.</p></div></div>}
      {result && result !== "not-found" && <CertificateResult record={result} onCopy={copyCode}/>}    
    </form>

    <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}><div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-black" style={{ color: "var(--text-1)" }}>Registros de aprovação</h2><p className="text-xs" style={{ color: "var(--text-4)" }}>O selo “emitido” exige assinatura eletrônica registrada.</p></div><div className="relative sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-4)" }}/><Input value={listSearch} onChange={(e) => setListSearch(e.target.value)} placeholder="Código, colaborador, matrícula ou prova" className="pl-9"/></div></div>
      {recordsQuery.isLoading ? <Loading/> : recordsQuery.isError ? <div className="py-8 text-center"><p className="text-sm text-red-500">Não foi possível carregar os registros.</p><Button variant="outline" className="mt-3" onClick={()=>recordsQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4"/> Tentar novamente</Button></div> : filtered.length===0 ? <p className="py-8 text-center text-sm" style={{color:"var(--text-4)"}}>Nenhum registro encontrado.</p> : <div className="space-y-2">{filtered.map((row)=><button key={row.id} onClick={()=>{setCode(row.certificate_code??"");setSearchedCode(normalizeCode(row.certificate_code??""));window.scrollTo({top:0,behavior:"smooth"});}} className="flex w-full items-center gap-3 rounded-xl p-3 text-left" style={{background:"var(--bg-surface-2)",border:"1px solid var(--border-subtle)"}}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{background:row.formally_issued?"rgba(16,185,129,.10)":"rgba(245,158,11,.10)"}}>{row.formally_issued?<Award className="h-4 w-4 text-emerald-500"/>:<Clock3 className="h-4 w-4 text-amber-500"/>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold" style={{color:"var(--text-1)"}}>{row.employee_name}</p><span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={row.formally_issued?{background:"rgba(16,185,129,.10)",color:"#10b981"}:{background:"rgba(245,158,11,.10)",color:"#f59e0b"}}>{row.formally_issued?"EMITIDO":"ASSINATURA PENDENTE"}</span></div><p className="truncate text-xs" style={{color:"var(--text-4)"}}>Mat. {row.matricula??"—"} · {row.exam_title} · {fmtDate(row.finished_at||row.created_at)}</p></div><span className="hidden font-mono text-[11px] font-black sm:inline" style={{color:row.formally_issued?"#10b981":"#f59e0b"}}>{row.certificate_code}</span><span className="text-xs font-black" style={{color:"var(--text-2)"}}>{Number(row.score).toFixed(1)}</span></button>)}</div>}
    </section>
  </div>;
}

function CertificateResult({record,onCopy}:{record:CertificateRecord;onCopy:(code:string)=>void}){
  const issued=record.formally_issued;
  return <div className="mt-4 rounded-2xl p-5" style={issued?{background:"rgba(16,185,129,.055)",border:"1px solid rgba(16,185,129,.30)"}:{background:"rgba(245,158,11,.055)",border:"1px solid rgba(245,158,11,.30)"}}><div className="mb-4 flex items-center gap-3">{issued?<CheckCircle2 className="h-7 w-7 text-emerald-500"/>:<Clock3 className="h-7 w-7 text-amber-500"/>}<div><p className={`text-sm font-black uppercase tracking-wide ${issued?"text-emerald-500":"text-amber-500"}`}>{issued?"Certificado formal válido":"Aprovação registrada — assinatura pendente"}</p><p className="text-xs" style={{color:"var(--text-4)"}}>{issued?`Assinatura eletrônica registrada em ${fmtDate(record.signed_at)}.`:"O código existe e a aprovação é legítima, mas a emissão formal ainda não foi concluída."}</p></div></div><div className="grid gap-3 md:grid-cols-2"><InfoCard icon={UserRound} label="Colaborador" value={record.employee_name} detail={`Mat. ${record.matricula??"—"} · ${record.employee_sector}`}/><InfoCard icon={FileCheck2} label="Avaliação" value={record.exam_title} detail={record.exam_type}/></div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3"><MiniStat label="Nota" value={Number(record.score).toFixed(1)}/><MiniStat label="Situação" value={issued?"Emitido":"Pendente"} issued={issued}/><MiniStat label="Realização" value={fmtDate(record.finished_at||record.created_at)} wide/></div><div className="mt-3 flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between" style={{background:"var(--bg-surface)",border:`1px dashed ${issued?"rgba(16,185,129,.35)":"rgba(245,158,11,.35)"}`}}><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wider" style={{color:"var(--text-4)"}}>Código autenticado</p><p className="break-all font-mono text-sm font-black" style={{color:issued?"#10b981":"#f59e0b"}}>{record.certificate_code}</p></div><Button variant="outline" className="gap-2" onClick={()=>record.certificate_code&&onCopy(record.certificate_code)}><Copy className="h-4 w-4"/> Copiar código</Button></div></div>;
}

function InfoCard({icon:Icon,label,value,detail}:{icon:typeof UserRound;label:string;value:string;detail:string}){return <div className="rounded-xl p-3" style={{background:"var(--bg-surface)",border:"1px solid var(--border)"}}><p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider" style={{color:"var(--text-4)"}}><Icon className="h-3 w-3"/> {label}</p><p className="break-words text-sm font-black" style={{color:"var(--text-1)"}}>{value}</p><p className="text-xs" style={{color:"var(--text-4)"}}>{detail}</p></div>}
function MiniStat({label,value,wide=false,issued=true}:{label:string;value:string;wide?:boolean;issued?:boolean}){return <div className={`rounded-xl p-3 text-center ${wide?"col-span-2 sm:col-span-1":""}`} style={{background:"var(--bg-surface)",border:"1px solid var(--border)"}}><p className="text-[9px] font-black uppercase tracking-wider" style={{color:"var(--text-4)"}}>{label}</p><p className="mt-1 text-sm font-black" style={{color:label==="Situação"?(issued?"#10b981":"#f59e0b"):"var(--text-1)"}}>{value}</p></div>}
function Loading(){return <div className="flex justify-center py-14"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>}
