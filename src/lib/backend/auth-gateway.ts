import { supabase } from "@/integrations/supabase/client";
import { matriculaToEmail, normalizeMatricula } from "@/lib/matricula";
import { apiRequest, isSegempatApiConfigured } from "./api-client";
import type { SessionUser } from "./contracts";

export async function loginWithMatricula(matricula: string, password: string): Promise<SessionUser> {
  if (isSegempatApiConfigured()) {
    return apiRequest<SessionUser>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ matricula: normalizeMatricula(matricula), password }),
    });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: matriculaToEmail(matricula),
    password,
  });
  if (error || !data.user) throw error ?? new Error("Falha ao autenticar");

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("matricula,nome").eq("id", data.user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", data.user.id),
  ]);
  return {
    id: data.user.id,
    matricula: profile?.matricula ?? normalizeMatricula(matricula),
    nome: profile?.nome ?? normalizeMatricula(matricula),
    setor: null,
    isAdmin: (roles ?? []).some((row) => row.role === "admin"),
  };
}

export async function activateWithCode(input: {
  matricula: string;
  activationCode: string;
  password: string;
}): Promise<SessionUser> {
  if (isSegempatApiConfigured()) {
    return apiRequest<SessionUser>("/api/auth/activate", {
      method: "POST",
      body: JSON.stringify({
        matricula: normalizeMatricula(input.matricula),
        activationCode: input.activationCode,
        password: input.password,
      }),
    });
  }

  const { data, error } = await supabase.auth.signUp({
    email: matriculaToEmail(input.matricula),
    password: input.password,
    options: {
      data: {
        matricula: normalizeMatricula(input.matricula),
        activation_code: input.activationCode,
      },
    },
  });
  if (error || !data.user) throw error ?? new Error("Falha ao criar acesso");
  return {
    id: data.user.id,
    matricula: normalizeMatricula(input.matricula),
    nome: normalizeMatricula(input.matricula),
    setor: null,
    isAdmin: false,
  };
}

export async function logoutSession() {
  if (isSegempatApiConfigured()) {
    await apiRequest<void>("/api/auth/logout", { method: "POST" });
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
