import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  LayoutDashboard, ClipboardList, TrendingUp, Award, ClipboardCheck,
  Users, BarChart3, FileText, BookOpen, BookOpenCheck, Sun, Moon, Monitor,
  LogOut, Target, FileBarChart, History, AlertTriangle,
  FileSpreadsheet, PlusCircle, Menu, CalendarDays, Layers3, CalendarClock, GraduationCap, type LucideIcon,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { logoutSession } from "@/lib/backend/auth-gateway";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const LOGO_URL =
  "https://media.base44.com/images/public/6a1117d573bbf85981b1abee/8271ac857_IMG_9226.png";

type MenuItem = { path: string; label: string; icon: LucideIcon };
type MenuSection = { section: string; items: MenuItem[] };

const adminSections: MenuSection[] = [
  {
    section: "Geral",
    items: [
      { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { path: "/equipe", label: "Equipe", icon: Users },
      { path: "/analytics", label: "Analytics", icon: BarChart3 },
      { path: "/risco", label: "Zona de Risco", icon: Target },
      { path: "/individual", label: "Análise Individual", icon: FileBarChart },
      { path: "/relatorios", label: "Relatórios", icon: FileSpreadsheet },
      { path: "/relatorio-mensal", label: "Relatório Mensal", icon: FileSpreadsheet },
      { path: "/auditoria", label: "Auditoria", icon: History },
      { path: "/documento-seguranca", label: "Documento de Segurança", icon: FileText },
    ],
  },
  {
    section: "Administração",
    items: [
      { path: "/acessos", label: "Acessos", icon: ClipboardList },
      { path: "/ia-base", label: "IA Base", icon: BookOpenCheck },
    ],
  },
  {
    section: "Treinamento",
    items: [
      { path: "/cronograma", label: "Cronograma", icon: CalendarDays },
      { path: "/provas-criar", label: "Criar Prova", icon: PlusCircle },
      { path: "/provas", label: "Provas", icon: FileText },
      { path: "/banco-questoes", label: "Banco de Questões", icon: BookOpenCheck },
      { path: "/modulos-treinamento", label: "Módulos", icon: Layers3 },
      { path: "/ciclos-treinamento", label: "Ciclos e Vencimentos", icon: CalendarClock },
      { path: "/validar-certificados", label: "Validar Certificados", icon: Award },
      { path: "/assinaturas-provas", label: "Certificados e Assinaturas", icon: ClipboardCheck },
      { path: "/conteudos", label: "Conteúdos", icon: BookOpen },
      { path: "/avaliacao-pratica", label: "Avaliação Prática", icon: ClipboardCheck },
    ],
  },
  {
    section: "Ocorrências",
    items: [
      { path: "/ocorrencias", label: "Ocorrências", icon: AlertTriangle },
    ],
  },
];

const operadorMenu: MenuItem[] = [
  { path: "/painel", label: "Início", icon: LayoutDashboard },
  { path: "/pendencias", label: "Pendências", icon: ClipboardList },
  { path: "/progresso", label: "Progresso", icon: TrendingUp },
  { path: "/treinamentos", label: "Treinamentos", icon: GraduationCap },
  { path: "/teste-rapido", label: "Teste Rápido", icon: Target },
  { path: "/simulador", label: "Simulador", icon: Target },
  { path: "/stress-test", label: "Stress Test", icon: Target },
  { path: "/desafio-diario", label: "Desafio Diário", icon: Award },
  { path: "/meu-perfil", label: "Meu Perfil", icon: Users },
  { path: "/pratico", label: "Avaliação Prática", icon: ClipboardCheck },
  { path: "/minhas-ocorrencias", label: "Ocorrências", icon: AlertTriangle },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "light" as const, icon: Sun },
    { value: "dark" as const, icon: Moon },
    { value: "auto" as const, icon: Monitor },
  ];
  return (
    <div
      className="flex items-center gap-1 rounded-xl p-1"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <motion.button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="flex h-8 flex-1 items-center justify-center rounded-lg transition-colors duration-150"
            style={active ? { background: "#C8102E", color: "#fff", boxShadow: "0 2px 10px rgba(200,16,46,.24)" } : { color: "rgba(255,255,255,0.34)" }}
            aria-label={`Tema ${opt.value}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </motion.button>
        );
      })}
    </div>
  );
}

function MenuLink({ item }: { item: MenuItem }) {
  const Icon = item.icon;
  return (
    <Link to={item.path} className="block" activeOptions={{ exact: item.path === "/admin" || item.path === "/painel" }}>
      {({ isActive }) => (
        <div
          className="relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors duration-150"
          style={isActive
            ? { background: "linear-gradient(135deg,#e0142f,#C8102E)", border: "1px solid rgba(255,84,112,.32)", boxShadow: "0 8px 20px rgba(200,16,46,.20)" }
            : { border: "1px solid transparent" }}
        >
          <Icon className="h-[17px] w-[17px] shrink-0" style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.40)" }} />
          <span className="text-[13px] font-semibold tracking-wide" style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.62)" }}>{item.label}</span>
        </div>
      )}
    </Link>
  );
}

function MobileNavLink({ item }: { item: MenuItem }) {
  const Icon = item.icon;
  return <Link to={item.path} className="flex-1" activeOptions={{ exact: true }}>{({ isActive }) => <div className="flex flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors duration-150" style={isActive ? { background: "var(--accent-soft)" } : {}}><Icon className="h-5 w-5" style={{ color: isActive ? "var(--accent)" : "var(--text-4)" }} /><span className="text-[10px] font-medium" style={{ color: isActive ? "var(--accent)" : "var(--text-4)" }}>{item.label}</span></div>}</Link>;
}

function NavItems({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) return <div className="space-y-1.5">{operadorMenu.map((item) => <MenuLink key={item.path} item={item} />)}</div>;
  return <>{adminSections.map((sec) => <div key={sec.section} className="space-y-1.5"><p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.25)" }}>{sec.section}</p>{sec.items.map((item) => <MenuLink key={item.path} item={item} />)}</div>)}</>;
}

function HeaderClock() {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => { const interval = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(interval); }, []);
  const timeStr = currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Maceio" });
  const dateStr = currentTime.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Maceio" });
  return <div className="text-right"><p className="text-sm font-bold tabular-nums" style={{ color: "var(--text-1)" }}>{timeStr}</p><p className="text-[11px] capitalize" style={{ color: "var(--text-4)" }}>{dateStr}</p></div>;
}

function SidebarIdentity({ user, isAdmin }: { user: ReturnType<typeof useCurrentUser>["data"]; isAdmin: boolean }) {
  const initial = user?.nome?.trim()?.charAt(0)?.toUpperCase() || "S";
  return (
    <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white" style={{ background: "linear-gradient(135deg,#e0142f,#C8102E)", boxShadow: "0 8px 18px rgba(200,16,46,.24)" }}>
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-black text-white">{user?.nome ?? "SEGEMPAT"}</p>
          <p className="mt-0.5 text-[10px] font-mono" style={{ color: "rgba(255,255,255,.36)" }}>Mat. {user?.matricula ?? "—"}</p>
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-black" style={{ background: "rgba(200,16,46,.12)", border: "1px solid rgba(200,16,46,.32)", color: "#ff5470" }}>
        <span className="h-1.5 w-1.5 rounded-full bg-[#e0142f]" />
        {isAdmin ? "Inspetor" : "Operador"}{user?.setor ? ` · ${user.setor}` : ""}
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.isAdmin ?? false;
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutSession();
      await queryClient.cancelQueries();
      queryClient.clear();
      navigate({ to: "/", replace: true });
    } catch (error) {
      console.error("Falha ao encerrar sessão", error);
      toast.error("Não foi possível encerrar a sessão. Tente novamente.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-60 flex-col lg:flex" style={{ background: "var(--sidebar-bg)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="px-4 pb-4 pt-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}><div className="flex items-center justify-center"><div className="overflow-hidden rounded-xl bg-white p-1.5" style={{ boxShadow: "0 8px 22px rgba(0,0,0,.18)" }}><img src={LOGO_URL} alt="EMPAT" className="h-12 w-auto object-contain" /></div></div></div>
        <SidebarIdentity user={user} isAdmin={isAdmin} />
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4"><NavItems isAdmin={isAdmin} /></nav>
        <div className="space-y-2.5 px-3 pb-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <ThemeToggle />
          <button disabled={loggingOut} onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors duration-150 disabled:opacity-50" style={{ border: "1px solid rgba(200,16,46,.28)", background: "rgba(200,16,46,.08)" }}><LogOut className="h-[17px] w-[17px]" style={{ color: "#ff5470" }} /><span className="text-[13px] font-semibold" style={{ color: "#ff5470" }}>{loggingOut ? "Saindo..." : "Sair do sistema"}</span></button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:ml-60">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 md:px-6" style={{ background: "var(--header-bg)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(12px)" }}>
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild><button className="shrink-0 rounded-lg p-2 lg:hidden" style={{ color: "var(--text-2)", border: "1px solid var(--border)" }} aria-label="Abrir menu"><Menu className="h-5 w-5" /></button></SheetTrigger>
              <SheetContent side="left" className="w-[280px] border-0 p-0" style={{ background: "var(--sidebar-bg)" }}>
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex h-full flex-col">
                  <div className="px-4 pb-4 pt-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}><div className="flex items-center justify-center"><div className="overflow-hidden rounded-xl bg-white p-1.5"><img src={LOGO_URL} alt="EMPAT" className="h-10 w-auto object-contain" /></div></div></div>
                  <SidebarIdentity user={user} isAdmin={isAdmin} />
                  <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4"><NavItems isAdmin={isAdmin} /></nav>
                  <div className="space-y-2.5 px-3 pb-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <ThemeToggle />
                    <button disabled={loggingOut} onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 disabled:opacity-50" style={{ border: "1px solid rgba(200,16,46,.28)", background: "rgba(200,16,46,.08)" }}><LogOut className="h-[17px] w-[17px]" style={{ color: "#ff5470" }} /><span className="text-[13px] font-semibold" style={{ color: "#ff5470" }}>{loggingOut ? "Saindo..." : "Sair do sistema"}</span></button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <div className="shrink-0 overflow-hidden rounded-lg bg-white p-1 lg:hidden"><img src={LOGO_URL} alt="EMPAT" className="h-8 w-auto object-contain" /></div>
            <div className="min-w-0"><p className="truncate text-sm font-bold" style={{ color: "var(--text-1)" }}>{user?.nome ?? "…"}</p><p className="text-[11px] font-mono" style={{ color: "var(--text-4)" }}>Mat. {user?.matricula ?? "—"}</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-3 md:gap-4"><div className="hidden items-center gap-2 sm:flex"><div className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" /></div><span className="text-xs font-medium" style={{ color: "var(--text-3)" }}>Online</span></div><HeaderClock /><button disabled={loggingOut} onClick={handleLogout} className="rounded-lg p-2 transition-colors disabled:opacity-50 lg:hidden" style={{ color: "var(--text-3)" }} aria-label="Sair"><LogOut className="h-4 w-4" /></button></div>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-24 lg:pb-8">{children}</main>

        {!isAdmin && <nav className="fixed bottom-0 left-0 right-0 z-40 px-2 py-1.5 lg:hidden" style={{ background: "var(--header-bg)", borderTop: "1px solid var(--border)", backdropFilter: "blur(12px)", paddingBottom: "max(.375rem, env(safe-area-inset-bottom))" }}><div className="flex items-center justify-around gap-1">{operadorMenu.slice(0, 5).map((item) => <MobileNavLink key={item.path} item={item} />)}</div></nav>}
      </div>
    </div>
  );
}
