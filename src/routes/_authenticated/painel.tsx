import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, ClipboardList, TrendingUp, Award, ClipboardCheck, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { listCronogramaEntriesByYear } from "@/lib/cronograma";
import { listExams, listMyAttempts } from "@/lib/exams";

export const Route = createFileRoute("/_authenticated/painel")({ head:()=>({meta:[{title:"Início · SEGEMPAT"}]}), component:PanelPage });

function Card({children,className=""}:{children:React.ReactNode;className?:string}){return <div className={`rounded-2xl ${className}`} style={{background:"var(--bg-surface)",border:"1px solid var(--border)",boxShadow:"var(--shadow-card, var(--shadow-md))"}}>{children}</div>}

function PanelPage(){
  const {data:user}=useCurrentUser();
  const year=new Date().getFullYear();
  const cron=useQuery({queryKey:["panel-cron",year],queryFn:()=>listCronogramaEntriesByYear(year)});
  const exams=useQuery({queryKey:["exams"],queryFn:listExams});
  const attempts=useQuery({queryKey:["panel-attempts"],queryFn:listMyAttempts});

  const loading=cron.isLoading||exams.isLoading||attempts.isLoading;
  const failed=cron.isError||exams.isError||attempts.isError;

  if(loading)return <div className="flex justify-center py-20"><div className="h-9 w-9 animate-spin rounded-full border-4" style={{borderColor:"var(--border)",borderTopColor:"#C8102E"}}/></div>;
  if(failed)return <Card className="mx-auto max-w-xl p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-500"/><p className="mt-3 font-bold" style={{color:"var(--text-1)"}}>Não foi possível carregar o painel.</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>Tente atualizar a página. Se persistir, informe a Inspetoria.</p></Card>;

  const rows=cron.data??[];
  const pending=rows.filter(e=>e.status==="Pendente").sort((a,b)=>(a.planned_date||"9999-12-31").localeCompare(b.planned_date||"9999-12-31"));
  const done=rows.filter(e=>e.status==="Realizado").length;
  const available=(exams.data??[]).filter(e=>e.status==="Publicada");
  const passed=(attempts.data??[]).filter(a=>a.passed).length;
  const execution=rows.length?Math.round(done/rows.length*100):0;
  const first=user?.nome?.split(" ")[0]||"colaborador";
  const h=new Date().getHours();
  const greeting=h<12?"Bom dia":h<18?"Boa tarde":"Boa noite";
  const links=[
    {to:"/pendencias",label:"Pendências",icon:ClipboardList,sub:`${pending.length} pendente(s)`},
    {to:"/provas",label:"Provas",icon:FileText,sub:`${available.length} publicada(s)`},
    {to:"/progresso",label:"Progresso",icon:TrendingUp,sub:`${execution}% executado`},
    {to:"/certificados",label:"Certificados",icon:Award,sub:`${passed} disponível(is)`},
    {to:"/pratico",label:"Avaliação Prática",icon:ClipboardCheck,sub:"Acompanhar"},
    {to:"/minhas-ocorrencias",label:"Ocorrências",icon:AlertTriangle,sub:"Registrar/consultar"},
  ];

  return <div className="mx-auto max-w-5xl space-y-5 pb-10">
    <div className="rounded-[1.5rem] p-5 md:p-6" style={{background:"linear-gradient(135deg,#171118,#2b0b13 50%,#111216)",border:"1px solid rgba(200,16,46,.26)",boxShadow:"0 10px 34px rgba(200,16,46,.12)"}}>
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-white/40"><LayoutDashboard className="h-4 w-4"/> Painel operacional</div>
      <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">{greeting}, {first}</h1>
      <p className="mt-1 text-sm text-white/50">Mat. {user?.matricula||"—"} · acompanhe suas prioridades e desempenho.</p>
    </div>

    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card className="p-4"><p className="text-[10px] font-black uppercase" style={{color:"var(--text-4)"}}>Pendências</p><p className="mt-2 text-2xl font-black text-amber-500">{pending.length}</p></Card>
      <Card className="p-4"><p className="text-[10px] font-black uppercase" style={{color:"var(--text-4)"}}>Concluídos</p><p className="mt-2 text-2xl font-black text-emerald-500">{done}</p></Card>
      <Card className="p-4"><p className="text-[10px] font-black uppercase" style={{color:"var(--text-4)"}}>Execução</p><p className="mt-2 text-2xl font-black" style={{color:"var(--text-1)"}}>{execution}%</p></Card>
      <Card className="p-4"><p className="text-[10px] font-black uppercase" style={{color:"var(--text-4)"}}>Aprovações</p><p className="mt-2 text-2xl font-black" style={{color:"var(--text-1)"}}>{passed}</p></Card>
    </div>

    {pending.length>0?<Card className="p-4">
      <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-amber-500"/><h2 className="text-sm font-bold" style={{color:"var(--text-1)"}}>Próximas pendências</h2></div>
      <div className="mt-3 space-y-2">{pending.slice(0,3).map(e=><div key={e.id} className="flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between" style={{background:"var(--bg-surface-2)"}}><div className="min-w-0"><p className="break-words text-sm font-semibold" style={{color:"var(--text-1)"}}>{e.theme}</p><p className="mt-1 text-xs" style={{color:"var(--text-4)"}}>{e.planned_date?new Date(`${e.planned_date}T00:00:00`).toLocaleDateString("pt-BR"):"Sem data definida"}</p></div>{e.exam_id&&<Link to="/prova-realizar" search={{id:e.exam_id}} className="shrink-0 text-xs font-bold" style={{color:"var(--accent)"}}>Realizar prova</Link>}</div>)}</div>
    </Card>:<Card className="flex items-center gap-3 p-5"><CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500"/><div><p className="font-bold" style={{color:"var(--text-1)"}}>Você está em dia.</p><p className="mt-1 text-sm" style={{color:"var(--text-4)"}}>Nenhuma pendência registrada neste momento.</p></div></Card>}

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{links.map(({to,label,icon:Icon,sub})=><Link key={to} to={to as any}><Card className="h-full p-4 transition-colors"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{background:"var(--accent-soft)"}}><Icon className="h-4 w-4" style={{color:"var(--accent)"}}/></div><div className="min-w-0"><p className="text-sm font-bold" style={{color:"var(--text-1)"}}>{label}</p><p className="mt-1 text-xs" style={{color:"var(--text-4)"}}>{sub}</p></div></div></Card></Link>)}</div>
  </div>;
}
