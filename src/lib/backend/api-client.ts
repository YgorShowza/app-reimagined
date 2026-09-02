import type { ApiErrorBody } from "./contracts";

function getApiBaseUrl() {
  const value = import.meta.env["VITE_SEGEMPAT_API_URL"];
  if (!value) return null;
  return value.replace(/\/$/, "");
}

export function isSegempatApiConfigured() {
  return Boolean(getApiBaseUrl());
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
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error("SEGEMPAT API ainda não configurada. Defina VITE_SEGEMPAT_API_URL.");
  }

  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
