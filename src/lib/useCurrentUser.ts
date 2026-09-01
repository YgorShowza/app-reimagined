import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CurrentUser {
  id: string;
  matricula: string;
  nome: string;
  setor: string | null;
  isAdmin: boolean;
}

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ["current-user"],
    staleTime: 60_000,
    queryFn: async () => {
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
        isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      };
    },
  });
}
