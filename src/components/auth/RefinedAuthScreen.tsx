import { useEffect, useState, type CSSProperties, type FocusEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { activateWithCode, loginWithMatricula } from "@/lib/backend/auth-gateway";
import type { SessionUser } from "@/lib/backend/contracts";
import { getCurrentSessionUser } from "@/lib/backend/current-user-gateway";
import {
  DEMO_INSPECTOR_USER,
  DEMO_OPERATOR_USER,
  isDemoModeAllowed,
  type DemoRole,
} from "@/lib/demo-mode";
import { loginPasswordSchema, matriculaSchema, passwordSchema } from "@/lib/matricula";
import { useApiReadiness } from "@/lib/useApiReadiness";

const LOGO_URL = "/empat-logo.svg";
const DEMO_PASSWORD = "demo";

const inputStyle: CSSProperties = {
  width: "100%",
  height: "52px",
  borderRadius: "0.9rem",
  border: "1px solid var(--border)",
  background: "var(--bg-surface-2)",
  color: "var(--text-1)",
  fontSize: "0.9375rem",
  padding: "0 1rem",
  outline: "none",
  transition: "border-color 150ms ease, box-shadow 150ms ease, background 150ms ease",
};

const primaryButtonStyle: CSSProperties = {
  background: "linear-gradient(135deg, #B90E29 0%, #D41435 52%, #A90D26 100%)",
  color: "#fff",
  boxShadow: "0 12px 28px rgba(200,16,46,.24)",
};

const labelClass = "text-[11px] font-black uppercase tracking-[.14em]";
type Step = "matricula" | "password" | "signup";
type Navigate = ReturnType<typeof useNavigate>;

function navigateHome(navigate: Navigate, user: SessionUser) {
  navigate({ to: user.isAdmin ? "/admin" : "/painel", replace: true });
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.055] p-4 backdrop-blur-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.07] text-white">
        {icon}
      </div>
      <div>
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-white/52">{description}</p>
      </div>
    </div>
  );
}

