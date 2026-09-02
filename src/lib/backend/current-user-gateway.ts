import { supabase } from "@/integrations/supabase/client";
import { apiRequest, isSegempatApiConfigured } from "./api-client";
import type { SessionUser } from "./contracts";

async function legacyCurrentUser(): Promise<SessionUser | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("matricula, nome").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  let setor: string | null = null;
  if (profile?.matricula) {
    const { data: employee } = await supabase
      .from("employees")
      .select("sector")
      .eq("matricula", profile.matricula)
      .maybeSingle();
    setor = employee?.sector ?? null;
  }

  return {
    id: user.id,
    matricula: profile?.matricula ?? "",
    nome: profile?.nome ?? "",
    setor,
    isAdmin: (roles ?? []).some((role) => role.role === "admin"),
  };
}

export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  if (isSegempatApiConfigured()) {
    try {
      return await apiRequest<SessionUser>("/api/auth/me");
    } catch (error) {
      if (error instanceof Error && /401|não autentic|unauthor/i.test(error.message)) return null;
      throw error;
    }
  }

  return legacyCurrentUser();
}
