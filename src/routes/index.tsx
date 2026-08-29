import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, User, Eye, EyeOff, ChevronRight } from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const LOGO_URL =
  "https://media.base44.com/images/public/6a1117d573bbf85981b1abee/8271ac857_IMG_9226.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SEGEMPAT — Gestão, Operações e Desempenho" },
      {
        name: "description",
        content:
          "Acesse o SEGEMPAT com sua matrícula: gestão de operações, treinamentos e desempenho das equipes do Porto de Maceió.",
      },
      { property: "og:title", content: "SEGEMPAT — Gestão, Operações e Desempenho" },
      {
        property: "og:description",
        content:
          "Plataforma de gestão de operações, treinamentos e desempenho das equipes do Porto de Maceió.",
      },
    ],
  }),
  component: AuthScreen,
});

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "48px",
  borderRadius: "0.75rem",
  border: "1.5px solid var(--border)",
  background: "var(--bg-surface-2)",
  color: "var(--text-1)",
  fontSize: "0.9375rem",
  padding: "0 1rem",
  outline: "none",
  transition: "border-color 0.15s",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8102E, #e0142f)",
  color: "#fff",
  boxShadow: "0 2px 12px rgba(200,16,46,0.45)",
};

const labelClass = "text-xs font-semibold uppercase tracking-wider";

function AuthScreen() {
  const [matricula, setMatricula] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"matricula" | "password">("matricula");

  const focusAccent = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "var(--accent)";
  };
  const blurBorder = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "var(--border)";
  };

  const handleCheckMatricula = () => {
    if (!matricula.trim()) {
      toast.error("Informe sua matrícula");
      return;
    }
    setStep("password");
  };

  const handleLogin = () => {
    if (!password) {
      toast.error("Informe sua senha");
      return;
    }
    toast.info("Autenticação ainda não conectada nesta versão.");
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="fixed right-4 top-4 z-50">
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div
              className="flex items-center justify-center overflow-hidden rounded-2xl"
              style={{ background: "#ffffff", padding: "14px 20px", boxShadow: "var(--shadow-md)" }}
            >
              <img
                src={LOGO_URL}
                alt="Logotipo EMPAT — Empresa Maceioense de Praticagem e Terminais"
                className="h-28 w-auto object-contain"
              />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: "var(--text-1)" }}>
            SEGEMPAT
          </h1>
          <p
            className="mt-1 text-sm font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-3)" }}
          >
            Gestão • Operações • Desempenho
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <span className="pulse-dot h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs font-semibold" style={{ color: "var(--text-4)" }}>
              Sistema online
            </span>
          </div>
        </div>

        {/* Card */}
        <div
          className="overflow-hidden rounded-2xl"
          style={{
            background: "var(--bg-surface)",
            border: "1.5px solid var(--border)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div className="h-1 w-full" style={{ background: "var(--accent)" }} />

          <div className="p-6">
            {step === "matricula" ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>
                    Bem-vindo
                  </h2>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--text-3)" }}>
                    Informe sua matrícula para continuar
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass} style={{ color: "var(--text-3)" }}>
                    Matrícula
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                      style={{ color: "var(--text-4)" }}
                    />
                    <input
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCheckMatricula()}
                      placeholder="Ex: 001"
                      style={{ ...inputStyle, paddingLeft: "2.5rem" }}
                      onFocus={focusAccent}
                      onBlur={blurBorder}
                    />
                  </div>
                </div>
                <button
                  onClick={handleCheckMatricula}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-95"
                  style={primaryButtonStyle}
                >
                  <span>Continuar</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div
                  className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    {matricula.trim().charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                      Matrícula {matricula.trim()}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-4)" }}>
                      Porto de Maceió · Operações
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass} style={{ color: "var(--text-3)" }}>
                    Senha
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                      style={{ color: "var(--text-4)" }}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      placeholder="Sua senha"
                      style={{ ...inputStyle, paddingLeft: "2.5rem", paddingRight: "3rem" }}
                      onFocus={focusAccent}
                      onBlur={blurBorder}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-4)" }}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleLogin}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-95"
                  style={primaryButtonStyle}
                >
                  <span>Entrar</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setStep("matricula");
                    setPassword("");
                  }}
                  className="w-full text-center text-sm transition-colors"
                  style={{ color: "var(--text-4)" }}
                >
                  ← Usar outra matrícula
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: "var(--text-4)" }}>
            Porto de Maceió · {new Date().getFullYear()}
          </p>
          <p className="mt-2 text-xs" style={{ color: "var(--text-3)" }}>
            Desenvolvido por{" "}
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>YGOR SOUZA</span>
          </p>
        </div>
      </div>
    </div>
  );
}
