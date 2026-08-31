import { createFileRoute } from "@tanstack/react-router";
import {
  ShieldCheck, Database, KeyRound, Route, History, FileCheck, Network,
  Fingerprint, Printer, CheckCircle2, AlertTriangle, TestTube2, LockKeyhole,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/seguranca")({
  head: () => ({ meta: [{ title: "Segurança · SEGEMPAT" }] }),
  component: SecurityCenter,
});

type Status = "Ativo" | "Parcial" | "Infraestrutura";

const controls = [
  {
    icon: KeyRound,
    title: "Autenticação",
    status: "Ativo" as Status,
    items: [
      "Autenticação gerenciada pelo Supabase Auth.",
      "Sessões persistentes com renovação automática do token.",
      "Credenciais não são armazenadas pelo frontend do SEGEMPAT.",
    ],
  },
  {
    icon: Route,
    title: "Autorização por perfil",
    status: "Ativo" as Status,
    items: [
      "Perfis administrativos são identificados pela role admin (Inspetor).",
      "Guarda central impede Operador de abrir rotas administrativas diretamente.",
      "Bloqueio de rota complementa, mas não substitui, a segurança do banco.",
    ],
  },
  {
    icon: Database,
    title: "Row-Level Security (RLS)",
    status: "Ativo" as Status,
    items: [
      "RLS habilitada nas tabelas operacionais e administrativas.",
      "Operador lê apenas o próprio cadastro e histórico quando aplicável.",
      "Rascunhos de provas são exclusivos do Inspetor; Operador recebe apenas provas publicadas.",
      "Alterações administrativas exigem role admin no próprio banco.",
    ],
  },
  {
    icon: History,
    title: "Auditoria automática",
    status: "Ativo" as Status,
    items: [
      "INSERT, UPDATE e DELETE são registrados automaticamente em audit_logs nas tabelas críticas.",
      "Auditoria cobre equipe, provas, tentativas, cronograma, ocorrências, treinamentos e certificados.",
      "Logs são acessíveis somente ao Inspetor por política RLS.",
    ],
  },
  {
    icon: FileCheck,
    title: "Certificados verificáveis",
    status: "Ativo" as Status,
    items: [
      "Aprovações geram registro persistente de certificado.",
      "Cada certificado recebe código único de verificação.",
      "Validação pública usa função controlada que retorna apenas os campos necessários.",
      "Modelo de dados suporta revogação do certificado.",
    ],
  },
  {
    icon: TestTube2,
    title: "Qualidade de código",
    status: "Ativo" as Status,
    items: [
      "Testes automatizados cobrem regras críticas do Cronograma e vencimentos.",
      "CI do GitHub executa testes, lint e build em alterações do branch principal.",
      "Mudanças estruturais do Supabase são versionadas em migrations.",
    ],
  },
  {
    icon: Network,
    title: "Restrição por IP / rede corporativa",
    status: "Infraestrutura" as Status,
    items: [
      "Não está habilitada nesta versão.",
      "Não é implementada como bloqueio de frontend, pois isso seria contornável.",
      "Para ativação segura, a allowlist deve ser aplicada em camada server/edge ou gateway corporativo antes do acesso à aplicação/API.",
      "Requer definição de faixas de IP/VPN e homologação com a infraestrutura de TI.",
    ],
  },
  {
    icon: Fingerprint,
    title: "MFA obrigatório para Inspetor",
    status: "Infraestrutura" as Status,
    items: [
      "Não é marcado como ativo sem configuração e homologação reais no provedor de autenticação.",
      "Recomendado antes da disponibilização externa do sistema.",
    ],
  },
  {
    icon: LockKeyhole,
    title: "Headers e proteção de borda",
    status: "Parcial" as Status,
    items: [
      "A aplicação usa HTTPS na hospedagem do Lovable/Supabase.",
      "Políticas adicionais de CSP, WAF, rate limiting e restrição de origem devem ser confirmadas no ambiente definitivo de publicação.",
      "Não são declaradas como implementadas apenas por configuração visual do frontend.",
    ],
  },
];

const statusStyle: Record<Status, { color: string; background: string }> = {
  Ativo: { color: "#10b981", background: "rgba(16,185,129,.10)" },
  Parcial: { color: "#f59e0b", background: "rgba(245,158,11,.10)" },
  Infraestrutura: { color: "#60a5fa", background: "rgba(96,165,250,.10)" },
};

function SecurityCenter() {
  const active = controls.filter((item) => item.status === "Ativo").length;
  const pending = controls.length - active;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10 print:max-w-none print:p-0">
      <div className="rounded-[1.5rem] p-5 md:p-6 print:border print:border-gray-300" style={{ background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)", border: "1px solid rgba(200,16,46,.26)" }}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] font-black text-white/40 print:text-gray-500"><ShieldCheck className="w-4 h-4" /> Segurança da informação</div>
            <h1 className="mt-2 text-2xl md:text-3xl font-black text-white print:text-black">Centro de Segurança</h1>
            <p className="mt-1 text-sm text-white/50 print:text-gray-600">Controles efetivamente implementados na versão Supabase do SEGEMPAT.</p>
          </div>
          <Button variant="outline" onClick={() => window.print()} className="print:hidden border-white/15 bg-white/5 text-white hover:bg-white/10">
            <Printer className="w-4 h-4 mr-2" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>Controles mapeados</p><p className="mt-2 text-2xl font-black" style={{ color: "var(--text-1)" }}>{controls.length}</p></section>
        <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>Ativos</p><p className="mt-2 text-2xl font-black text-emerald-500">{active}</p></section>
        <section className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}><p className="text-[10px] uppercase font-black" style={{ color: "var(--text-4)" }}>A homologar</p><p className="mt-2 text-2xl font-black text-amber-500">{pending}</p></section>
      </div>

      <section className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)" }}>
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-black text-sm" style={{ color: "var(--text-1)" }}>Princípio deste documento</p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-3)" }}>Nenhum controle é declarado como ativo apenas porque existia no aplicativo Base44. A versão atual descreve somente mecanismos verificáveis no código, no Supabase ou na infraestrutura já conectada.</p>
        </div>
      </section>

      <div className="space-y-3">
        {controls.map(({ icon: Icon, title, status, items }) => {
          const style = statusStyle[status];
          return (
            <section key={title} className="rounded-2xl overflow-hidden break-inside-avoid" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}>
              <div className="p-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: style.background }}><Icon className="w-5 h-5" style={{ color: style.color }} /></div>
                <h2 className="font-black text-sm flex-1" style={{ color: "var(--text-1)" }}>{title}</h2>
                <span className="text-[10px] font-black px-2.5 py-1.5 rounded-full" style={{ color: style.color, background: style.background }}>{status}</span>
              </div>
              <ul className="p-4 space-y-2">
                {items.map((item) => <li key={item} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-3)" }}><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: style.color }} /><span>{item}</span></li>)}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="text-[10px] text-center pt-2" style={{ color: "var(--text-4)" }}>SEGEMPAT · Documento de segurança gerado em {new Date().toLocaleDateString("pt-BR")}</p>
    </div>
  );
}
