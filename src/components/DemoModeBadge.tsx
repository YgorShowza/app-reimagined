import { FlaskConical, X } from "lucide-react";
import { disableDemoMode, isDemoModeEnabled } from "@/lib/demo-mode";

export function DemoModeBadge() {
  if (!isDemoModeEnabled()) return null;

  const exitDemo = () => {
    disableDemoMode();
    window.location.assign("/");
  };

  return (
    <div
      className="fixed right-3 top-[72px] z-[60] flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black shadow-lg md:right-5"
      style={{
        background: "#fff7ed",
        border: "1px solid #f59e0b",
        color: "#9a3412",
      }}
      title="Os dados desta sessão são fictícios e não são gravados no MySQL corporativo"
    >
      <FlaskConical className="h-4 w-4" />
      <span>MODO DEMONSTRAÇÃO · DADOS FICTÍCIOS</span>
      <button
        type="button"
        onClick={exitDemo}
        className="ml-1 flex h-5 w-5 items-center justify-center rounded-md"
        aria-label="Encerrar modo demonstração"
        title="Encerrar demonstração"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
