import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Database, FileText, History, RefreshCw, Search, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAuditLogs } from "@/lib/operations";

export const Route = createFileRoute("/_authenticated/auditoria")({ head: () => ({ meta: [{ title: "Auditoria · SEGEMPAT" }] }), component: AuditPage });

const PAGE_SIZE = 50;
const actionLabel: Record<string,string> = { INSERT:"Criação", UPDATE:"Alteração", DELETE:"Exclusão" };

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl ${className}`} style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-card, var(--shadow-md))" }}>{children}</div>;
}

function fmtDate(value:string){return new Date(value).toLocaleString("pt-BR",{timeZone:"America/Maceio",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});}

function AuditPage() {
  const [search,setSearch]=useState("");
  const [entity,setEntity]=useState("Todos");
  const [page,setPage]=useState(1);
  const query=useQuery({queryKey:["audit-logs"],queryFn:()=>listAuditLogs(300),staleTime:60_000});
  const data=query.data??[];
  const entities=useMemo(()=>["Todos",...Array.from(new Set(data.map(l=>l.entity))).sort()],[data]);
  const filtered=useMemo(()=>data.filter(l=>{if(entity!=="Todos"&&l.entity!==entity)return false;const q=search.toLowerCase().trim();return !q||[l.action,l.entity,l.entity_id,JSON.stringify(l.details)].some(v=>(v||"").toLowerCase().includes(q));}),[data,search,entity]);
  useEffect(()=>setPage(1),[search,entity]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const safePage=Math.min(page,totalPages);
  const visible=filtered.slice((safePage-1)*PAGE_SIZE,safePage*PAGE_SIZE);

  if(query.isLoading)return <Loading/>;
  if(query.isError)return <Card className="mx-auto max-w-xl p-8 text-center"><p className="font-bold" style={{color:"var(--text-1)"}}>Não foi possível carregar a auditoria.</p><Button variant="outline" className="mt-4" onClick={()=>query.refetch()}><RefreshCw className="mr-2 h-4 w-4"/> Tentar novamente</Button></Card>;

  const metrics=[["Registros",data.length,Database],["Alterações",data.filter(l=>l.action==="UPDATE").length,UserCog],["Exclusões",data.filter(l=>l.action==="DELETE").length,FileText]] as const;

  return <div className="mx-auto max-w-6xl space-y-5 pb-10">
    <div className="rounded-[1.5rem] p-5 md:p-6" style={{background:"linear-gradient(135deg,#171118,#2b0b13 50%,#111216)",border:"1px solid rgba(200,16,46,.26)"}}><div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40"><History className="w-4 h-4"/> Rastreabilidade</div><h1 className="mt-2 text-2xl md:text-3xl font-black text-white">Auditoria</h1><p className="mt-1 text-sm text-white/50">Histórico automático das principais alterações do sistema.</p></div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{metrics.map(([label,value,Icon])=><Card key={label} className="p-4"><div className="flex justify-between"><div><p className="text-[10px] uppercase font-black" style={{color:"var(--text-4)"}}>{label}</p><p className="mt-2 text-2xl font-black" style={{color:"var(--text-1)"}}>{value}</p></div><Icon className="w-4 h-4" style={{color:"var(--accent)"}}/></div></Card>)}</div>

    <Card className="p-4"><div className="grid gap-3 md:grid-cols-[1fr_220px]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{color:"var(--text-4)"}}/><Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar ação, entidade ou ID..." className="pl-10"/></div><Select value={entity} onValueChange={setEntity}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{entities.map(e=><SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select></div></Card>

    <div className="space-y-2">{visible.map(l=><Card key={l.id} className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black px-2 py-1 rounded-full" style={{color:l.action==="DELETE"?"#ef4444":l.action==="UPDATE"?"#f59e0b":"#10b981",background:l.action==="DELETE"?"rgba(239,68,68,.1)":l.action==="UPDATE"?"rgba(245,158,11,.1)":"rgba(16,185,129,.1)"}}>{actionLabel[l.action]||l.action}</span><p className="break-words font-bold text-sm" style={{color:"var(--text-1)"}}>{l.entity}</p></div><p className="mt-1 break-all text-xs" style={{color:"var(--text-4)"}}>ID: {l.entity_id||"—"}</p></div><p className="shrink-0 text-xs" style={{color:"var(--text-4)"}}>{fmtDate(l.created_at)}</p></div></Card>)}{!filtered.length&&<Card className="p-10 text-center"><History className="w-10 h-10 mx-auto opacity-30" style={{color:"var(--text-4)"}}/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>Nenhum registro de auditoria encontrado.</p></Card>}</div>

    {filtered.length>PAGE_SIZE&&<div className="flex flex-col items-center justify-between gap-3 sm:flex-row"><p className="text-xs" style={{color:"var(--text-4)"}}>Mostrando {(safePage-1)*PAGE_SIZE+1}–{Math.min(safePage*PAGE_SIZE,filtered.length)} de {filtered.length}</p><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}><ChevronLeft className="mr-1 h-4 w-4"/>Anterior</Button><span className="min-w-20 text-center text-xs font-bold" style={{color:"var(--text-3)"}}>{safePage}/{totalPages}</span><Button variant="outline" size="sm" disabled={safePage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Próxima<ChevronRight className="ml-1 h-4 w-4"/></Button></div></div>}
  </div>;
}

function Loading(){return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>}
