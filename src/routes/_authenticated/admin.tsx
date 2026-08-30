import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Users, FileText, Shield, Target, BarChart3,
  AlertTriangle, ChevronRight, Brain, Tv, Trophy,
  Activity, FileBarChart, RefreshCw, Sparkles,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { listEmployees } from "@/lib/employees";


const LOGO_URL =
  "https://media.base44.com/images/public/6a1117d573bbf85981b1abee/8271ac857_IMG_9226.png";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" as const },
  }),
};

function KPICard({
  label, value, icon: Icon, color, sub, index,
}: {
  label: string; value: string | number; icon: typeof Users; color: string; sub?: string; index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="rounded-2xl p-4 relative overflow-hidden group cursor-default"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card, var(--shadow-md))",
      }}
    >
      <div
        className="absolute -right-10 -top-10 w-28 h-28 rounded-full opacity-[0.08] transition-all duration-300 group-hover:opacity-[0.16] group-hover:scale-110"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
      />
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="flex items-start justify-between mb-3 relative">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{ background: color + "1a", boxShadow: `0 0 18px ${color}25, inset 0 0 0 1px ${color}30` }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color }} />
        </div>
      </div>
      <p className="text-[2rem] font-black leading-none tracking-tight" style={{ color: "var(--text-1)", fontFamily: "var(--font-heading)" }}>
        {value}
      </p>
      <p className="text-[11px] uppercase tracking-wider mt-2 font-bold" style={{ color: "var(--text-4)" }}>
        {label}
      </p>
      {sub && (
        <p className="text-xs mt-1.5 font-bold flex items-center gap-1" style={{ color }}>
          <span className="w-1 h-1 rounded-full" style={{ background: color }} />
          {sub}
        </p>
      )}
    </motion.div>
  );
}

