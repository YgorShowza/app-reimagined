import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CurrentUser {
  id: string;
  matricula: string;
  nome: string;
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
      return {
        id: user.id,
        matricula: profile?.matricula ?? "",
        nome: profile?.nome ?? "",
        isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      };
    },
  });
}
