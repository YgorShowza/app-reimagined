import type { ApiErrorBody } from "./contracts";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function envFlag(name: string) {
  const raw = import.meta.env[name];
  return typeof raw === "string" && TRUE_VALUES.has(raw.trim().toLowerCase());
}

function getApiBaseUrl() {
  const raw = import.meta.env["VITE_SEGEMPAT_API_URL"];
  const value = typeof raw === "string" ? raw.trim() : "";
  const apiRequired = envFlag("VITE_SEGEMPAT_REQUIRE_API");

  if (!value) {
    if (apiRequired) {
      throw new Error(
        "SEGEMPAT API é obrigatória neste ambiente. Defina VITE_SEGEMPAT_API_URL antes de publicar.",
      );
    }
    return null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("VITE_SEGEMPAT_API_URL deve ser uma URL HTTP(S) absoluta válida.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("VITE_SEGEMPAT_API_URL aceita somente HTTP ou HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("VITE_SEGEMPAT_API_URL não pode conter usuário ou senha.");
  }
  if (url.search || url.hash) {
    throw new Error("VITE_SEGEMPAT_API_URL não pode conter query string ou fragmento.");
  }
  if (import.meta.env.PROD && url.protocol !== "https:") {
    throw new Error("VITE_SEGEMPAT_API_URL deve usar HTTPS em build de produção.");
  }

  const pathname = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname === "/" ? "" : pathname}`;
}

export function isSegempatApiConfigured() {
  return Boolean(getApiBaseUrl());
}

export function buildSegempatApiUrl(path: string) {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error("SEGEMPAT API ainda não configurada. Defina VITE_SEGEMPAT_API_URL.");
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    return new Error(body.error || `Erro HTTP ${response.status}`);
  } catch {
    return new Error(`Erro HTTP ${response.status}`);
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(buildSegempatApiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