const quickLinks = [
  { label: "Equipe", icon: Users, path: "/equipe", color: "#3b82f6" },
  { label: "Analytics", icon: BarChart3, path: "/analytics", color: "#C8102E" },
  { label: "IA Base", icon: Brain, path: "/ia-base", color: "#8b5cf6" },
  { label: "Provas", icon: FileText, path: "/provas-criar", color: "#C8102E" },
  { label: "Risco", icon: Target, path: "/risco", color: "#f59e0b" },
  { label: "Individual", icon: FileBarChart, path: "/individual", color: "#06b6d4" },
  { label: "Relatórios", icon: FileBarChart, path: "/relatorios", color: "#ec4899" },
  { label: "TV Mode", icon: Tv, path: "/tv", color: "#6b7280" },
];

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Dashboard · SEGEMPAT" },
      { name: "description", content: "Dashboard administrativo do SEGEMPAT — visão geral de equipe, treinamentos e desempenho." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: user } = useCurrentUser();

  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: listEmployees });

  // TODO: métricas de provas/cronograma quando essas entidades forem portadas.
  const activeEmployees = employees.filter((e) => e.status === "Ativo");
  const riskEmployees = activeEmployees;
  const topEmployees = [...activeEmployees].sort((a, b) => b.points - a.points).slice(0, 5);

  const coverageRate = "0%";
  const approvalRate = 0;
  const avgScore = 0;
  const totalAttempts = 0;
  const passedAttempts = 0;
  const coveredCount = 0;
  const cftvAvg = 0;
  const vigAvg = 0;
  const medals = ["🥇", "🥈", "🥉"];

  const sectorData = [
    { name: "CFTV", value: cftvAvg, fill: "#C8102E" },
    { name: "Vigilância", value: vigAvg, fill: "#3b82f6" },
  ];

  const firstName = user?.nome?.split(" ")[0] ?? "Inspetor";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const dateStr = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "America/Maceio",
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-8">
      {/* ─── HERO ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[1.5rem] overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, #1a1220 0%, #2a0a12 45%, #0f0f12 100%)",
          border: "1px solid rgba(200,16,46,0.25)",
          boxShadow: "0 8px 32px rgba(200,16,46,0.15)",
        }}
      >
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(200,16,46,0.3), transparent 70%)" }} />
        <div className="absolute -bottom-24 -left-10 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(200,160,0,0.12), transparent 70%)" }} />
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative p-5 md:p-7 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
              className="rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
              style={{ background: "#ffffff", padding: "7px 10px", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
            >
              <img src={LOGO_URL} alt="EMPAT" className="h-12 w-auto object-contain" />
            </motion.div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: "rgba(255,255,255,0.4)" }}>
                {greeting}
              </p>
              <h1 className="font-black text-2xl md:text-[1.8rem] leading-tight truncate" style={{ color: "#ffffff", fontFamily: "var(--font-heading)" }}>
                {firstName}
              </h1>
              <p className="text-xs mt-1 font-mono capitalize" style={{ color: "rgba(255,255,255,0.35)" }}>
                {dateStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
            >
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-green-400 opacity-60 animate-ping" />
                <span className="relative w-2 h-2 rounded-full bg-green-500" />
              </span>
              <span className="text-sm font-semibold text-white/80">{activeEmployees.length} ativos</span>
              <span className="text-white/15">·</span>
              {riskEmployees.length > 0 ? (
                <span className="text-sm font-black" style={{ color: "#ff5470" }}>{riskEmployees.length} em risco</span>
              ) : (
                <span className="text-sm font-black" style={{ color: "#34d399" }}>Todos aptos</span>
              )}
            </motion.div>
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              whileHover={{ scale: 1.08, rotate: 90 }}
              whileTap={{ scale: 0.92 }}
              title="Atualizar dados"
              className="p-2.5 rounded-xl transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}
            >
              <RefreshCw className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard index={0} label="Funcionários" value={activeEmployees.length} icon={Users} color="#3b82f6" sub={`${activeEmployees.length - riskEmployees.length} aptos`} />
        <KPICard index={1} label="Taxa Aprovação" value={`${approvalRate}%`} icon={Shield} color="#10b981" sub={`${passedAttempts} aprovações`} />
        <KPICard index={2} label="Média Geral" value={avgScore} icon={BarChart3} color="#f59e0b" sub={`${totalAttempts} tentativas`} />
        <KPICard index={3} label="Cobertura" value={coverageRate} icon={Activity} color="#C8102E" sub={`${coveredCount} treinados`} />
      </div>

      {/* ─── Quick links ─── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={4}
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
            Acesso Rápido
          </h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {quickLinks.map((ql, i) => (
            <motion.div key={ql.path} custom={i} variants={scaleIn} initial="hidden" animate="visible">
              <Link to={ql.path} className="activity-btn block">
                <motion.div
                  whileHover={{ y: -3 }}
                  className="rounded-xl p-3 flex flex-col items-center gap-1.5 text-center h-full relative overflow-hidden"
                  style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
                >
                  <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-[0.06] transition-opacity hover:opacity-[0.14]" style={{ background: ql.color }} />
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-110"
                    style={{ background: ql.color + "1a", boxShadow: `0 0 12px ${ql.color}20` }}
                  >
                    <ql.icon className="w-4 h-4" style={{ color: ql.color }} />
                  </div>
                  <span className="text-[10px] leading-tight font-semibold" style={{ color: "var(--text-3)" }}>
                    {ql.label}
                  </span>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── Bento: gráfico + risco ─── */}
      <div className="grid md:grid-cols-3 gap-4">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={5}
          className="rounded-2xl overflow-hidden md:col-span-2 relative"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}
        >
          <div className="px-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "var(--text-1)" }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
                <BarChart3 className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              </div>
              Média por Setor
            </h3>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1.5" style={{ color: "var(--text-3)" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "#C8102E" }} />CFTV {cftvAvg}
              </span>
              <span className="flex items-center gap-1.5" style={{ color: "var(--text-3)" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "#3b82f6" }} />Vigilância {vigAvg}
              </span>
            </div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={sectorData} barSize={56}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: "var(--text-4)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} fontSize={11} tick={{ fill: "var(--text-4)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--accent-soft)" }}
                  contentStyle={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    color: "var(--text-1)",
                    boxShadow: "var(--shadow-md)",
                  }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {sectorData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Risco */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={6}
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: "var(--bg-surface)",
            border: `1px solid ${riskEmployees.length > 0 ? "rgba(200,16,46,0.22)" : "var(--border)"}`,
            boxShadow: "var(--shadow-card, var(--shadow-md))",
          }}
        >
          <div className="px-4 pt-4 pb-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: riskEmployees.length > 0 ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.12)" }}
            >
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: riskEmployees.length > 0 ? "#f59e0b" : "#10b981" }} />
            </div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-1)" }}>
              Zona de Risco
            </h3>
            {riskEmployees.length > 0 && (
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                {riskEmployees.length}
              </span>
            )}
          </div>
          <div className="p-3 space-y-1.5 max-h-[210px] overflow-y-auto">
            {riskEmployees.length === 0 ? (
              <div className="text-center py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(16,185,129,0.1)" }}
                >
                  <Shield className="w-6 h-6" style={{ color: "#10b981" }} />
                </motion.div>
                <p className="text-sm font-semibold" style={{ color: "#10b981" }}>
                  Todos dentro da meta!
                </p>
              </div>
            ) : (
              riskEmployees.slice(0, 6).map((emp) => (
                <div key={emp.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>{emp.full_name}</p>
                    <p className="text-xs" style={{ color: "var(--text-4)" }}>{emp.sector}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          {riskEmployees.length > 0 && (
            <div className="px-4 pb-3">
              <Link to="/risco" className="flex items-center gap-1 text-sm font-medium transition-colors hover:gap-2" style={{ color: "var(--accent)" }}>
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* Ranking */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={7}
        className="rounded-2xl overflow-hidden relative"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}
      >
        <div className="px-4 pt-4 pb-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)" }}>
            <Trophy className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
          </div>
          <h3 className="font-bold text-sm" style={{ color: "var(--text-1)" }}>
            Ranking de Desempenho
          </h3>
          <span className="ml-auto text-[11px] font-semibold" style={{ color: "var(--text-4)" }}>
            Top {Math.min(5, topEmployees.length)}
          </span>
        </div>
        <div className="p-3 grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {topEmployees.map((emp, i) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.4 }}
              whileHover={{ y: -3 }}
              className="flex sm:flex-col items-center gap-3 sm:gap-2 px-3 py-3 rounded-xl relative overflow-hidden"
              style={{
                background: i === 0 ? "var(--accent-soft)" : "var(--bg-surface-2)",
                border: `1px solid ${i === 0 ? "rgba(200,16,46,0.22)" : "var(--border-subtle)"}`,
              }}
            >
              <span className="text-2xl w-8 text-center shrink-0 relative">{medals[i] || `${i + 1}º`}</span>
              <div className="flex-1 min-w-0 sm:text-center relative">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text-1)" }}>{emp.full_name}</p>
                <p className="text-xs" style={{ color: "var(--text-4)" }}>{emp.sector}</p>
              </div>
              <span className="text-sm font-black sm:mt-1 relative px-2 py-0.5 rounded-lg" style={{ color: "#f59e0b", background: "rgba(245,158,11,0.08)" }}>
                {emp.points || 0} pts
              </span>
            </motion.div>
          ))}
          {topEmployees.length === 0 && (
            <p className="text-sm text-center py-4 col-span-full" style={{ color: "var(--text-4)" }}>
              Nenhum dado ainda
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
