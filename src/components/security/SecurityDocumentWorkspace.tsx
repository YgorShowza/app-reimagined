import { AlertTriangle, Award, Database, FileCheck2, KeyRound, LockKeyhole, Network, Printer, ShieldCheck, UserCog } from "lucide-react";

const LOGO_URL = "https://media.base44.com/images/public/6a1117d573bbf85981b1abee/8271ac857_IMG_9226.png";

const SECTIONS = [
  {
    icon: KeyRound,
    title: "Autenticação e sessão",
    status: "Implementado",
    tone: "ok",
    items: [
      "Autenticação centralizada pelo Supabase Auth.",
      "Rotas internas validam a sessão antes de montar o ambiente autenticado.",
      "Sessões inválidas são limpas localmente e redirecionadas para a tela de acesso.",
      "Logout cancela consultas em andamento, limpa o cache da aplicação e encerra a sessão no Supabase.",
    ],
  },
  {
    icon: UserCog,
    title: "Perfis e autorização",
    status: "Implementado",
    tone: "ok",
    items: [
      "Perfis administrativos são controlados pela tabela user_roles.",
      "A função de autorização do banco diferencia Inspetoria e usuário operacional.",
      "Menus e telas administrativas são condicionados ao perfil do usuário.",
      "A autorização de dados não depende apenas da interface: as políticas RLS também restringem leitura e escrita.",
    ],
  },
  {
    icon: Database,
    title: "Row Level Security (RLS)",
    status: "Implementado",
    tone: "ok",
    items: [
      "Dados pessoais e operacionais são isolados por políticas no PostgreSQL/Supabase.",
      "Tentativas de prova podem ser lidas pelo próprio usuário ou pela Inspetoria.",
      "Módulos de treinamento ativos podem ser consumidos pelos operadores, enquanto a gestão é administrativa.",
      "Ciclos de treinamento permitem leitura do próprio colaborador e gestão pela Inspetoria.",
    ],
  },
  {
    icon: FileCheck2,
    title: "Auditoria e rastreabilidade",
    status: "Implementado",
    tone: "ok",
    items: [
      "A aplicação possui trilha de auditoria persistida em audit_logs.",
      "A tela de Auditoria é restrita ao ambiente administrativo.",
      "Alterações operacionais relevantes podem ser rastreadas sem depender apenas do histórico do navegador.",
    ],
  },
  {
    icon: Award,
    title: "Certificados verificáveis",
    status: "Implementado",
    tone: "ok",
    items: [
      "Cada aprovação recebe certificate_code único gerado no banco.",
      "A geração também cobre aprovações antigas por processo de backfill.",
      "O código é exibido ao Operador e incluído no certificado impresso.",
      "A Inspetoria possui tela própria para validar o código diretamente contra os registros do SEGEMPAT.",
    ],
  },
  {
    icon: LockKeyhole,
    title: "Minimização e isolamento de dados",
    status: "Implementado",
    tone: "ok",
    items: [
      "O fluxo operacional trabalha principalmente com nome, matrícula, setor, perfil e dados de desempenho.",
      "Consultas do Operador são limitadas ao próprio contexto sempre que a política de dados permite.",
      "A administração concentra operações de cadastro, avaliação, cronograma e auditoria.",
    ],
  },
  {
    icon: Network,
    title: "Restrição por IP/VPN",
    status: "Não implementado",
    tone: "warn",
    items: [
      "A versão atual não possui security_settings nem enforcement de rede no backend.",
      "Não existe bloqueio por IP, wildcard ou CIDR no Supabase atual.",
      "A implementação futura deve ocorrer na camada de infraestrutura/backend; uma simples tela de configuração não seria suficiente.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Pontos de homologação",
    status: "Requer validação",
    tone: "warn",
    items: [
      "Executar homologação com usuários Inspetor e Operador em ambiente separado de produção.",
      "Validar políticas RLS após qualquer nova tabela ou migration.",
      "Revisar requisitos de retenção, backup, recuperação e logs com a TI responsável pela implantação.",
      "Definir se haverá requisito corporativo de VPN, IP permitido, SSO ou MFA antes da publicação definitiva.",
    ],
  },
] as const;

export function SecurityDocumentWorkspace() {
  const implemented = SECTIONS.filter((section) => section.tone === "ok").length;
  const pending = SECTIONS.length - implemented;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-10 print:max-w-none print:pb-0">
      <div className="flex items-center justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
          style={{ background: "#C8102E" }}
        >
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </button>
      </div>

      <header className="rounded-2xl p-5 md:p-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="w-fit rounded-xl bg-white p-2.5">
            <img src={LOGO_URL} alt="EMPAT" className="h-12 w-auto object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em]" style={{ color: "#C8102E" }}>
              <ShieldCheck className="h-4 w-4" /> Arquitetura de segurança
            </div>
            <h1 className="mt-1 text-2xl font-black" style={{ color: "var(--text-1)" }}>Documento de Segurança da Informação</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-4)" }}>SEGEMPAT · arquitetura atual baseada em Supabase Auth, PostgreSQL e Row Level Security.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Controles ativos" value={String(implemented)} />
          <Stat label="Pendências" value={String(pending)} warn />
          <Stat label="Autenticação" value="Supabase" />
          <Stat label="Isolamento" value="RLS" />
        </div>
      </header>

      <section className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <p className="text-sm leading-6" style={{ color: "var(--text-2)" }}>
          Este documento registra os mecanismos efetivamente presentes na versão atual do SEGEMPAT. Ele substitui descrições legadas ligadas à infraestrutura Base44 e evita declarar como implementado qualquer controle que ainda não exista no ambiente Supabase atual.
        </p>
      </section>

      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const warn = section.tone === "warn";
          return (
            <section key={section.title} className="overflow-hidden rounded-2xl" style={{ background: "var(--bg-surface)", border: `1px solid ${warn ? "rgba(245,158,11,.30)" : "var(--border)"}` }}>
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: warn ? "rgba(245,158,11,.10)" : "rgba(200,16,46,.08)" }}>
                  <Icon className="h-5 w-5" style={{ color: warn ? "#f59e0b" : "#C8102E" }} />
                </div>
                <h2 className="min-w-0 flex-1 text-sm font-black sm:text-base" style={{ color: "var(--text-1)" }}>{section.title}</h2>
                <span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: warn ? "rgba(245,158,11,.10)" : "rgba(16,185,129,.10)", color: warn ? "#f59e0b" : "#10b981" }}>{section.status}</span>
              </div>
              <ul className="space-y-2 p-4">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-5" style={{ color: "var(--text-2)" }}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: warn ? "#f59e0b" : "#C8102E" }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <footer className="rounded-2xl p-4 text-xs" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-4)" }}>
        Documento gerado a partir da arquitetura atual do projeto SEGEMPAT. Data de referência: {new Date().toLocaleDateString("pt-BR", { timeZone: "America/Maceio" })}.
      </footer>
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}>
      <p className="text-lg font-black" style={{ color: warn ? "#f59e0b" : "var(--text-1)" }}>{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--text-4)" }}>{label}</p>
    </div>
  );
}
