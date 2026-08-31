import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  LayoutDashboard, ClipboardList, TrendingUp, Award, ClipboardCheck,
  Users, BarChart3, FileText, BookOpen, BookOpenCheck, Brain, Sun, Moon, Monitor,
  LogOut, Target, FileBarChart, Radar, History, Tv, AlertTriangle,
  Lightbulb, FileSpreadsheet, PlusCircle, Focus, Menu, CalendarDays, Layers3, CalendarClock, GraduationCap, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import { useCurrentUser } from "@/lib/useCurrentUser";
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
      { path: "/radar-analises", label: "Radar Analítico", icon: Radar },
      { path: "/relatorios", label: "Relatórios", icon: FileSpreadsheet },
      { path: "/relatorio-mensal", label: "Relatório Mensal", icon: FileSpreadsheet },
      { path: "/tv", label: "TV Mode", icon: Tv },
      { path: "/auditoria", label: "Auditoria", icon: History },
      { path: "/documento-seguranca", label: "Documento de Segurança", icon: FileText },
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
      { path: "/conteudos", label: "Conteúdos", icon: BookOpen },
      { path: "/ia-base", label: "IA Base", icon: Brain },
      { path: "/avaliacao-pratica", label: "Avaliação Prática", icon: ClipboardCheck },
      { path: "/resumos", label: "Resumos", icon: FileText },
    ],
  },
  {
    section: "Ocorrências",
    items: [
      { path: "/ocorrencias", label: "Ocorrências", icon: AlertTriangle },
      { path: "/oportunidades", label: "Oportunidades", icon: Lightbulb },
      { path: "/foco", label: "Foco do Mês", icon: Focus },
    ],
  },
];

const operadorMenu: MenuItem[] = [
  { path: "/painel", label: "Início", icon: LayoutDashboard },
  { path: "/pendencias", label: "Pendências", icon: ClipboardList },
  { path: "/progresso", label: "Progresso", icon: TrendingUp },
  { path: "/certificados", label: "Certificados", icon: Award },
  { path: "/treinamentos", label: "Treinamentos", icon: GraduationCap },
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
      className="flex items-center gap-1 p-1 rounded-xl"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <motion.button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="flex-1 flex items-center justify-center h-8 rounded-lg transition-all duration-300"
            style={
              active
                ? { background: "rgba(255,255,255,0.1)", color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }
                : { color: "rgba(255,255,255,0.3)" }
            }
            aria-label={`Tema ${opt.value}`}
          >
            <Icon className="w-3.5 h-3.5" />
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
        <motion.div
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.98 }}
          className="relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200"
          style={
            isActive
              ? {
                  background: "linear-gradient(135deg, rgba(200,16,46,0.14), rgba(200,16,46,0.06))",
                  border: "1px solid rgba(200,16,46,0.22)",
                  boxShadow: "0 0 24px rgba(200,16,46,0.1)",
                }
              : { border: "1px solid transparent" }
          }
        >
          {isActive && (
            <motion.div
              layoutId="activeMenu"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full"
              style={{ background: "linear-gradient(180deg, #e0142f, #C8102E)", boxShadow: "0 0 12px rgba(200,16,46,0.6)" }}
            />
          )}
          <Icon
            className="w-[17px] h-[17px] shrink-0 transition-colors"
            style={{ color: isActive ? "#ff5470" : "rgba(255,255,255,0.35)" }}
          />
          <span
            className="text-[13px] font-medium tracking-wide transition-colors"
            style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.5)" }}
          >
            {item.label}
          </span>
        </motion.div>
      )}
    </Link>
  );
}

function MobileNavLink({ item }: { item: MenuItem }) {
  const Icon = item.icon;
  return (
    <Link to={item.path} className="flex-1" activeOptions={{ exact: true }}>
      {({ isActive }) => (
        <div
          className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all duration-200"
          style={isActive ? { background: "var(--accent-soft)" } : {}}
        >
          <Icon className="w-5 h-5" style={{ color: isActive ? "var(--accent)" : "var(--text-4)" }} />
          <span className="text-[10px] font-medium" style={{ color: isActive ? "var(--accent)" : "var(--text-4)" }}>
            {item.label}
          </span>
        </div>
      )}
    </Link>
  );
}

