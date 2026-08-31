import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock3, CalendarDays, BookOpen, CheckCircle2 } from "lucide-react";
import { listCronogramaEntriesByYear, formatDate } from "@/lib/cronograma";

export const Route = createFileRoute("/_authenticated/pendencias")({ head: () => ({ meta: [{ title: "Pendências · SEGEMPAT" }] }), component: PendingPage });

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>{children}</div>; }

function PendingPage() {
  const year = new Date().getFullYear();
  const { data = [], isLoading } = useQuery({ queryKey: ["my-pending", year], queryFn: () => listCronogramaEntriesByYear(year) });
  const pending = data.filter((e) => e.status === "Pendente").sort((a,b) => (a.planned_date || "9999").localeCompare(b.planned_date || "9999"));
  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;
  return <div className="mx-auto max-w-3xl space-y-5 pb-10"><div className="rounded-[1.5rem] p-5" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}><div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40"><Clock3 className="w-4 h-4" /> Prioridades</div><h1 className="mt-2 text-2xl font-black text-white">Minhas Pendências</h1><p className="mt-1 text-sm text-white/50">Treinamentos e atividades ainda não concluídos.</p></div>
    <div className="grid grid-cols-2 gap-3"><Card className="p-4"><p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>Pendentes</p><p className="mt-2 text-2xl font-black text-amber-500">{pending.length}</p></Card><Card className="p-4"><p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>Concluídos no ano</p><p className="mt-2 text-2xl font-black text-emerald-500">{data.filter((e) => e.status === "Realizado").length}</p></Card></div>
    {pending.length === 0 ? <Card className="p-10 text-center"><CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" /><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Você está em dia.</p><p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>Nenhuma pendência registrada.</p></Card> : <div className="space-y-3">{pending.map((e) => <Card key={e.id} className="p-4"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,.1)" }}><BookOpen className="w-4 h-4 text-amber-500" /></div><div className="min-w-0 flex-1"><p className="font-bold" style={{ color: "var(--text-1)" }}>{e.theme}</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>{e.employee_sector}</p><div className="mt-3 flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-3)" }}><span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Previsto: {formatDate(e.planned_date)}</span>{e.exam_title && <span>Prova: {e.exam_title}</span>}</div></div></div></Card>)}</div>}
  </div>;
}
