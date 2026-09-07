import type { SessionUser } from "@/lib/backend/contracts";

const DEMO_SESSION_KEY = "segempat.demo.session";
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function envFlag(name: string) {
  const raw = import.meta.env[name];
  return typeof raw === "string" && TRUE_VALUES.has(raw.trim().toLowerCase());
}

function configuredApiUrl() {
  const raw = import.meta.env["VITE_SEGEMPAT_API_URL"];
  return typeof raw === "string" ? raw.trim() : "";
}

export const DEMO_USER: SessionUser = {
  id: "demo-inspector-001",
  matricula: "000001",
  nome: "Inspetor Demonstração",
  setor: "Segurança Portuária",
  isAdmin: true,
};

export function isDemoModeAllowed() {
  return !configuredApiUrl() && !envFlag("VITE_SEGEMPAT_REQUIRE_API");
}

export function isDemoModeEnabled() {
  if (!isDemoModeAllowed() || typeof window === "undefined") return false;
  return window.sessionStorage.getItem(DEMO_SESSION_KEY) === "1";
}

export function enableDemoMode() {
  if (!isDemoModeAllowed()) {
    throw new Error("Modo demonstração indisponível quando a API corporativa é obrigatória ou já está configurada.");
  }
  if (typeof window !== "undefined") window.sessionStorage.setItem(DEMO_SESSION_KEY, "1");
}

export function disableDemoMode() {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(DEMO_SESSION_KEY);
}
