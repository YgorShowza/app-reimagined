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
      className="relative z-20 mb-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-center text-[10px] font-black shadow-md sm:w-auto sm:text-[11px] md:fixed md:right-5 md:top-[72px] md:mb-0 md:justify-start md:text-left md:shadow-lg"
      style={{
        background: "#fff7ed",
        border: "1px solid #f59e0b",
        color: "#9a3412",
      }}
      title="Os dados desta sessão são fictícios e não são gravados no MySQL corporativo"
    >
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span className="leading-4">MODO DEMONSTRAÇÃO · DADOS FICTÍCIOS</span>
      <button
        type="button"
        onClick={exitDemo}
        className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md md:ml-1 md:h-5 md:w-5"
        aria-label="Encerrar modo demonstração"
        title="Encerrar demonstração"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
