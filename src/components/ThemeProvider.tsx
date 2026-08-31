import * as React from "react";

// Build marker: forces Lovable to rebuild the application bundle after rollback.
type ThemeMode = "light" | "dark" | "auto";

const STORAGE_KEY = "empat_theme";

const ThemeContext = React.createContext<{
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}>({ theme: "light", setTheme: () => {} });

function resolve(mode: ThemeMode): "light" | "dark" {
  if (mode !== "auto") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeMode>("light");

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored === "light" || stored === "dark" || stored === "auto") setThemeState(stored);
  }, []);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolve(theme));
  }, [theme]);

  const setTheme = React.useCallback((t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
