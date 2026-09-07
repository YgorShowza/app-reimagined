import { normalizeMatricula } from "@/lib/matricula";
import { apiRequest } from "./api-client";
import type { SessionUser } from "./contracts";

export async function loginWithMatricula(matricula: string, password: string): Promise<SessionUser> {
  return apiRequest<SessionUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ matricula: normalizeMatricula(matricula), password }),
  });
}

export async function activateWithCode(input: {
  matricula: string;
  activationCode: string;
  password: string;
}): Promise<SessionUser> {
  return apiRequest<SessionUser>("/api/auth/activate", {
    method: "POST",
    body: JSON.stringify({
      matricula: normalizeMatricula(input.matricula),
      activationCode: input.activationCode,
      password: input.password,
    }),
  });
}

export async function logoutSession() {
  await apiRequest<void>("/api/auth/logout", { method: "POST" });
}
