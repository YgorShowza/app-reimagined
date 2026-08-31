import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, BookOpen, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listKnowledgeItems } from "@/lib/operations";

export const Route = createFileRoute("/_authenticated/resumos")({
  head: () => ({ meta: [{ title: "Resumos · SEGEMPAT" }] }),
  component: SummariesPage,
});

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl ${className}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>{children}</div>;
}

function SummariesPage() {
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("Todos");
  const { data = [], isLoading } = useQuery({ queryKey: ["knowledge-items"], queryFn: listKnowledgeItems });
  const active = data.filter((item) => item.active);
  const sectors = ["Todos", ...Array.from(new Set(active.map((item) => item.target_sector))).sort()];
  const filtered = useMemo(() => active.filter((item) => {
    if (sector !== "Todos" && item.target_sector !== "Todos" && item.target_sector !== sector) return false;
    const q = search.trim().toLowerCase();
    return !q || [item.title, item.category, item.content, item.target_sector].some((value) => value.toLowerCase().includes(q));
  }), [active, search, sector]);

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }} /></div>;

  return <div className="mx-auto max-w-6xl space-y-5 pb-10">
    <div className="rounded-[1.5rem] p-5 md:p-6" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40"><FileText className="w-4 h-4" /> Revisão rápida</div>
      <h1 className="mt-2 text-2xl md:text-3xl font-black text-white">Resumos</h1>
      <p className="mt-1 text-sm text-white/50">Conteúdos essenciais da base de conhecimento em leitura rápida.</p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <Card className="p-4"><div className="flex justify-between"><div><p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>Conteúdos ativos</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{active.length}</p></div><BookOpen className="w-4 h-4" style={{ color: "var(--accent)" }} /></div></Card>
      <Card className="p-4"><div className="flex justify-between"><div><p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>Categorias</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{new Set(active.map((item) => item.category)).size}</p></div><Target className="w-4 h-4" style={{ color: "var(--accent)" }} /></div></Card>
    </div>

    <Card className="p-4"><div className="grid md:grid-cols-[1fr_210px] gap-3"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-4)" }} /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar resumo por tema ou palavra-chave..." className="pl-10" /></div><Select value={sector} onValueChange={setSector}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div></Card>

    <div className="grid gap-3 md:grid-cols-2">{filtered.map((item) => {
      const paragraphs = item.content.split(/\n+/).map((p) => p.trim()).filter(Boolean);
      const summary = paragraphs.slice(0, 3).join("\n\n");
      return <Card key={item.id} className="p-5"><div className="flex items-start gap-3"><div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)" }}><FileText className="w-4 h-4" style={{ color: "var(--accent)" }} /></div><div className="min-w-0"><p className="font-bold" style={{ color: "var(--text-1)" }}>{item.title}</p><p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>{item.category} · {item.target_sector}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{summary}</p></div></div></Card>;
    })}{!filtered.length && <Card className="p-10 text-center md:col-span-2"><BookOpen className="w-10 h-10 mx-auto opacity-30" style={{ color: "var(--text-4)" }} /><p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>Nenhum resumo disponível.</p><p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>Cadastre conteúdos na Base de Conhecimento para alimentá-los aqui.</p></Card>}</div>
  </div>;
}
