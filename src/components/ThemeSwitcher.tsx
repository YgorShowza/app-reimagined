import { Sun, Moon, SlidersHorizontal } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const options = [
  { value: "light" as const, icon: Sun },
  { value: "dark" as const, icon: Moon },
  { value: "auto" as const, icon: SlidersHorizontal },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex items-center gap-0.5 rounded-xl p-1"
      style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
    >
      {options.map(({ value, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={value}
          aria-label={`Tema ${value}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
          style={{
            background: theme === value ? "var(--accent)" : "transparent",
            color: theme === value ? "#fff" : "var(--text-4)",
          }}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