function NavItems({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) {
    return (
      <div className="space-y-1.5">
        {operadorMenu.map((item) => (
          <MenuLink key={item.path} item={item} />
        ))}
      </div>
    );
  }
  return (
    <>
      {adminSections.map((sec) => (
        <div key={sec.section} className="space-y-1.5">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 pb-1"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            {sec.section}
          </p>
          {sec.items.map((item) => (
            <MenuLink key={item.path} item={item} />
          ))}
        </div>
      ))}
    </>
  );
}

function HeaderClock() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = currentTime.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Maceio",
  });
  const dateStr = currentTime.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "America/Maceio",
  });

  return (
    <div className="text-right">
      <p className="text-sm font-bold tabular-nums" style={{ color: "var(--text-1)" }}>{timeStr}</p>
      <p className="text-[11px] capitalize" style={{ color: "var(--text-4)" }}>{dateStr}</p>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.isAdmin ?? false;
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <aside
        className="fixed left-0 top-0 bottom-0 w-60 hidden lg:flex flex-col z-40"
        style={{ background: "var(--sidebar-bg)", borderRight: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="px-4 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-center">
            <div className="rounded-xl overflow-hidden bg-white p-1.5" style={{ boxShadow: "var(--shadow-glow-gold, 0 0 18px rgba(200,160,0,0.35))" }}>
              <img src={LOGO_URL} alt="EMPAT" className="h-12 w-auto object-contain" />
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          <NavItems isAdmin={isAdmin} />
        </nav>
        <div className="px-3 pb-4 pt-3 space-y-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <ThemeToggle />
          <motion.button
            onClick={handleLogout}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200"
            style={{ border: "1px solid rgba(255,255,255,0.04)" }}
          >
            <LogOut className="w-[17px] h-[17px]" style={{ color: "rgba(255,255,255,0.35)" }} />
            <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Sair</span>
          </motion.button>
        </div>
      </aside>

      <div className="lg:ml-60 flex flex-col min-h-screen">
        <header
          className="sticky top-0 z-30 px-4 md:px-6 py-3 flex items-center justify-between gap-4"
          style={{ background: "var(--header-bg)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className="lg:hidden p-2 rounded-lg shrink-0"
                  style={{ color: "var(--text-2)", border: "1px solid var(--border)" }}
                  aria-label="Abrir menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[270px] p-0 border-0" style={{ background: "var(--sidebar-bg)" }}>
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex h-full flex-col">
                  <div className="px-4 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center justify-center">
                      <div className="rounded-xl overflow-hidden bg-white p-1.5">
                        <img src={LOGO_URL} alt="EMPAT" className="h-10 w-auto object-contain" />
                      </div>
                    </div>
                  </div>
                  <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
                    <NavItems isAdmin={isAdmin} />
                  </nav>
                  <div className="px-3 pb-4 pt-3 space-y-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <ThemeToggle />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
                      style={{ border: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <LogOut className="w-[17px] h-[17px]" style={{ color: "rgba(255,255,255,0.35)" }} />
                      <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Sair</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <div className="lg:hidden rounded-lg overflow-hidden bg-white p-1 shrink-0">
              <img src={LOGO_URL} alt="EMPAT" className="h-8 w-auto object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: "var(--text-1)" }}>{user?.nome ?? "…"}</p>
              <p className="text-[11px] font-mono" style={{ color: "var(--text-4)" }}>Mat. {user?.matricula ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <div className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-60 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--text-3)" }}>Online</span>
            </div>
            <HeaderClock />
            <button onClick={handleLogout} className="lg:hidden p-2 rounded-lg transition-colors" style={{ color: "var(--text-3)" }} aria-label="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 pb-24 lg:pb-8">{children}</main>

        {!isAdmin && (
          <nav className="fixed bottom-0 left-0 right-0 lg:hidden z-40 px-2 py-1.5" style={{ background: "var(--header-bg)", borderTop: "1px solid var(--border)", backdropFilter: "blur(12px)" }}>
            <div className="flex items-center justify-around gap-1">
              {operadorMenu.slice(0, 5).map((item) => <MobileNavLink key={item.path} item={item} />)}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}