export function RefinedAuthScreen() {
  const navigate = useNavigate();
  const apiReadiness = useApiReadiness();
  const [matricula, setMatricula] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<Step>("matricula");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<DemoRole | null>(null);

  const demoAllowed = isDemoModeAllowed();
  const apiUnavailable = apiReadiness === "unavailable";
  const apiChecking = apiReadiness === "checking";
  const apiStatusLabel = apiUnavailable ? "Sistema indisponível" : apiChecking ? "Verificando sistema" : "Sistema online";
  const apiStatusColor = apiUnavailable ? "#ef4444" : apiChecking ? "#f59e0b" : "#22c55e";

  useEffect(() => {
    let active = true;
    getCurrentSessionUser()
      .then((user) => {
        if (active && user) navigateHome(navigate, user);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [navigate]);

  const focusAccent = (event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.style.borderColor = "var(--accent)";
    event.currentTarget.style.boxShadow = "0 0 0 3px rgba(200,16,46,.10)";
  };

  const blurBorder = (event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.style.borderColor = "var(--border)";
    event.currentTarget.style.boxShadow = "none";
  };

  const handleCheckMatricula = () => {
    const parsed = matriculaSchema.safeParse(matricula);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Matrícula inválida");
      return;
    }
    setMatricula(parsed.data);
    setStep("password");
  };

  const handleLogin = async () => {
    const pwd = loginPasswordSchema.safeParse(password);
    if (!pwd.success) {
      toast.error(pwd.error.issues[0]?.message ?? "Senha inválida");
      return;
    }
    setLoading(true);
    try {
      const user = await loginWithMatricula(matricula, password);
      toast.success("Bem-vindo ao SEGEMPAT");
      navigateHome(navigate, user);
    } catch {
      toast.error("Matrícula ou senha incorretos");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!/^\d{8}$/.test(activationCode)) {
      toast.error("Informe o código de ativação de 8 dígitos");
      return;
    }
    const pwd = passwordSchema.safeParse(password);
    if (!pwd.success) {
      toast.error(pwd.error.issues[0]?.message ?? "Senha inválida");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const user = await activateWithCode({ matricula, activationCode, password });
      toast.success("Acesso criado com sucesso");
      setActivationCode("");
      navigateHome(navigate, user);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      toast.error(
        message.includes("já possui") || message.includes("already")
          ? "Já existe uma senha cadastrada para esta matrícula"
          : "Não foi possível criar o acesso. Verifique matrícula e código de ativação.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: DemoRole) => {
    const demoUser = role === "inspector" ? DEMO_INSPECTOR_USER : DEMO_OPERATOR_USER;
    setDemoLoading(role);
    try {
      const user = await loginWithMatricula(demoUser.matricula, DEMO_PASSWORD);
      toast.success(role === "inspector" ? "Demonstração da Inspetoria iniciada" : "Demonstração do Operador iniciada");
      navigateHome(navigate, user);
    } catch {
      toast.error("Não foi possível iniciar o modo demonstração");
    } finally {
      setDemoLoading(null);
    }
  };

  const resetMatricula = () => {
    setStep("matricula");
    setPassword("");
    setConfirmPassword("");
    setActivationCode("");
    setShowPassword(false);
  };

  const toggleSignup = () => {
    const next = step === "signup" ? "password" : "signup";
    setStep(next);
    setPassword("");
    setConfirmPassword("");
    setActivationCode("");
    setShowPassword(false);
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:flex lg:items-center lg:px-10 lg:py-10"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 12% 15%, rgba(200,16,46,.13), transparent 34%), radial-gradient(circle at 88% 82%, rgba(200,16,46,.08), transparent 30%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C8102E]/45 to-transparent" />

      <div className="absolute right-4 top-4 z-30 sm:right-6 sm:top-6">
        <ThemeSwitcher />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1180px] overflow-hidden rounded-[2rem] border shadow-2xl lg:min-h-[700px] lg:grid-cols-[1.12fr_.88fr]" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <section className="relative hidden overflow-hidden bg-[#111216] p-10 lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#C8102E]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-36 -right-24 h-96 w-96 rounded-full bg-[#C8102E]/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-[.09]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-white/65">
              <ShieldCheck className="h-3.5 w-3.5 text-[#ef4562]" /> Segurança Portuária · EMPAT
            </div>

            <div className="mt-10 inline-flex rounded-2xl bg-white p-4 shadow-[0_18px_50px_rgba(0,0,0,.28)]">
              <img src={LOGO_URL} alt="Logotipo EMPAT" className="h-24 w-auto object-contain" />
            </div>

            <p className="mt-8 text-xs font-black uppercase tracking-[.24em] text-[#ef4562]">Sistema Integrado</p>
            <h1 className="mt-3 max-w-xl text-5xl font-black tracking-[-.045em] text-white xl:text-[3.6rem]">
              SEGEMPAT
            </h1>
            <p className="mt-3 max-w-lg text-base font-semibold leading-7 text-white/58">
              Gestão, operações e desempenho em uma experiência única para a segurança portuária.
            </p>
          </div>

          <div className="relative grid gap-3 xl:grid-cols-3">
            <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Operações" description="Rotinas e controles em um único ambiente." />
            <Feature icon={<GraduationCap className="h-5 w-5" />} title="Capacitação" description="Provas, conteúdos e evolução profissional." />
            <Feature icon={<Activity className="h-5 w-5" />} title="Desempenho" description="Indicadores e acompanhamento da equipe." />
          </div>
        </section>

        <section className="relative flex min-h-[calc(100vh-3rem)] flex-col justify-center p-5 sm:p-8 lg:min-h-0 lg:p-10 xl:p-12">
          <div className="mx-auto w-full max-w-[430px]">
            <div className="mb-8 lg:hidden">
              <div className="inline-flex rounded-2xl bg-white p-3 shadow-md">
                <img src={LOGO_URL} alt="Logotipo EMPAT" className="h-20 w-auto object-contain" />
              </div>
              <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-[.2em]" style={{ color: "var(--accent)" }}>Sistema Integrado</p>
                <h1 className="mt-1 text-3xl font-black tracking-[-.04em]" style={{ color: "var(--text-1)" }}>SEGEMPAT</h1>
                <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-3)" }}>Gestão • Operações • Desempenho</p>
              </div>
            </div>

            <div className="mb-7 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: "var(--text-4)" }}>Acesso seguro</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight" style={{ color: "var(--text-1)" }}>
                  {step === "matricula" ? "Bem-vindo" : step === "signup" ? "Primeiro acesso" : "Acessar SEGEMPAT"}
                </h2>
                <p className="mt-1 text-sm leading-6" style={{ color: "var(--text-3)" }}>
                  {step === "matricula"
                    ? "Informe sua matrícula para continuar."
                    : step === "signup"
                      ? "Valide seu código e defina sua senha de acesso."
                      : "Confirme sua senha para entrar no ambiente."}
                </p>
              </div>
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:flex" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                <BadgeCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="mb-6 flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }} title={apiUnavailable ? "A API corporativa não passou no readiness" : undefined}>
              <span className="pulse-dot h-2.5 w-2.5 rounded-full" style={{ background: apiStatusColor }} />
              <span className="text-xs font-bold" style={{ color: "var(--text-3)" }}>{apiStatusLabel}</span>
              <span className="ml-auto text-[10px] font-black uppercase tracking-[.12em]" style={{ color: "var(--text-4)" }}>Ambiente protegido</span>
            </div>

            {step === "matricula" ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="segempat-matricula" className={labelClass} style={{ color: "var(--text-3)" }}>Matrícula</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2" style={{ color: "var(--text-4)" }} />
                    <input
                      id="segempat-matricula"
                      value={matricula}
                      onChange={(event) => setMatricula(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && handleCheckMatricula()}
                      placeholder="Informe sua matrícula"
                      autoComplete="username"
                      autoFocus
                      style={{ ...inputStyle, paddingLeft: "2.8rem" }}
                      onFocus={focusAccent}
                      onBlur={blurBorder}
                    />
                  </div>
                </div>

                <button onClick={handleCheckMatricula} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[.9rem] font-black transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60" style={primaryButtonStyle}>
                  Continuar <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3 rounded-2xl border p-3.5" style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }}>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white" style={{ background: "linear-gradient(135deg,#C8102E,#8f0c22)" }}>
                    {matricula.trim().charAt(0).toUpperCase() || "M"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black" style={{ color: "var(--text-1)" }}>Matrícula {matricula.trim()}</p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-4)" }}>EMPAT · Segurança Portuária</p>
                  </div>
                  <button type="button" onClick={resetMatricula} className="ml-auto rounded-lg px-2 py-1 text-xs font-bold transition-colors" style={{ color: "var(--accent)" }}>Alterar</button>
                </div>

                {step === "signup" && (
                  <div className="space-y-2">
                    <label htmlFor="segempat-activation" className={labelClass} style={{ color: "var(--text-3)" }}>Código de ativação</label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2" style={{ color: "var(--text-4)" }} />
                      <input
                        id="segempat-activation"
                        value={activationCode}
                        onChange={(event) => setActivationCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
                        inputMode="numeric"
                        maxLength={8}
                        autoComplete="one-time-code"
                        placeholder="8 dígitos"
                        style={{ ...inputStyle, paddingLeft: "2.8rem", letterSpacing: ".18em", fontWeight: 800 }}
                        onFocus={focusAccent}
                        onBlur={blurBorder}
                      />
                    </div>
                    <p className="text-[11px] leading-5" style={{ color: "var(--text-4)" }}>O código de primeiro acesso é fornecido pela Inspetoria.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="segempat-password" className={labelClass} style={{ color: "var(--text-3)" }}>{step === "signup" ? "Criar senha" : "Senha"}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2" style={{ color: "var(--text-4)" }} />
                    <input
                      id="segempat-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && (step === "signup" ? handleSignup() : handleLogin())}
                      placeholder={step === "signup" ? "Mínimo 8 caracteres" : "Digite sua senha"}
                      autoComplete={step === "signup" ? "new-password" : "current-password"}
                      autoFocus
                      style={{ ...inputStyle, paddingLeft: "2.8rem", paddingRight: "3.2rem" }}
                      onFocus={focusAccent}
                      onBlur={blurBorder}
                    />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-1" style={{ color: "var(--text-4)" }}>
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                {step === "signup" && (
                  <div className="space-y-2">
                    <label htmlFor="segempat-confirm-password" className={labelClass} style={{ color: "var(--text-3)" }}>Confirmar senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2" style={{ color: "var(--text-4)" }} />
                      <input
                        id="segempat-confirm-password"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && handleSignup()}
                        placeholder="Repita a senha"
                        autoComplete="new-password"
                        style={{ ...inputStyle, paddingLeft: "2.8rem" }}
                        onFocus={focusAccent}
                        onBlur={blurBorder}
                      />
                    </div>
                  </div>
                )}

                <button onClick={step === "signup" ? handleSignup : handleLogin} disabled={loading} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[.9rem] font-black transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60" style={primaryButtonStyle}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</> : <>{step === "signup" ? "Criar acesso" : "Entrar"}<ChevronRight className="h-4 w-4" /></>}
                </button>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={toggleSignup} className="rounded-xl border px-3 py-2.5 text-xs font-black transition-colors" style={{ borderColor: "var(--border)", color: "var(--accent)", background: "var(--bg-surface-2)" }}>
                    {step === "signup" ? "Já tenho senha" : "Primeiro acesso"}
                  </button>
                  <button type="button" onClick={resetMatricula} className="flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-black transition-colors" style={{ borderColor: "var(--border)", color: "var(--text-3)", background: "var(--bg-surface-2)" }}>
                    <ArrowLeft className="h-3.5 w-3.5" /> Outra matrícula
                  </button>
                </div>
              </div>
            )}

            {demoAllowed && step === "matricula" && (
              <div className="mt-7 border-t pt-6" style={{ borderColor: "var(--border)" }}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: "var(--text-4)" }}>Demonstração</span>
                  <span className="h-px flex-1" style={{ background: "var(--border)" }} />
                  <span className="rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[.12em]" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>Dados fictícios</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" disabled={demoLoading !== null} onClick={() => handleDemoLogin("inspector")} className="rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 disabled:opacity-60" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                    <p className="text-xs font-black" style={{ color: "var(--text-1)" }}>{demoLoading === "inspector" ? "Abrindo..." : "Inspetoria"}</p>
                    <p className="mt-1 text-[10px]" style={{ color: "var(--text-4)" }}>Visão administrativa</p>
                  </button>
                  <button type="button" disabled={demoLoading !== null} onClick={() => handleDemoLogin("operator")} className="rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 disabled:opacity-60" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                    <p className="text-xs font-black" style={{ color: "var(--text-1)" }}>{demoLoading === "operator" ? "Abrindo..." : "Operador"}</p>
                    <p className="mt-1 text-[10px]" style={{ color: "var(--text-4)" }}>Visão operacional</p>
                  </button>
                </div>
              </div>
            )}

            <div className="mt-7 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[.12em]" style={{ color: "var(--text-4)" }}>
              <ShieldCheck className="h-3.5 w-3.5" /> Acesso restrito a usuários autorizados
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
