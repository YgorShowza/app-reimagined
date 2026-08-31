import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      // A sessão persistida pode existir no navegador mesmo quando o token já
      // não é mais válido no servidor. Limpá-la evita o ciclo
      // login -> dashboard -> login -> dashboard que derruba o preview.
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      throw redirect({ to: "/" });
    }

    return { user: data.user };
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});
